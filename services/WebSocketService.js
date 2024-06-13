const { Server } = require('ws');
const BarberAvailability = require('../models/BarberAvailability');

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
        const locked = await lockAppointment(appointmentData);
        if (locked) {
            ws.send(JSON.stringify({ action: 'locked', appointmentData }));
        } else {
            ws.send(JSON.stringify({ action: 'unavailable', appointmentData }));
        }
    }
};

const lockAppointment = async (appointmentData) => {
    const { barberId, date, start, end } = appointmentData;
    const availability = await BarberAvailability.findOne({
        barber: barberId,
        date: new Date(date),
        start: new Date(start),
        end: new Date(end),
        appointment: null,
        locked: false
    });

    if (availability) {
        availability.locked = true;
        availability.lockExpiration = new Date(Date.now() + 5 * 60 * 1000); // Lock for 5 minutes
        await availability.save();
        return true;
    } else {
        return false;
    }
};

module.exports = { initializeWebSocketServer };
