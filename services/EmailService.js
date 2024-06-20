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
}

module.exports = new EmailService();
