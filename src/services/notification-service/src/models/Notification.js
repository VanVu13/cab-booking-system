const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const notificationSchema = new mongoose.Schema({
    notificationId: {
        type: String,
        default: () => uuidv4(),
        unique: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'RIDE_ASSIGNED',
            'RIDE_ACCEPTED',
            'RIDE_REJECTED',
            'RIDE_CANCELLED',
            'RIDE_STARTED',
            'RIDE_COMPLETED',
            'RIDE_MATCH_FAILED',
            'PAYMENT_COMPLETED',
            'PAYMENT_FAILED'
        ]
    },
    recipientId: {
        type: String,
        required: true,
        index: true
    },
    recipientType: {
        type: String,
        required: true,
        enum: ['PASSENGER', 'DRIVER']
    },
    rideId: {
        type: String,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    channel: {
        type: String,
        enum: ['IN_APP', 'PUSH', 'SMS'],
        default: 'IN_APP'
    },
    status: {
        type: String,
        enum: ['PENDING', 'SENT', 'FAILED'],
        default: 'SENT'
    },
    readAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
notificationSchema.index({ recipientId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
