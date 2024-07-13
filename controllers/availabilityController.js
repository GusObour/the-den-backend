const Availability = require('../models/BarberAvailability');
const mongoose = require('mongoose');
const { Barber } = require('../models/User');
const moment = require('moment');
const { validationResult } = require("express-validator");

class AvailabilityController {
  constructor() {
    this.getAvailability = this.getAvailability.bind(this);
    this.getBarberAvailability = this.getBarberAvailability.bind(this);
    this.clearWeeklyAvailability = this.clearWeeklyAvailability.bind(this);
    this.addNewWeeklyAvailability = this.addNewWeeklyAvailability.bind(this);
    this.addAvailability = this.addAvailability.bind(this);
    this.blockDays = this.blockDays.bind(this);
    this.blockHours = this.blockHours.bind(this);
    this.addRecurringAvailability = this.addRecurringAvailability.bind(this);
    this.addDailyAvailability = this.addDailyAvailability.bind(this);
    this.addSingleAvailability = this.addSingleAvailability.bind(this);
    this.deleteAvailability = this.deleteAvailability.bind(this);
    this.updateAvailability = this.updateAvailability.bind(this);
    this.blockAvailabilities = this.blockAvailabilities.bind(this);
    this.unblockAvailabilities = this.unblockAvailabilities.bind(this);
    this.updateCache = this.updateCache.bind(this);
    this.updateCacheForAvailabilityIds = this.updateCacheForAvailabilityIds.bind(this);
  }

  async getAvailability(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    const { barberId, date, userId } = req.query;

    if (!barberId || !date) {
      return res.status(400).json({ message: 'Barber ID and date are required' });
    }

    try {
      const availability = await Availability.aggregate([
        {
          $match: {
            barber: new ObjectId(barberId),
            date: new Date(date),
            $or: [
              { blocked: { $exists: false } },
              { blocked: false }
            ]
          }
        },
        {
          $addFields: {
            isAvailable: {
              $and: [
                { $eq: ['$appointment', null] },
                {
                  $or: [
                    { $eq: ['$locked', false] },
                    { $eq: ['$lockedBy', new ObjectId(userId)] }
                  ]
                }
              ]
            }
          }
        },
        {
          $match: {
            isAvailable: true
          }
        }
      ]);

      res.json(availability);
    } catch (error) {
      console.error('Error fetching availability:', error);
      res.status(500).json({ message: 'Error fetching availability' });
    }
  }

  async getAvailableDates(req, res) {
    const { barberId } = req.query;

    if (!barberId) {
      return res.status(400).json({ message: 'Barber ID is required' });
    }

    try {
      const availableDates = await Availability.aggregate([
        { $match: { barber: new ObjectId(barberId) } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } } } },
        { $project: { _id: 0, date: "$_id" } },
        { $sort: { date: 1 } }
      ]);

      return res.json(availableDates.map(d => d.date));
    } catch (error) {
      console.error('Error fetching available dates:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  async getBarberAvailability(barberId, req, cacheExpiry = 600) {
    const redisClient = req.redisClient;
    const cacheKey = `barberAvailability:${barberId}`;

    try {
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return { success: true, availability: JSON.parse(cachedData) };
      }

      const availability = await Availability.find({
        barber: barberId,
        appointment: null,
        locked: false,
      }).populate('barber', '_id fullName');

      if (availability.length > 0) {
        await redisClient.set(cacheKey, JSON.stringify(availability), 'EX', cacheExpiry);
        return { success: true, availability };
      } else {
        return { success: false, message: 'No availability found' };
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      return { success: false, message: 'Error fetching availability' };
    }
  }

  async clearWeeklyAvailability(redisClient) {
    try {
      const now = new Date();
      const availabilitiesToDelete = await Availability.find({ end: { $lt: now } }, 'barber');
      const barberIds = availabilitiesToDelete.map(availability => availability.barber.toString());

      const result = await Availability.deleteMany({ end: { $lt: now } });
      console.log(`${result.deletedCount} past availabilities cleared.`);

      // Clear cache for barbers
      const uniqueBarberIds = [...new Set(barberIds)];
      for (const barberId of uniqueBarberIds) {
        const cacheKey = `barberAvailability:${barberId}`;
        await redisClient.del(cacheKey);
        console.log(`Cache cleared for barber ID: ${barberId}`);
      }
    } catch (error) {
      console.error('Failed to clear availability collection:', error);
      throw new Error('Failed to clear availability collection');
    }
  }

  async addNewWeeklyAvailability(redisClient) {
    try {
      const barbers = await Barber.find();
      const today = moment().utc();

      for (const barber of barbers) {
        for (let j = 0; j < 7; j++) {
          const thisDay = today.clone().add(j, 'days').startOf('day');

          for (let i = 9; i <= 16; i++) {
            let start = thisDay.clone().add(i, 'hours');
            let end = start.clone().add(1, 'hours');

            const availabilityToAdd = new Availability({
              barber: barber._id,
              date: thisDay.toDate(),
              start: start.toDate(),
              end: end.toDate()
            });

            await availabilityToAdd.save();
          }
        }

        // Clear cache for the barber
        const cacheKey = `barberAvailability:${barber._id}`;
        await redisClient.del(cacheKey);
        console.log(`Cache cleared for barber ID: ${barber._id}`);
      }

      console.log('Weekly availability added for all barbers.');
    } catch (error) {
      console.error('Failed to add new weekly availability:', error);
      throw new Error('Failed to add new weekly availability');
    }
  }

  async addAvailability(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { barberId, blockType, recurringType, startDate, endDate, start, end, interval } = req.body;

    try {
      if (blockType === 'block-days') {
        await this.blockDays(barberId, startDate, endDate);
      } else if (blockType === 'block-hours') {
        await this.blockHours(barberId, startDate, start, end);
      } else if (recurringType !== 'none') {
        await this.addRecurringAvailability(barberId, recurringType, startDate, endDate, start, end, interval);
      } else {
        await this.addSingleAvailability(barberId, startDate, start, end);
      }
      await this.updateCache(barberId, req);
      res.status(201).json({ message: 'Availability added successfully' });
    } catch (error) {
      console.error('Error adding availability:', error);
      res.status(500).json({ message: 'Error adding availability' });
    }
  }

  async blockDays(barberId, startDate, endDate) {
    const start = moment(startDate).startOf('day');
    const end = moment(endDate).endOf('day');

    for (let day = start; day.isSameOrBefore(end); day.add(1, 'days')) {
      const availability = await Availability.find({ barber: barberId, date: day.toDate() });
      availability.forEach(async slot => {
        slot.blocked = true;
        await slot.save();
      });
    }
  }

  async blockHours(barberId, startDate, start, end) {
    const startMoment = moment(startDate).set({
      hour: moment(start, 'HH:mm').hour(),
      minute: moment(start, 'HH:mm').minute()
    });
    const endMoment = moment(startDate).set({
      hour: moment(end, 'HH:mm').hour(),
      minute: moment(end, 'HH:mm').minute()
    });

    const availability = await Availability.find({
      barber: barberId,
      date: startMoment.startOf('day').toDate(),
      start: { $gte: startMoment.toDate() },
      end: { $lte: endMoment.toDate() }
    });

    availability.forEach(async slot => {
      slot.blocked = true;
      await slot.save();
    });
  }

  async addRecurringAvailability(barberId, recurringType, startDate, endDate, start, end, interval) {
    const startMoment = moment(startDate).startOf('day').set({
      hour: moment(start, 'HH:mm').hour(),
      minute: moment(start, 'HH:mm').minute()
    });
    const endMoment = moment(endDate).endOf('day').set({
      hour: moment(end, 'HH:mm').minute()
    });
    const intervalHours = parseInt(interval, 10);

    if (recurringType === 'daily') {
      for (let day = startMoment.clone(); day.isSameOrBefore(endMoment, 'day'); day.add(1, 'days')) {
        await this.addDailyAvailability(barberId, day, intervalHours);
      }
    } else if (recurringType === 'weekly') {
      for (let week = startMoment.clone(); week.isSameOrBefore(endMoment, 'week'); week.add(1, 'weeks')) {
        for (let day = 0; day < 7; day++) {
          await this.addDailyAvailability(barberId, week.clone().add(day, 'days'), intervalHours);
        }
      }
    }
  }

  async addDailyAvailability(barberId, day, intervalHours) {
    const startTime = moment(day).startOf('day').set({ hour: 9 });
    const endTime = moment(day).startOf('day').set({ hour: 16 });

    for (let time = startTime.clone(); time.isBefore(endTime); time.add(intervalHours, 'hours')) {
      const availability = new Availability({
        barber: barberId,
        date: day.toDate(),
        start: time.toDate(),
        end: time.clone().add(intervalHours, 'hours').toDate()
      });
      await availability.save();
    }
  }

  async addSingleAvailability(barberId, startDate, start, end) {
    const startMoment = moment(startDate).set({
      hour: moment(start, 'HH:mm').hour(),
      minute: moment(start, 'HH:mm').minute()
    });
    const endMoment = moment(startDate).set({
      hour: moment(end, 'HH:mm').hour(),
      minute: moment(end, 'HH:mm').minute()
    });

    const availability = new Availability({
      barber: barberId,
      date: startMoment.toDate(),
      start: startMoment.toDate(),
      end: endMoment.toDate()
    });
    await availability.save();
  }

  async deleteAvailability(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: 'Availability ID is required' });

    try {
      const availability = await Availability.findById(id);

      if (!availability) {
        return res.status(404).json({ message: 'Availability not found' });
      }

      if (availability.locked) {
        return res.status(400).json({ message: 'Availability is locked by a client and cannot be deleted' });
      }

      await Availability.findByIdAndDelete(id);
      await this.updateCache(availability.barber, req);

      res.status(200).json({ message: 'Availability deleted successfully' });
    } catch (error) {
      console.error('Error deleting availability:', error);
      res.status(500).json({ message: 'Error deleting availability' });
    }
  }

  async updateAvailability(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { date, start, end } = req.body;

    if (!id) return res.status(400).json({ message: 'Availability ID is required' });

    try {
      // Find the existing availability
      const availability = await Availability.findById(id);

      if (!availability) {
        return res.status(404).json({ message: 'Availability not found' });
      }

      if (availability.locked) {
        return res.status(400).json({ message: 'Availability is locked by a client and cannot be updated' });
      }

      // Update the availability with the new fields
      availability.date = moment(date).toISOString();
      availability.start = moment(start).toISOString();
      availability.end = moment(end).toISOString();

      await availability.save();
      await this.updateCache(availability.barber, req);

      res.status(200).json(availability);
    } catch (error) {
      console.error('Error updating availability:', error);
      res.status(500).json({ message: 'Error updating availability' });
    }
  }

  async blockAvailabilities(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    const { availabilityIds } = req.body;
    if (!availabilityIds || availabilityIds.length === 0) {
      console.log('Missing availability IDs');
      return res.status(400).json({ message: 'Availability IDs are required' });
    }

    try {
      // Find locked availabilities
      const lockedAvailabilities = await Availability.find({
        _id: { $in: availabilityIds },
        locked: true
      });

      if (lockedAvailabilities.length > 0) {
        return res.status(400).json({ message: 'Some selected availabilities are locked by clients and cannot be blocked.' });
      }

      const result = await Availability.updateMany(
        { _id: { $in: availabilityIds }, locked: false },
        { $set: { blocked: true, locked: true } }
      );

      await this.updateCacheForAvailabilityIds(availabilityIds, req);

      res.status(200).json({ message: 'Availabilities blocked successfully', result });
    } catch (error) {
      console.error('Error blocking availabilities:', error);
      res.status(500).json({ message: 'Error blocking availabilities' });
    }
  }

  async unblockAvailabilities(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { availabilityIds } = req.body;
    if (!availabilityIds || availabilityIds.length === 0) {
      console.log('Missing availability IDs');
      return res.status(400).json({ message: 'Availability IDs are required' });
    }

    try {
      // Find already unblocked availabilities
      const alreadyUnblocked = await Availability.find({
        _id: { $in: availabilityIds },
        blocked: false
      });

      if (alreadyUnblocked.length > 0) {
        return res.status(400).json({ message: 'Some selected availabilities are already unblocked.' });
      }

      const result = await Availability.updateMany(
        { _id: { $in: availabilityIds }, locked: false },
        { $set: { blocked: false, locked: false, lockedBy: null, lockExpiration: null } }
      );

      await this.updateCacheForAvailabilityIds(availabilityIds, req);

      res.status(200).json({ message: 'Availabilities unblocked successfully', result });
    } catch (error) {
      console.error('Error unlocking availabilities:', error);
      res.status(500).json({ message: 'Error unlocking availabilities' });
    }
  }

  async updateCache(barberId, req) {
    const redisClient = req.redisClient;
    const cacheKey = `barberAvailability:${barberId}`;

    try {
      await redisClient.del(cacheKey);
    } catch (error) {
      console.error('Error updating cache for barber availabilities:', error);
    }
  }

  async updateCacheForAvailabilityIds(availabilityIds, req) {
    const redisClient = req.redisClient;
    const barberIds = await Availability.distinct('barber', { _id: { $in: availabilityIds } });

    try {
      for (const barberId of barberIds) {
        const cacheKey = `barberAvailability:${barberId}`;
        await redisClient.del(cacheKey);
      }
    } catch (error) {
      console.error('Error updating cache for barber availabilities:', error);
    }
  }
}

module.exports = new AvailabilityController();
