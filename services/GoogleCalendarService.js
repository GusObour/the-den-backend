const { google } = require('googleapis');

class GoogleCalendarService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
    }

    async createEvent({ summary, description, start, end, attendees }) {
        try {
            const event = {
                summary,
                description,
                start: { dateTime: start },
                end: { dateTime: end },
                attendees: attendees.map(email => ({ email })),
            };
            const response = await this.calendar.events.insert({
                calendarId: 'primary',
                resource: event
            });
            return response.data;
        } catch (error) {
            console.error('Error creating Google Calendar event:', error);
            throw error;
        }
    }

    setCredentials(tokens) {
        this.oauth2Client.setCredentials(tokens);
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    }
}

module.exports = new GoogleCalendarService();
