const { Server } = require('ws');
const BarberAvailability = require('../models/BarberAvailability');
const { User, Barber } = require('../models/User');
const mongoose = require('mongoose');

const initializeWebSocketServer = (server) => {
    const wss = new Server({ server });

    wss.on('connection', (ws) => {
        console.log('WebSocket client connected');
        ws.on('message', async (message) => {
            const data = JSON.parse(message);
            await handleWebSocketMessage(ws, data);
        });

        ws.on('close', () => {
            console.log('WebSocket client disconnected');
        });
    });

    console.log('WebSocket server initialized');
};

const handleWebSocketMessage = async (ws, data) => {
    const { action, appointmentData } = data;

    if (action === 'lock') {
        const result = await lockAppointment(appointmentData);
        if (result.success) {
            ws.send(JSON.stringify({ action: 'locked', appointmentData }));
            return;
        }

        if (result.message.includes('Lock limit reached')) {
            const lockedSlots = await BarberAvailability.find({ lockedBy: appointmentData.userId });
            // Do a check if the appointment data is part of the locked slots
            // if so, we allow the user to proceed with the appointment
            ws.send(JSON.stringify({ action: 'lock_limit_reached', lockedSlots }));
            return;
        }

        ws.send(JSON.stringify({ action: 'unavailable', appointmentData }));
    }
};


const lockAppointment = async (appointmentData) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { barberId, date, start, end, userId } = appointmentData;
        const user = await User.findById(userId).session(session);

        const now = new Date();

        if (!user.lockTimestamp || user.lockTimestamp === null) user.lockTimestamp = now;

        // Reset lock count if more than 10 minutes have passed since last lock
        let timePassed = now - new Date(user.lockTimestamp);
        if (timePassed > 5 * 60 * 1000) {
            user.lockCount = 0;
            user.lockTimestamp = now;
        }

        if (user.lockCount >= 10) {
            await session.abortTransaction();
            session.endSession();
            return { success: false, message: 'Lock limit reached. Please try again later.' };
        }

        const availability = await BarberAvailability.findOneAndUpdate(
            {
                barber: barberId,
                date: new Date(date),
                start: new Date(start),
                end: new Date(end),
                appointment: null,
                $or: [
                    { locked: false },
                    { lockedBy: userId }
                ]
            },
            {
                locked: true,
                lockedBy: userId,
                lockExpiration: new Date(Date.now() + 5 * 60 * 1000)
            },
            { new: true, session }
        );

        if (availability) {
            if (availability.lockedBy !== userId) {
                user.lockCount += 1;
            }
            await user.save({ session });

            await session.commitTransaction();
            session.endSession();
            return { success: true, message: 'Appointment slot locked successfully.' };
        } else {
            await session.abortTransaction();
            session.endSession();
            return { success: false, message: 'Appointment slot is no longer available.' };
        }
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error locking appointment:', error);
        return { success: false, message: 'Error locking appointment.' };
    }
};

module.exports = { initializeWebSocketServer };
