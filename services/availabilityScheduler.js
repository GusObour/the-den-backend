const AvailabilityController = require('../controllers/availabilityController');
const cron = require('node-cron');

const startScheduler = async () => {
    // Execute the task immediately upon startup
    try {
      await AvailabilityController.clearWeeklyAvailability();
      await AvailabilityController.addNewWeeklyAvailability();
      console.log('Initial weekly availability cleared and new availability added successfully.');
    } catch (error) {
      console.error('Failed to update weekly availability initially:', error);
    }
}

module.exports = startScheduler;