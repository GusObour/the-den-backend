const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const bookingController = require('../controllers/bookingController');
const GoogleCalendarService = require('../services/GoogleCalendarService');
const authMiddleware = require('../middleware/authMiddleware');

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
      const parsedState = JSON.parse(decodeURIComponent(state));
      // Redirect back to the frontend with tokens and state (booking details)
      res.redirect(`${process.env.CLIENT_URL}/google/auth/callback?tokens=${encodeURIComponent(JSON.stringify(tokens))}&state=${encodeURIComponent(JSON.stringify(parsedState))}`);
    } catch (error) {
      console.error('Error during Google OAuth callback:', error);
      res.status(500).json({ message: 'Google OAuth callback failed' });
    }
  });

  router.post('/complete-booking', authMiddleware.authenticate, async (req, res) => {
    const { appointmentData, tokens } = req.body;
  
    try {
      GoogleCalendarService.setCredentials(tokens);
  
      // The appointmentData is already an object, no need to parse it
      const bookingResult = await bookingController.createAppointment(req, appointmentData, tokens);
      console.log('bookingResult:', bookingResult);
      res.json(bookingResult);
    } catch (error) {
      console.error('Error completing Google booking:', error);
      res.status(500).json({ message: 'Error completing Google booking' });
    }
  });
  
  
  
module.exports = router;
