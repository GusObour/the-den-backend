// server.js
const express = require("express");
const os = require('os');
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const morgan = require("morgan");
const logger = require("./services/LoggerService");
const { initializeWebSocketServer } = require("./services/WebSocketService");
const connectDB = require("./config/db");
const RedisClient = require("./services/RedisClientService");
const JobSchedulerService = require('./services/JobSchedulerService');
const UnlockExpiredSlotsJob = require('./Jobs/UnlockExpiredSlotsJob');
const UpdateExpiredAppointmentsJob = require('./Jobs/UpdateExpiredAppointmentsJob');
const GenerateWeeklyInvoicesJob = require('./Jobs/GenerateWeeklyInvoicesJob');
const UpdateWeeklyAvailabilityJob = require('./Jobs/UpdateWeeklyAvailabilityJob');
const NotifyOneDayBeforeJob = require('./Jobs/NotifyOneDayBeforeJob');
const NotifyOneHourBeforeJob = require('./Jobs/NotifyOneHourBeforeJob');

const authRoutes = require("./routes/authRoutes");
const servicesRoutes = require("./routes/servicesRoutes");
const barbersRoutes = require("./routes/barbersRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
// const bookingRoutes = require("./routes/bookingRoutes");
const statsRoutes = require("./routes/statsRoutes");
const userRoutes = require("./routes/userRoutes");
const googleAuthRoutes = require('./routes/googleAuthRoutes');
const SessionManager = require("./services/SessionManager");
// const startScheduler = require("./services/availabilityScheduler");

const app = express();

const initServer = async () => {
    try {
        const mongooseConnection = await connectDB.connect();

        const sessionManager = new SessionManager(app, mongooseConnection);
        sessionManager.initialize();

        const redisInstance = new RedisClient();
        await redisInstance.connect();
        logger.info("Redis client is ready to use");

        const allowedOrigins = [
            process.env.PRODUCTION_CLIENT_URL,
            process.env.CLIENT_URL,
            process.env.STAGGING_CLIENT_URL,
            "http://localhost:3000",
            "http://localhost:3001",
        ];

        app.use(
            cors({
                origin: (origin, callback) => {
                    if (!origin) return callback(null, true);
                    if (allowedOrigins.indexOf(origin) === -1) {
                        const msg =
                            "The CORS policy for this site does not allow access from the specified Origin.";
                        return callback(new Error(msg), false);
                    }
                    return callback(null, true);
                },
                credentials: true,
            })
        );

        app.use(express.json());

        // Morgan middleware for logging HTTP requests
        app.use(morgan('combined', {
            stream: {
                write: (message) => logger.info(message.trim()),
            },
        }));

        app.use("/uploads", express.static(path.join(__dirname, "uploads")));
        app.use("/auth", authRoutes);
        app.use("/services", 
            (req,res, next) =>{
                req.redisClient = redisInstance.getClient();
                next();
            },servicesRoutes);
        app.use(
            "/barbers",
            (req, res, next) => {
                req.redisClient = redisInstance.getClient();
                next();
            },
            barbersRoutes
        );
        app.use("/availability",
            (req, res, next) => {
                req.redisClient = redisInstance.getClient();
                next();
            },
            availabilityRoutes);

        // app.use(
        //     "/book",
        //     (req, res, next) => {
        //         req.redisClient = redisInstance.getClient();
        //         next();
        //     },
        //     bookingRoutes
        // );
        app.use("/stats", statsRoutes);
        app.use(
            "/user",
            (req, res, next) => {
                req.redisClient = redisInstance.getClient();
                next();
            },
            userRoutes
        );
        app.use(
            '/google',
            (req, res, next) => {
                req.redisClient = redisInstance.getClient();
                next();
            },
            googleAuthRoutes);

        const jobScheduler = new JobSchedulerService(redisInstance.getClient());
        jobScheduler.registerJob('*/5 * * * *', new UnlockExpiredSlotsJob(redisInstance.getClient()));
        jobScheduler.registerJob('*/5 * * * *', new UpdateExpiredAppointmentsJob(redisInstance.getClient()));
        jobScheduler.registerJob('0 0 * * 0', new GenerateWeeklyInvoicesJob(redisInstance.getClient()));
        jobScheduler.registerJob('0 0 * * 0', new UpdateWeeklyAvailabilityJob(redisInstance.getClient()));
        jobScheduler.registerJob('0 * * * *', new NotifyOneDayBeforeJob(redisInstance.getClient()));
        jobScheduler.registerJob('0 * * * *', new NotifyOneHourBeforeJob(redisInstance.getClient()));
        jobScheduler.start();

        const getServerIPAddress = () => {
            const networkInterfaces = os.networkInterfaces();
            for (const interfaceName in networkInterfaces) {
              for (const netInfo of networkInterfaces[interfaceName]) {
                // Check for IPv4 and non-internal (i.e., not localhost) IPs
                if (netInfo.family === 'IPv4' && !netInfo.internal) {
                  return netInfo.address;
                }
              }
            }
            return 'IP not found';
          };

        const PORT = process.env.PORT || 5000;
        const server = app.listen(PORT, () => {
            const ipAddress = getServerIPAddress();
            console.log(`Server is running on http://${ipAddress}:${PORT}`);
          
        });

        initializeWebSocketServer(server);
        // startScheduler();
    } catch (err) {
        logger.error("Error initializing server", err);
        process.exit(1);
    }
};

initServer();
