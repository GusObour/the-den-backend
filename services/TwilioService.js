const twilio = require('twilio');

class TwilioService {
    constructor() {
        // console.log('Twilio Account SID:', process.env.TWILIO_ACCOUNT_SID);
        // console.log('Twilio Auth Token:', process.env.TWILIO_AUTH_TOKEN ? 'exists' : 'missing');
        // console.log('Twilio Phone Number:', process.env.TWILIO_PHONE_NUMBER);

        this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }

    async sendSMS(to, body) {
        try {
            console.log(`Sending SMS to: ${to}, Body: ${body}`);
            const message = await this.client.messages.create({
                body,
                from: process.env.TWILIO_PHONE_NUMBER,
                to
            });
            console.log('SMS sent successfully:', message.sid);
            return message;
        } catch (error) {
            console.error('Error sending SMS:', error);
            throw error;
        }
    }
}

module.exports = new TwilioService();
