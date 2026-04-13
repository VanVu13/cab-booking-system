const { mongoose } = require('../config/database');

const bookingSchema = new mongoose.Schema({
    idempotencyKey: {
        type: String,
        unique: true,
        sparse: true
    },
    // Using custom bookingId (UUID)
    bookingId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    pickup: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        address: { type: String }
    },
    drop: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        address: { type: String }
    },
    vehicleType: {
        type: String,
        enum: ['SEDAN', 'SUV', 'BIKE'],
        default: 'SEDAN'
    },
    status: {
        type: String,
        enum: ['CREATED', 'SEARCHING_DRIVER', 'PROPOSED', 'DRIVER_ASSIGNED', 'ARRIVED', 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'MATCH_FAILED'],
        default: 'CREATED'
    },
    provisionalDriverId: {
        type: String
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'PAID', 'FAILED'],
        default: 'PENDING'
    },
    paymentMethod: {
        type: String,
        enum: ['CASH', 'WALLET', 'CARD'],
        default: 'CASH'
    },
    // Pricing info (from Pricing Service)
    estimatedPrice: {
        type: Number
    },
    currency: {
        type: String,
        default: 'VND'
    },
    surgeMultiplier: {
        type: Number,
        default: 1.0
    },
    // ETA info (from ETA Service)
    pickupEtaSeconds: {
        type: Number
    },
    tripEtaSeconds: {
        type: Number
    },
    estimatedDistance: {
        type: Number
    },
    // Driver info (from ride.assigned event)
    driverId: {
        type: String,
        default: null
    },
    rideId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
