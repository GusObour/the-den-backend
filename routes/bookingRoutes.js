// const express = require('express');
// const bookingController  = require('../controllers/bookingController');
// const InvoiceService = require('../services/InvoiceService');
// const router = express.Router();
// const cron = require('node-cron');

// // router.post('/appointment', bookingController.createAppointment);

// // cron.schedule('*/5 * * * *', () => {
// //     bookingController.unlockExpiredSlots();
// // });

// // // Schedule job to run every 5 minutes to update expired appointments
// // cron.schedule('*/5 * * * *', () => {
// //     console.log('Updating expired appointments...');
// //     bookingController.updateExpiredAppointments();
// // });

// // // Schedule job to run every Sunday at midnight
// // cron.schedule('0 0 * * 0', async () => {
// //     console.log('Generating and sending weekly invoices...');
// //     const barbers = await User.find({ role: 'Barber' });
// //     for (const barber of barbers) {
// //         await InvoiceService.generateInvoice(barber._id);
// //     }
// // });


// module.exports = router;
