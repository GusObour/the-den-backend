const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');
const Appointment = require('../models/Appointment');
const emailService = require('./EmailService');
const { User, Barber } = require('../models/User');
const Service = require('../models/Service');
const BarberAvailability = require('../models/BarberAvailability');

class InvoiceService {
    async generateInvoice(barberId) {
        try {
            const InvoicedBarber = await User.findById(barberId);
            const appointments = await Appointment.find({
                barber: barberId,
                status: { $in: ['Completed', 'Canceled', 'Booked'] },
                invoiceGenerated: { $ne: true }
            })
                .populate('user')
                .populate('service')
                .populate('barberAvailability')
                .populate('barber');

            if (appointments.length === 0) {
                return { success: false, message: 'No appointments to invoice' };
            }

            const amount = this.calculateInvoiceAmount(appointments);

            let invoiceAppointments = appointments.map(appointment => {
                return {
                    user: appointment.user.fullName,
                    service: appointment.service.name,
                    date: appointment.barberAvailability.date,
                    start: appointment.barberAvailability.start,
                    end: appointment.barberAvailability.end,
                };
            })

            let invoiceAppointmentsIds = appointments.map(appointment => appointment._id);

            const invoice = new Invoice({
                barber: InvoicedBarber._id,
                appointments: invoiceAppointmentsIds,
                amount: amount
            });

            const invoiceFilePath = await this.createInvoicePDF(InvoicedBarber.fullName, invoice, invoiceAppointments);

            invoice.invoiceFilePath = invoiceFilePath;
            await invoice.save();


            // Send the invoice to the barber
            await emailService.sendInvoiceEmail(InvoicedBarber.email, invoiceFilePath);

            return { success: true, invoice };
        } catch (error) {
            console.error('Error generating invoice:', error);
            return { success: false, message: 'Error generating invoice' };
        }
    }

    async createInvoicePDF(barber, invoice, appointments) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const invoiceFilePath = path.join(__dirname, `../invoices/invoice_${invoice._id}.pdf`);
            const writeStream = fs.createWriteStream(invoiceFilePath);
    
            doc.pipe(writeStream);
    
            // Set up the colors
            const colors = {
                black: '#030509',
                blue: '#375C95',
                'lightblue': '#71A2DF',
                'darkgray': '#4A5C75',
                'lightgray': '#AACFF6',
                'black2': '#010201',
                'black3': '#000001',
                'uranianblue': '#afd1f4',
            };
    
            // Add the logo
            // const logoPath = path.join(__dirname, '../uploads/TheDen.jpeg');
            // doc.image(logoPath, {
            //     fit: [100, 100],
            //     align: 'center',
            //     valign: 'center'
            // });
    
            doc.moveDown();
            doc.fontSize(25).fillColor(colors.blue).text('Invoice', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).fillColor(colors.black).text(`Barber: ${barber}`, { align: 'left' });
            doc.text(`Date: ${new Date().toLocaleDateString('en-US', { timeZone: 'UTC' })}`, { align: 'left' });
            doc.moveDown();
            doc.fontSize(14).fillColor(colors.darkgray).text('Appointments:', { align: 'left' });
    
            console.log('Generating PDF for appointments:', appointments);
    
            appointments.forEach(appointment => {
                console.log('Adding appointment to PDF:', appointment);
                doc.moveDown();
                doc.fontSize(12).fillColor(colors.black);
                doc.text(`Client Name: ${appointment.user}`, { align: 'left' });
                doc.text(`Service: ${appointment.service}`, { align: 'left' });
                doc.text(`Date: ${new Date(appointment.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}`, { align: 'left' });
                doc.text(`Start Time: ${new Date(appointment.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: true })}`, { align: 'left' });
                doc.text(`End Time: ${new Date(appointment.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: true })}`, { align: 'left' });
            });
    
            doc.moveDown();
            doc.fontSize(16).fillColor(colors.blue).text(`Total Amount: $${invoice.amount}`, { align: 'left' });
            doc.end();
    
            writeStream.on('finish', () => resolve(invoiceFilePath));
            writeStream.on('error', reject);
        });
    }

    calculateInvoiceAmount(appointments) {
        let totalAmount = 0;
        appointments.forEach(appointment => {
            const servicePrice = appointment.service.price;
            const fee = servicePrice * 0.15;
            totalAmount += fee;
        });
        return totalAmount;
    }
}

module.exports = new InvoiceService();
