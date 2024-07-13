const { google } = require('googleapis');
const momentTz = require('moment-timezone');

class GoogleCalendarService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
    }

    async createEvent({ summary, description, start, end, attendees }) {
        const event = {
          summary,
          description,
          start: {
            dateTime: start,
            timeZone: momentTz.tz.guess(),
          },
          end: {
            dateTime: end,
            timeZone: momentTz.tz.guess(),
          },
          attendees: attendees.map(email => ({ email })),
        };
    
        return await this.calendar.events.insert({
          auth: this.oauth2Client,
          calendarId: 'primary',
          resource: event,
        });
      }
    

    setCredentials(tokens) {
        this.oauth2Client.setCredentials(tokens);
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    }
}

module.exports = new GoogleCalendarService();
