const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require("path");
const cron = require('node-cron');
const { initializeWebSocketServer } = require('./services/WebSocketService');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const servicesRoutes = require('./routes/servicesRoutes');
const barbersRoutes = require('./routes/barbersRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const SessionManager = require('./services/SessionManager');
const DatabaseFiller = require('./services/DatabaseFiller');
const unlockAppointments = require('./services/unlockAppointments');

const app = express();

const initServer = async () => {
    try {
        const mongooseConnection = await connectDB.connect();

        const sessionManager = new SessionManager(app, mongooseConnection);
        sessionManager.initialize();

        const allowedOrigins = [
            process.env.PRODUCTION_CLIENT_URL,
            process.env.CLIENT_URL,
            process.env.STAGGING_CLIENT_URL,
            'http://localhost:3000', 'http://localhost:3001'
        ];

        app.use(cors({
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                if (allowedOrigins.indexOf(origin) === -1) {
                    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
                    return callback(new Error(msg), false);
                }
                return callback(null, true);
            },
            credentials: true,
        }));

        app.use(express.json());

        app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
        app.use('/auth', authRoutes);
        app.use('/services', servicesRoutes);
        app.use('/barbers', barbersRoutes);
        app.use('/availability', availabilityRoutes);
        app.use('/book', bookingRoutes);

        const PORT = process.env.PORT || 5000;
        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        initializeWebSocketServer(server);

        cron.schedule('*/5 * * * *', unlockAppointments);
    } catch (err) {
        console.error('Error initializing server', err);
        process.exit(1);
    }
};

initServer();
