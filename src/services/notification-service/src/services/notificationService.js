const Notification = require('../models/Notification');
const { v4: uuidv4 } = require('uuid');
const { sendToUser } = require('../websocket/wsHandler');

/**
 * Create and save a notification based on event data
 */
async function createNotification(type, data) {
    try {
        const notificationData = mapEventToNotification(type, data);

        if (!notificationData) {
            console.warn(`[Notification] No mapping for event type: ${type}`);
            return null;
        }

        const notification = new Notification({
            ...notificationData,
            data: data,
            status: 'SENT' // In a real system, this might be PENDING until actually sent via Push/SMS
        });

        await notification.save();
        console.log(`✓ Notification created for ${notification.recipientType} ${notification.recipientId}: ${notification.title}`);

        // Push to WebSocket if user is connected
        const wsEvent = notificationData.wsEvent || notificationData.type;
        const sent = sendToUser(notification.recipientId, wsEvent, notificationData);
        if (sent) {
            console.log(`✓ WebSocket event '${wsEvent}' sent to ${notification.recipientId}`);
        } else {
            console.log(`ℹ Client ${notification.recipientId} not connected via WebSocket`);
        }

        return notification;
    } catch (error) {
        console.error(`✗ Failed to create notification for ${type}:`, error);
        throw error;
    }
}

/**
 * Map event types to notification content (title, message, recipient)
 */
function mapEventToNotification(type, data) {
    switch (type) {
        case 'driver.location_updated':
            return null; // Handled directly in consumer

        case 'ride.assigned':
            return {
                recipientId: data.driverId,
                recipientType: 'DRIVER',
                rideId: data.rideId,
                driverId: data.driverId, // Ensure driverId is top-level
                userId: data.userId, // Ensure userId is top-level
                title: 'New Ride Assigned',
                message: `You have a new ride request from ${data.pickup?.address || 'customer location'}.`,
                type: 'RIDE_ASSIGNED',
                wsEvent: 'notification:receive', // Standard push notification event
                payload: data
            };

        case 'ride.accepted':
            return {
                recipientId: data.userId || 'UNKNOWN_USER',
                recipientType: 'PASSENGER',
                rideId: data.rideId,
                driverId: data.driverId, // Added to top level
                title: 'Driver Accepted',
                message: `Driver ${data.driverId} has accepted your ride!`,
                type: 'RIDE_ACCEPTED',
                wsEvent: 'notification:receive', // Standard push notification event
                payload: data
            };

        case 'ride.rejected':
            return {
                recipientId: data.userId || 'UNKNOWN_USER',
                recipientType: 'PASSENGER',
                rideId: data.rideId,
                title: 'Driver Rejected',
                message: 'A driver declined your request. Finding another driver...',
                type: 'RIDE_REJECTED',
                wsEvent: 'booking:match_failed',
                payload: { reason: 'Driver rejected' }
            };

        case 'ride.cancelled':
            return {
                recipientId: data.driverId,
                recipientType: 'DRIVER',
                rideId: data.rideId,
                title: 'Ride Cancelled',
                message: 'The customer has cancelled the ride.',
                type: 'RIDE_CANCELLED',
                wsEvent: 'ride:cancelled',
                payload: { reason: data.reason }
            };

        case 'ride.started':
            return {
                recipientId: data.userId || 'UNKNOWN_USER',
                recipientType: 'PASSENGER',
                rideId: data.rideId,
                title: 'Ride Started',
                message: 'Your ride has started. Have a safe trip!',
                type: 'RIDE_STARTED',
                wsEvent: 'ride:status_update',
                payload: { status: 'IN_PROGRESS', timestamp: new Date() }
            };

        case 'ride.completed':
            return {
                recipientId: data.userId || 'UNKNOWN_USER',
                recipientType: 'PASSENGER',
                rideId: data.rideId,
                title: 'Ride Completed',
                message: `Your ride has arrived. Total: ${data.finalPrice} VND.`,
                type: 'RIDE_COMPLETED',
                wsEvent: 'ride:status_update',
                payload: { status: 'COMPLETED', finalPrice: data.finalPrice, timestamp: new Date() }
            };

        case 'ride.match_failed':
            return {
                recipientId: data.userId,
                recipientType: 'PASSENGER',
                rideId: data.rideId,
                title: 'No Driver Found',
                message: `We could not find a driver for you. Reason: ${data.reason}`,
                type: 'RIDE_MATCH_FAILED',
                wsEvent: 'booking:match_failed',
                payload: { reason: data.reason }
            };

        case 'payment.completed':
            return {
                recipientId: data.userId || 'UNKNOWN_USER',
                recipientType: 'PASSENGER',
                rideId: data.rideId,
                title: 'Payment Successful',
                message: `Payment of ${data.amount} VND was successful.`,
                type: 'PAYMENT_COMPLETED',
                wsEvent: 'payment:completed',
                payload: data
            };

        case 'payment.failed':
            return {
                recipientId: data.userId || 'UNKNOWN_USER',
                recipientType: 'PASSENGER',
                rideId: data.rideId,
                title: 'Payment Failed',
                message: `Payment failed. Reason: ${data.reason}`,
                type: 'PAYMENT_FAILED',
                wsEvent: 'payment:failed',
                payload: data
            };

        default:
            return null;
    }
}

module.exports = {
    createNotification
};
