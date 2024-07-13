const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const bookingController = require('../controllers/bookingController');
const GoogleCalendarService = require('../services/GoogleCalendarService');

router.get('/auth', (req, res) => {
    const state = JSON.stringify(req.query);
    const url = GoogleCalendarService.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.events'],
        state: encodeURIComponent(state)
    });
    res.redirect(url);
});

router.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  try {
      const { tokens } = await GoogleCalendarService.oauth2Client.getToken(code);
      const decodedState = decodeURIComponent(state);
      let appointmentData;

      try {
          // Parse the outer state object
          const outerState = JSON.parse(decodedState);
          // Parse the nested JSON string in the outer state
          appointmentData = JSON.parse(outerState.state);
          console.log(`Type of appointmentData: ${typeof appointmentData}`);
          console.log(`Appointment data: ${JSON.stringify(appointmentData, null, 2)}`);
      } catch (parseError) {
          console.error('Error parsing state:', parseError);
          throw new Error('Invalid state parameter');
      }

      // Ensure appointmentData is an object
      if (typeof appointmentData !== 'object' || appointmentData === null) {
          throw new Error('Invalid appointment data');
      }

      // Set credentials for Google Calendar API
      GoogleCalendarService.setCredentials(tokens);

      // Create appointment directly
      const bookingResult = await bookingController.createAppointment(req, appointmentData, tokens);

      // Redirect back to the frontend with booking result
      const resultState = encodeURIComponent(JSON.stringify({ bookingResult }));
      res.redirect(`${process.env.CLIENT_URL}/booking/result?state=${resultState}`);
  } catch (error) {
      console.error('Error during Google OAuth callback and booking:', error);
      const errorState = encodeURIComponent(JSON.stringify({ success: false, message: 'Google OAuth callback and booking failed' }));
      res.redirect(`${process.env.CLIENT_URL}/booking/result?state=${errorState}`);
  }
});

module.exports = router;
