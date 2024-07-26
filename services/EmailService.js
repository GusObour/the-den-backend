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
        const { newDate, startTime, endTime, barber, user, service } = appointmentDetails;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: [barberEmail, userEmail],
            subject: 'Appointment Booking Confirmation',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src='https://the-den-backend-production.up.railway.app/uploads/TheDen.jpeg' alt="The Den" style="max-width: 150px;">
                    </div>
                    <h2 style="color: #375C95; text-align: center;">Appointment Booking Confirmation</h2>
                    <p style="font-size: 16px;">Your appointment is confirmed. Here are the details:</p>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Date:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${newDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Start:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${startTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">End:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${endTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Barber:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${barber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Client:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${user}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Service:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${service.name} - ${service.description}</td>
                        </tr>
                    </table>
                    <p style="text-align: center; font-size: 14px; color: #888;">Thank you for booking with us!</p>
                </div>
            `,
        };
    
        try {
            await this.transporter.sendMail(mailOptions);
            console.log('Booking confirmation email sent to:', barberEmail, userEmail);
        } catch (error) {
            console.error('Error sending booking confirmation email:', error);
        }
    }


    async sendCompletionEmail(barberEmail, userEmail, appointmentDetails) {
        const { newDate, startTime, endTime, barber, user, service } = appointmentDetails;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: [barberEmail, userEmail],
            subject: 'Appointment Completion',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src='https://the-den-backend-production.up.railway.app/uploads/TheDen.jpeg' alt="The Den" style="max-width: 150px;">
                    </div>
                    <h2 style="color: #28A745; text-align: center;">Appointment Completion</h2>
                    <p style="font-size: 16px;">Your appointment has been completed. Here are the details:</p>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Date:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${newDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Start:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${startTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">End:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${endTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Barber:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${barber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Client:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${user}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Service:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${service.name} - ${service.description}</td>
                        </tr>
                    </table>
                    <p style="text-align: center; font-size: 14px; color: #888;">Thank you for choosing our service!</p>
                </div>
            `,
        };
    
        try {
            await this.transporter.sendMail(mailOptions);
            console.log('Completion email sent to:', barberEmail, userEmail);
        } catch (error) {
            console.error('Error sending completion email:', error);
        }
    }
    
    

    async sendCancellationEmail(barberEmail, userEmail, appointmentDetails) {
        const { newDate, startTime, endTime, barber, user, service } = appointmentDetails;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: [barberEmail, userEmail],
            subject: 'Appointment Cancellation',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src='https://the-den-backend-production.up.railway.app/uploads/TheDen.jpeg' alt="The Den" style="max-width: 150px;">
                    </div>
                    <h2 style="color: #E74C3C; text-align: center;">Appointment Cancellation</h2>
                    <p style="font-size: 16px;">An appointment has been cancelled. Here are the details:</p>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Date:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${newDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Start:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${startTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">End:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${endTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Barber:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${barber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Client:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${user}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Service:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${service.name} - ${service.description}</td>
                        </tr>
                    </table>
                    <p style="text-align: center; font-size: 14px; color: #888;">We apologize for any inconvenience.</p>
                </div>
            `,
        };
    
        try {
            await this.transporter.sendMail(mailOptions);
            console.log('Cancellation email sent to:', barberEmail, userEmail);
        } catch (error) {
            console.error('Error sending cancellation email:', error);
        }
    }    

    async sendRequestPasswordResetEmail(email, resetDetails) {
        const { resetUrl } = resetDetails;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src='https://the-den-backend-production.up.railway.app/uploads/TheDen.jpeg' alt="The Den" style="max-width: 150px;">
                    </div>
                    <h2 style="color: #375C95; text-align: center;">Password Reset</h2>
                    <p style="font-size: 16px;">You have requested a password reset. Click the link below to reset your password:</p>
                    <a href="${resetUrl}" style="display: block; text-align: center; margin: 20px 0; text-decoration: none; color: #fff; background-color: #375C95; padding: 10px 20px; border-radius: 5px;">Reset Password</a>
                    <p style="text-align: center; font-size: 14px; color: #888;">If you did not request a password reset, please ignore this email.</p>
                </div>
            `,
        };
    
        try {
            await this.transporter.sendMail(mailOptions);
            console.log('Password reset email sent to:', email);
        } catch (error) {
            console.error('Error sending password reset email:', error);
        }
    }

    async sendPasswordResetEmail(email) {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src='https://the-den-backend-production.up.railway.app/uploads/TheDen.jpeg' alt="The Den" style="max-width: 150px;">
                    </div>
                    <h2 style="color: #375C95; text-align: center;">Your password has been reset</h2>
                    <p style="font-size: 16px;">If you did not reset your password, please contact us immediately. At <a href="mailto:theden@theden.app"> theden@theden.app </a> </p>
                    <p style="text-align: center; font-size: 14px; color: #888;">Thank you for using our service!</p>
                    </div>
            `,
        }
        try {
            await this.transporter.sendMail(mailOptions);
            console.log('Password reset email sent to:', email);
        } catch (error) {
            console.error('Error sending password reset email:', error);
        }
    }
}

module.exports = new EmailService();
