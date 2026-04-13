const { mongoose } = require('../config/database');

const rideSchema = new mongoose.Schema({
    rideId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    bookingId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    driverId: {
        type: String,
        required: true,
        index: true
    },
    pickup: {
        lat: { type: Number },
        lng: { type: Number },
        address: { type: String }
    },
    drop: {
        lat: { type: Number },
        lng: { type: Number },
        address: { type: String }
    },
    vehicleType: {
        type: String,
        enum: ['SEDAN', 'SUV', 'BIKE'],
        default: 'SEDAN'
    },
    status: {
        type: String,
        enum: ['ASSIGNED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        default: 'ASSIGNED'
    },
    paymentMethod: {
        type: String,
        enum: ['CASH', 'WALLET', 'CARD'],
        default: 'CASH'
    },
    estimatedPrice: {
        type: Number
    },
    finalPrice: {
        type: Number
    },
    distanceMeters: {
        type: Number
    },
    durationSeconds: {
        type: Number
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    }
}, {
    timestamps: true
});

const Ride = mongoose.model('Ride', rideSchema);

module.exports = Ride;
