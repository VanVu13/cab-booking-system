const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Socket namespaces/rooms organization
// Clients join shared rooms based on userId or rideId

let io;

/**
 * Initialize Socket.IO server
 */
function initWebSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*", // Adjust for production
            methods: ["GET", "POST"]
        },
        path: '/socket.io/' // Default path
    });

    console.log('✓ Socket.IO server initialized');

    io.on('connection', (socket) => {
        const token = socket.handshake.query.token;
        let userId = 'anonymous';

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
                userId = decoded.userId || decoded.id || decoded.sub || token;
                console.log(`[Socket.IO] Authenticated user: ${userId}`);
            } catch (err) {
                console.warn(`[Socket.IO] Token verification failed: ${err.message}`);
                userId = token; // Fallback to token string if verify fails (backward compatibility)
            }
        }

        console.log(`[Socket.IO] Client connected: ${userId} (socketId: ${socket.id})`);

        // Join personal room for targeted notifications
        socket.join(userId);

        socket.on('customer:join_room', (data) => {
            const { roomId } = data;
            socket.join(roomId);
            console.log(`[Socket.IO] Client ${userId} joined room ${roomId}`);
        });

        socket.on('subscribe:driver', (data) => {
            const { driverId } = data;
            const driverRoom = `driver:${driverId}`;
            socket.join(driverRoom);
            console.log(`[Socket.IO] Client ${userId} subscribed to ${driverRoom}`);
        });

        socket.on('unsubscribe:driver', (data) => {
            const { driverId } = data;
            if (driverId) {
                const driverRoom = `driver:${driverId}`;
                socket.leave(driverRoom);
                console.log(`[Socket.IO] Client ${userId} unsubscribed from ${driverRoom}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Socket.IO] Client disconnected: ${userId}`);
        });
    });

    return io;
}

/**
 * Send notification to specific user
 */
function sendToUser(userId, event, payload) {
    if (io) {
        io.to(userId).emit(event, payload);
        console.log(`[Socket.IO] Pushed ${event} to ${userId}`);
        return true;
    }
    return false;
}

/**
 * Broadcast to a room (e.g., driver updates)
 */
function broadcastToRoom(roomName, event, payload) {
    if (io) {
        io.to(roomName).emit(event, payload);
        console.log(`[Socket.IO] Broadcast ${event} to room ${roomName}`);
        return true;
    }
    return false;
}

module.exports = {
    initWebSocket,
    sendToUser,
    broadcastToRoom
};
