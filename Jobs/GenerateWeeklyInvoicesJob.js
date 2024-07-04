// jobs/GenerateWeeklyInvoicesJob.js
const Job = require('./Job');
const InvoiceService = require('../services/InvoiceService');
const User = require('../models/User');

class GenerateWeeklyInvoicesJob extends Job {
    async execute() {
        const barbers = await User.find({ role: 'Barber' });
        for (const barber of barbers) {
            await InvoiceService.generateInvoice(barber._id);
        }
    }
}

module.exports = GenerateWeeklyInvoicesJob;
