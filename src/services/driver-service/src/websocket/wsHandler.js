const { Server } = require('socket.io');
const DriverLocation = require('../models/DriverLocation');
const { publishRideResponse, publishLocationUpdated } = require('../events/producer');

// Store connected drivers: Map<driverId, socket>
const connectedDrivers = new Map();

let io;

/**
 * Initialize Socket.IO server on driver-service
 * Contract: ws://driver-service:3004 (Socket.IO)
 */
function initWebSocket(server) {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        path: '/ws'  // Keep /ws path for backward-compat with simulator
    });

    console.log('✓ Socket.IO server initialized at /ws');

    io.on('connection', (socket) => {
        // Support both query.token (legacy) and query.driverId (preferred)
        const token = socket.handshake.query.token;
        const queryDriverId = socket.handshake.query.driverId;
        const driverId = queryDriverId || token;

        if (!driverId) {
            socket.disconnect(true);
            return;
        }

        console.log(`[WS] Driver ${driverId} connected (socketId: ${socket.id})`);

        // Store connection
        connectedDrivers.set(driverId, socket);

        // Send connection acknowledgment
        socket.emit('connection:ack', { driverId, status: 'connected' });

        // ──────────────────────────────────────────────
        // Incoming events from Driver App / Simulator
        // ──────────────────────────────────────────────

        socket.on('driver:location_update', async (payload) => {
            await handleLocationUpdate(driverId, payload);
        });

        socket.on('driver:status_change', async (payload) => {
            await handleStatusChange(driverId, payload);
        });

        socket.on('driver:ride_response', async (payload) => {
            await handleRideResponse(driverId, payload);
        });

        // ──────────────────────────────────────────────
        // Disconnect
        // ──────────────────────────────────────────────

        socket.on('disconnect', (reason) => {
            console.log(`[WS] Driver ${driverId} disconnected (${reason})`);
            connectedDrivers.delete(driverId);

            DriverLocation.update(
                { status: 'OFFLINE' },
                { where: { driverId } }
            ).catch(err => console.error('Error updating driver status on disconnect:', err));
        });

        socket.on('error', (error) => {
            console.error(`[WS] Error for driver ${driverId}:`, error.message);
        });
    });

    return io;
}

/**
 * driver:location_update - Update driver GPS location
 */
async function handleLocationUpdate(driverId, payload) {
    const { lat, lng, vehicleType } = payload; // Extract vehicleType
    console.log(`[WS-LOC] Driver ${driverId}: lat=${lat}, lng=${lng}, type=${vehicleType || 'SEDAN'}`);

    try {
        const updateData = { driverId, lat, lng };
        if (vehicleType) {
            updateData.vehicleType = vehicleType;
        }
        await DriverLocation.upsert(updateData);
        await publishLocationUpdated(driverId, lat, lng);
    } catch (error) {
        console.error(`[WS] Error updating location for ${driverId}:`, error.message);
    }
}

/**
 * driver:status_change - Update driver availability
 */
async function handleStatusChange(driverId, payload) {
    const { status } = payload;

    if (!['AVAILABLE', 'BUSY', 'OFFLINE'].includes(status)) {
        console.warn(`[WS] Invalid status: ${status}`);
        return;
    }

    try {
        await DriverLocation.update({ status }, { where: { driverId } });
        console.log(`[WS] Driver ${driverId} status → ${status}`);
    } catch (error) {
        console.error(`[WS] Error updating status for ${driverId}:`, error.message);
    }
}

/**
 * driver:ride_response - Driver accepts or rejects ride
 */
async function handleRideResponse(driverId, payload) {
    const { rideId, action, userId } = payload;
    console.log(`[WS] Driver ${driverId} ${action} ride ${rideId} (user: ${userId})`);
    await publishRideResponse(rideId, driverId, action, userId);
}

/**
 * Send message to a specific driver
 */
function sendToDriver(driverId, event, payload) {
    const socket = connectedDrivers.get(driverId);
    if (socket && socket.connected) {
        socket.emit(event, payload);
        console.log(`[WS] Sent ${event} to driver ${driverId}`);
        return true;
    }
    console.warn(`[WS] Driver ${driverId} not connected`);
    return false;
}

/**
 * Send ride request to driver (server → client)
 */
function sendRideRequest(driverId, rideData) {
    return sendToDriver(driverId, 'ride:new_request', rideData);
}

/**
 * Notify driver that ride was cancelled
 */
function sendRideCancelled(driverId, rideId, reason) {
    return sendToDriver(driverId, 'ride:cancelled', { rideId, reason });
}

/**
 * Get list of connected driver IDs
 */
function getConnectedDrivers() {
    return Array.from(connectedDrivers.keys());
}

module.exports = {
    initWebSocket,
    sendToDriver,
    sendRideRequest,
    sendRideCancelled,
    getConnectedDrivers
};
