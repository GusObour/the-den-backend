const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const servicesRoutes = require('./routes/servicesRoutes');
const barbersRoutes = require('./routes/barbersRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const SessionManager = require('./services/SessionManager');
const DatabaseFiller = require('./services/DatabaseFiller');

const app = express();

// Async function to initialize server
const initServer = async () => {
    try {
        const mongooseConnection = await connectDB.connect();

        // Initialize session management
        const sessionManager = new SessionManager(app, mongooseConnection);
        sessionManager.initialize();

        // Middleware
        const allowedOrigins = [
            process.env.PRODUCTION_CLIENT_URL,
            process.env.CLIENT_URL,
            process.env.STAGGING_CLIENT_URL,
            'http://localhost:3000' 
        ];

        app.use(cors({
            origin: (origin, callback) => {
                // allow requests with no origin - like mobile apps or curl requests
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

        // Routes
        app.use('/auth', authRoutes);
        app.use('/services', servicesRoutes);
        app.use('/barbers', barbersRoutes);
        app.use('/availability', availabilityRoutes);

        // Fill database with temporary barber and availability
        // await DatabaseFiller.addTempBarberAndFillAvailability();

        // Start server
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Error initializing server', err);
        process.exit(1);  // Exit process with failure
    }
};

initServer();
