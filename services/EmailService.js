const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    async sendInvoiceEmail(barberEmail, invoiceFilePath) {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: barberEmail,
            subject: 'Your Weekly Invoice',
            text: 'Please find attached your weekly invoice.',
            attachments: [
                {
                    filename: path.basename(invoiceFilePath),
                    path: invoiceFilePath
                }
            ]
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('Invoice email sent to:', barberEmail);
        } catch (error) {
            console.error('Error sending invoice email:', error);
        }
    }

    async sendBookingEmail(barberEmail, userEmail, appointmentDetails) {
        const { date, start, end, barber, user, serviceDetails, calendarLink } = appointmentDetails;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: [barberEmail, userEmail],
            subject: 'Appointment Booking Confirmation',
            text: `
            Your appointment is confirmed.
            
            Details:
            Date: ${date}
            Start: ${start}
            End: ${end}
            Barber: ${barber}
            User: ${user}
            Service: ${serviceDetails.name} - ${serviceDetails.description}

            You can view this event on your calendar: ${calendarLink}
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('Booking confirmation email sent to:', barberEmail, userEmail);
        } catch (error) {
            console.error('Error sending booking confirmation email:', error);
        }
    }

    async sendCancellationEmail(barberEmail, userEmail, appointmentDetails) {
        const { date, start, end, barber, user, serviceDetails } = appointmentDetails;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: [barberEmail, userEmail],
            subject: 'Appointment Cancellation',
            text: `
            An appointment has been cancelled.
            
            Details:
            Date: ${date}
            Start: ${start}
            End: ${end}
            Barber: ${barber}
            User: ${user}
            Service: ${serviceDetails.name} - ${serviceDetails.description}
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('Cancellation email sent to:', barberEmail, userEmail);
        } catch (error) {
            console.error('Error sending cancellation email:', error);
        }
    }
}

module.exports = new EmailService();
