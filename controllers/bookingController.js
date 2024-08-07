const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Appointment = require("../models/Appointment");
const BarberAvailability = require("../models/BarberAvailability");
const redisClientInstance = require("../services/RedisClientService");
const TwilioService = require("../services/TwilioService");
const EmailService = require('../services/EmailService');
const GoogleCalendarService = require('../services/GoogleCalendarService');
const { User, Barber } = require("../models/User");
const Service = require("../models/Service");
const moment = require("moment");
const moment_TimeZone = require('moment-timezone');
const { formatDateTime } = require('../utils/dateFormatter');

class BookingController {
  async createAppointment(req) {
    const redisClient = req.redisClient;
    const { userId, barberId, serviceId, date, start, end, } = req.body.appointmentData;
    const session = await mongoose.startSession();

    const MAX_RETRIES = 5

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        session.startTransaction();

        const availability = await BarberAvailability.findOne({
          barber: new ObjectId(barberId),
          date: new Date(date),
          start: new Date(start),
          end: new Date(end),
          appointment: null,
          locked: true,
          lockedBy: new ObjectId(userId),
          lockExpiration: { $gte: new Date() },
        }).session(session);

        if (!availability) {
          await session.abortTransaction();
          return ({ message: "Appointment slot is no longer available" });
        }

        const appointment = new Appointment({
          user: new ObjectId(userId),
          barber: new ObjectId(barberId),
          service: new ObjectId(serviceId),
          status: "Booked",
          barberAvailability: availability._id,
        });

        await appointment.save({ session });

        availability.appointment = appointment._id;
        availability.locked = false;
        availability.lockedBy = null;
        availability.lockExpiration = null;
        await availability.save({ session });

        // Invalidate the cache for barber and user appointments
        try {
          await redisClient.del(`barberAppointments:${barberId}`);
          await redisClient.del(`userAppointments:${userId}`);
        } catch (cacheError) {
          console.error("Error invalidating cache:", cacheError);
        }

        // Fetch barber, user, and service details
        const [barber, user, service] = await Promise.all([
          Barber.findById(barberId).session(session),
          User.findById(userId).session(session),
          Service.findById(serviceId).session(session)
        ]);

        const startTime = formatDateTime(start, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: true });
        const endTime = formatDateTime(end, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: true });

        const newDate = formatDateTime(date, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC', hour12: true });

        // Use Google Calendar Service
        // GoogleCalendarService.setCredentials(tokens);
        // const event = await GoogleCalendarService.createEvent({
        //   summary: `Appointment for ${user.fullName} with ${barber.fullName}`,
        //   description: `Service: ${service.name}\nDetails about the appointment: ${service.description}`,
        //   start: start,
        //   end: end,
        //   attendees: [barber.email, user.email],
        // });

        const serviceDetails = {
          name: service.name,
          description: service.description,
        };

        // Include the calendar link in the email
        const appointmentDetails = {
          newDate,
          startTime,
          endTime,
          barber: barber.fullName,
          user: user.fullName,
          service: serviceDetails,
          // calendarLink: event.data.htmlLink,
        };

        // Send booking confirmation email to the barber and client
        await EmailService.sendBookingEmail(barber.email, user.email, appointmentDetails);


        // send SMS to the client 
        const message = `The Den: Your appointment with ${barber.fullName} for ${service.name} is confirmed on ${newDate} from ${startTime} to ${endTime}.`;
        await TwilioService.sendSMS(user.phoneNumber, message);


        await session.commitTransaction();
        return ({
          success: true,
          message: "Appointment booked successfully",
        });
      } catch (error) {
        if (error.code === 112 && attempt < MAX_RETRIES - 1) {
          console.warn(
            `Write conflict detected, retrying operation (attempt ${attempt + 1
            })...`
          );
          await session.abortTransaction();
          await new Promise(resolve => setTimeout(resolve, 100)); // Shorter retry interval
        } else {
          console.error("Error creating appointment:", error);
          await session.abortTransaction();
          return ({ message: "Error creating appointment" });
        }
      } finally {
        session.endSession();
      }
    }

    return ({
      message:
        "Failed to create appointment after multiple attempts. Please try again later.",
    });
  }

  async unlockExpiredSlots(redisClient) {
    const now = new Date();

    // Fetch barber IDs associated with the expired slots
    const expiredSlots = await BarberAvailability.find(
      { locked: true, lockExpiration: { $lt: now } },
      'barber'
    );

    const barberIds = expiredSlots.map(slot => slot.barber.toString());

    // Update the expired slots
    const results = await BarberAvailability.updateMany(
      { locked: true, lockExpiration: { $lt: now } },
      { $set: { locked: false, lockExpiration: null, lockedBy: null } }
    );

    console.log(`unlocked ${results.modifiedCount} expired slots`);

    // Delete caches for the relevant barbers
    const uniqueBarberIds = [...new Set(barberIds)];

    for (const barberId of uniqueBarberIds) {
      const cacheKey = `barberAvailability:${barberId}`;
      await redisClient.del(cacheKey);
      console.log(`Cache cleared for barber ID: ${barberId}`);
    }
  }


  // Constructs the basic appointment information
  constructBasicAppointmentInfo(appointment) {
    return {
      _id: appointment._id,
      user: {
        _id: appointment.user._id,
        fullName: appointment.user.fullName,
      },
      barber: {
        _id: appointment.barber._id,
        fullName: appointment.barber.fullName,
      },
      service: appointment.service.name,
      status: appointment.status,
    };
  }

  // Adds availability details to the basic appointment information
  addAppointmentAvailabilityDetails(basicInfo, availability) {
    return {
      ...basicInfo,
      date: availability.date,
      start: availability.start,
      end: availability.end,
    };
  }

  // Retrieves barber appointments, utilizing caching for performance
  async getBarberAppointments(barberId, req, cacheExpiry = 600) {
    const redisClient = req.redisClient;
    const cacheKey = `barberAppointments:${barberId}`;

    try {
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return { appointments: JSON.parse(cachedData), success: true };
      }

      const appointments = await Appointment.find({ barber: barberId, status: { $nin: ["Completed", "Cancelled"] } })
        .populate("user")
        .populate("service")
        .populate("barberAvailability")
        .populate("barber");

      const returnedAppointments = appointments.map((appointment) => {
        const basicInfo = this.constructBasicAppointmentInfo(appointment);
        return appointment.barberAvailability
          ? this.addAppointmentAvailabilityDetails(
            basicInfo,
            appointment.barberAvailability
          )
          : basicInfo;
      });

      await redisClient.set(
        cacheKey,
        JSON.stringify(returnedAppointments),
        "EX",
        cacheExpiry
      ); // Cache with expiry

      return { appointments: returnedAppointments, success: true };
    } catch (error) {
      console.error(
        `Error fetching appointments for barberId ${barberId}:`,
        error
      );
      return {
        success: false,
        message: `Error fetching appointments for barberId ${barberId}`,
      };
    }
  }


  async getUserAppointments(userId, req, cacheExpiry = 600) {
    const redisClient = req.redisClient;
    const cacheKey = `userAppointments:${userId}`;

    try {
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return { appointments: JSON.parse(cachedData), success: true };
      }

      const appointments = await Appointment.find({ user: userId, status: { $nin: ["Completed", "Cancelled"] } })
        .populate("barber")
        .populate("service")
        .populate("barberAvailability");

      const returnedAppointments = appointments.map(appointment => {
        const basicInfo = this.constructBasicAppointmentInfo(appointment);
        return appointment.barberAvailability
          ? this.addAppointmentAvailabilityDetails(basicInfo, appointment.barberAvailability)
          : basicInfo;
      });

      await redisClient.set(cacheKey, JSON.stringify(returnedAppointments), 'EX', cacheExpiry);

      return { appointments: returnedAppointments, success: true };
    } catch (error) {
      console.error("Error fetching appointments:", error);
      return { success: false, message: "Error fetching appointments" };
    }
  }

  async updateExpiredAppointments(redisClient) {
    const now = new Date();

    try {
      // Fetch expired barber availabilities
      const expiredAvailabilityIds = (await BarberAvailability.find({ end: { $lt: now } }, "_id")).map(availability => availability._id);

      // Fetch appointments with expired barber availabilities and populate necessary fields
      const appointments = await Appointment.find({
        status: "Booked",
        barberAvailability: { $in: expiredAvailabilityIds }
      }).populate("barberAvailability", "barber").populate("user", "_id");

      const appointmentIds = appointments.map(appointment => appointment._id);
      const barberIds = [...new Set(appointments.map(appointment => appointment.barberAvailability.barber.toString()))];
      const userIds = [...new Set(appointments.map(appointment => appointment.user._id.toString()))];

      // Update expired appointments
      const results = await Appointment.updateMany(
        { _id: { $in: appointmentIds } },
        { $set: { status: "Completed" } }
      );

      console.log(`Updated ${results.modifiedCount} expired appointments`);

      // Delete related Redis keys in parallel
      await Promise.all([
        ...barberIds.map(barberId => redisClient.del(`barberAvailability:${barberId}`)),
        ...barberIds.map(barberId => redisClient.del(`barberAppointments:${barberId}`)),
        ...userIds.map(userId => redisClient.del(`userAppointments:${userId}`))
      ]);

    } catch (error) {
      console.error("Error updating expired appointments:", error);
    }
  }



  async completeAppointment(appointmentId, userId, req) {
    const redisClient = req.redisClient;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate("user")
        .populate("barber")
        .populate("service")
        .populate("barberAvailability")
        .session(session);

      if (!appointment) {
        await session.abortTransaction();
        return { success: false, message: "Appointment not found" };
      }

      if (appointment.status !== "Booked") {
        await session.abortTransaction();
        return { success: false, message: "Appointment is not booked" };
      }

      if (appointment.barber._id.toString() !== userId) {
        await session.abortTransaction();
        return { success: false, message: "Unauthorized to complete appointment" };
      }


      const startTime = formatDateTime(appointment.barberAvailability.start, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: true });
      const endTime = formatDateTime(appointment.barberAvailability.end, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: true });

      const newDate = formatDateTime(appointment.barberAvailability.date, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC', hour12: true });

      appointment.status = "Completed";
      await appointment.save({ session });

      const serviceDetails = {
        name: appointment.service.name,
        description: appointment.service.description,
      };

      const appointmentDetails = {
        newDate,
        startTime,
        endTime,
        barber: appointment.barber.fullName,
        user: appointment.user.fullName,
        service: serviceDetails,
      };


      // Send booking confirmation email to the barber and client
      await EmailService.sendCompletionEmail(appointment.barber.email, appointment.user.email, appointmentDetails);


      // send SMS to the client 
      const message = `The Den: Thank you ${appointment.user.fullName} for visiting us. Your appointment with ${appointment.barber.fullName} for ${appointment.service.name} on ${newDate} from ${startTime} to ${endTime} has been completed.`;
      await TwilioService.sendSMS(appointment.user.phoneNumber, message);

      await redisClient.del(`barberAppointments:${userId}`);
      await redisClient.del(`userAppointments:${appointment.user._id}`);

      await session.commitTransaction();

      // TO-DO: Notify user about the completion

      return { success: true, message: "Appointment completed successfully" };
    } catch (error) {
      await session.abortTransaction();
      console.error("Error completing appointment:", error);
      return { success: false, message: "Error completing appointment", error: error.message };
    } finally {
      session.endSession();
    }
  }


  async cancelAppointment(appointmentId, userId, req) {
    const redisClient = req.redisClient;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate("user")
        .populate("barber")
        .populate("service")
        .populate("barberAvailability")
        .session(session);

      if (!appointment) {
        await session.abortTransaction();
        return { success: false, message: "Appointment not found" };
      }

      const barberAvailability = await BarberAvailability.findById(
        appointment.barberAvailability._id
      ).session(session);
      if (!barberAvailability) {
        await session.abortTransaction();
        return { success: false, message: "Barber availability not found" };
      }

      const appointmentStartTime = moment(appointment.barberAvailability.start);
      const currentTime = moment();
      const timeDifference = appointmentStartTime.diff(currentTime, "hours");

      if (timeDifference < 12) {
        appointment.status = "Cancelled";
        await appointment.save({ session });
      } else {
        await appointment.deleteOne({ session });
        barberAvailability.appointment = null;
        barberAvailability.lockedBy = null;
        await barberAvailability.save({ session });
      }


      const startTime = formatDateTime(appointment.barberAvailability.start, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: true });
      const endTime = formatDateTime(appointment.barberAvailability.end, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: true });

      const newDate = formatDateTime(appointment.barberAvailability.date, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC', hour12: true });

      const serviceDetails = {
        name: appointment.service.name,
        description: appointment.service.description,
      };

      const appointmentDetails = {
        newDate,
        startTime,
        endTime,
        barber: appointment.barber.fullName,
        user: appointment.user.fullName,
        service: serviceDetails,
      };


      // Send booking confirmation email to the barber and client
      await EmailService.sendCancellationEmail(appointment.barber.email, appointment.user.email, appointmentDetails);


      // send SMS to the client 
      const message = `The Den: Your appointment with ${appointment.barber.fullName} for ${appointment.service.name} on ${newDate} from ${startTime} to ${endTime} has been canceled.`;
      await TwilioService.sendSMS(appointment.user.phoneNumber, message);


      await redisClient.del(`barberAppointments:${appointment.barber._id}`);
      await redisClient.del(`userAppointments:${appointment.user._id}`);

      await session.commitTransaction();

      // TO-DO: Notify user about the cancellation
      // TO-DO: Notify all users about the potential open slot if timeDifference < 12

      return { success: true, message: "Appointment canceled successfully" };
    } catch (error) {
      await session.abortTransaction();
      console.error("Error canceling appointment:", error);
      return { success: false, message: "Error canceling appointment" };
    } finally {
      session.endSession();
    }
  }
}

module.exports = new BookingController();
