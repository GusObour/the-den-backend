const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const BarberAvailability = require("../models/BarberAvailability");
const redisClientInstance = require("../services/RedisClientService");
const TwilioService = require("../services/TwilioService");
const GoogleCalendarService = require("../services/GoogleCalendarService");
const { User, Barber } = require("../models/User");
const Service = require("../models/Service");
const moment = require("moment");

class BookingController {
  constructor() {}
  async createAppointment(req, res) {
    const redisClient = req.redisClient;
    const { date, start, end, barberId, userId, serviceId } = req.body;

    const MAX_RETRIES = 3; // Maximum number of retries to book an appointment
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const availability = await BarberAvailability.findOne({
          barber: barberId,
          date: new Date(date),
          start: new Date(start),
          end: new Date(end),
          appointment: null,
          locked: true,
          lockedBy: userId,
          lockExpiration: { $gte: new Date() },
        });

        if (!availability) {
          await session.abortTransaction();
          return res
            .status(400)
            .json({ message: "Appointment slot is no longer available" });
        }

        const appointment = new Appointment({
          user: userId,
          barber: barberId,
          service: serviceId,
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

        await session.commitTransaction();
        return res.status(201).json({
          success: true,
          message: "Appointment booked successfully",
          appointment,
        });
      } catch (error) {
        if (error.code === 112 && attempt < MAX_RETRIES - 1) {
          console.warn(
            `Write conflict detected, retrying operation (attempt ${
              attempt + 1
            })...`
          );
          await session.abortTransaction();
          continue;
        } else {
          console.error("Error creating appointment:", error);
          await session.abortTransaction();
          return res
            .status(500)
            .json({ message: "Error creating appointment" });
        }
      } finally {
        session.endSession();
      }
    }

    return res.status(500).json({
      message:
        "Failed to create appointment after multiple attempts. Please try again later.",
    });
  }

  async unlockExpiredSlots() {
    const now = new Date();
    const results = await BarberAvailability.updateMany(
      { locked: true, lockExpiration: { $lt: now } },
      { $set: { locked: false, lockExpiration: null, lockedBy: null } }
    );

    console.log(`unlocked ${results.nModified} expired slots`);
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
  async getBarberAppointments(barberId, req, cacheExpiry = 3600) {
    const redisClient = req.redisClient;
    const cacheKey = `barberAppointments:${barberId}`;

    try {
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return { appointments: JSON.parse(cachedData), success: true };
      }

      const appointments = await Appointment.find({ barber: barberId })
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


  async  getUserAppointments(userId, req, cacheExpiry = 3600) {
    const redisClient = req.redisClient;
    const cacheKey = `userAppointments:${userId}`;
  
    try {
      const cachedData = await redisClient.get(cacheKey);
  
      if (cachedData) {
        return { appointments: JSON.parse(cachedData), success: true };
      }
  
      const appointments = await Appointment.find({ user: userId })
        .populate("barber")
        .populate("service")
        .populate("barberAvailability");
  
      const returnedAppointments = appointments.map(appointment => {
        const basicInfo = this.constructBasicAppointmentInfo(appointment);
        return appointment.barberAvailability
          ? this.addAppointmentAvailabilityDetails(basicInfo, appointment.barberAvailability)
          : basicInfo;
      });
  
      await redisClient.set(cacheKey, JSON.stringify(returnedAppointments), 'EX', cacheExpiry); // Cache for 1 hour
  
      return { appointments: returnedAppointments, success: true };
    } catch (error) {
      console.error("Error fetching appointments:", error);
      return { success: false, message: "Error fetching appointments" };
    }
  }
  




  async updateExpiredAppointments() {
    const now = new Date();

    try {
      const barberAvailabilities = await BarberAvailability.find(
        { end: { $lt: now } },
        "_id"
      );
      const availabilityIds = barberAvailabilities.map(
        (availability) => availability._id
      );
      const results = await Appointment.updateMany(
        { status: "Booked", barberAvailability: { $in: availabilityIds } },
        { $set: { status: "Completed" } }
      );

      console.log(`Updated ${results.nModified} expired appointments`);
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
  
      appointment.status = "Completed";
      await appointment.save({ session });
  
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
        await appointment.remove({ session });
        barberAvailability.appointment = null;
        barberAvailability.lockedBy = null;
        await barberAvailability.save({ session });
      }

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
