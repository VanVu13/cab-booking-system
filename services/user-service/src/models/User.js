const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Authentication reference
    authId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },

    // Basic info
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },

    phone: {
        type: String,
        required: true,
        unique: true,
        match: [/^[0-9]{10,15}$/, 'Please enter a valid phone number'],
    },

    fullName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100,
    },

    avatar: {
        type: String,
        default: 'https://ui-avatars.com/api/?name=User&background=random',
    },

    dateOfBirth: {
        type: Date,
        validate: {
            validator: function(value) {
                if (!value) return true;
                const age = Math.floor((new Date() - value) / (365.25 * 24 * 60 * 60 * 1000));
                return age >= 18;
            },
            message: 'User must be at least 18 years old',
        },
    },

    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer_not_to_say'],
        default: 'prefer_not_to_say',
    },

    // Address
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        country: { type: String, default: 'Vietnam', trim: true },
        postalCode: { type: String, trim: true },
        coordinates: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
        },
    },

    // User type
    userType: {
        type: String,
        enum: ['customer', 'driver', 'admin', 'support'],
        default: 'customer',
        required: true,
    },

    // Driver-specific fields
    driverProfile: {
        licenseNumber: { type: String, trim: true },
        licenseExpiry: Date,
        vehicleType: {
            type: String,
            enum: ['car', 'motorbike', 'bicycle', 'suv', 'van', null],
        },
        vehiclePlate: { type: String, trim: true },
        vehicleModel: { type: String, trim: true },
        vehicleColor: { type: String, trim: true },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        totalTrips: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalEarnings: {
            type: Number,
            default: 0,
            min: 0,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'suspended', 'pending'],
            default: 'pending',
        },
    },

    // Preferences
    preferences: {
        language: {
            type: String,
            default: 'vi',
            enum: ['vi', 'en'],
        },
        currency: {
            type: String,
            default: 'VND',
            enum: ['VND', 'USD'],
        },
        notificationEnabled: {
            type: Boolean,
            default: true,
        },
        theme: {
            type: String,
            default: 'light',
            enum: ['light', 'dark', 'auto'],
        },
    },

    // Wallet
    wallet: {
        balance: {
            type: Number,
            default: 0,
            min: 0,
        },
        currency: {
            type: String,
            default: 'VND',
        },
        lastTransaction: Date,
    },

    // Security
    isActive: {
        type: Boolean,
        default: true,
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    isPhoneVerified: {
        type: Boolean,
        default: false,
    },
    lastLogin: Date,
    loginAttempts: {
        type: Number,
        default: 0,
    },
    lockUntil: Date,

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    deletedAt: Date,
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Indexes
userSchema.index({ 'address.coordinates': '2dsphere' });
userSchema.index({ userType: 1, 'driverProfile.status': 1 });
userSchema.index({ email: 1, phone: 1 });

// Virtuals
userSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    const diff = Date.now() - this.dateOfBirth.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

userSchema.virtual('isDriver').get(function() {
    return this.userType === 'driver';
});

userSchema.virtual('fullAddress').get(function() {
    if (!this.address) return '';
    const parts = [
        this.address.street,
        this.address.city,
        this.address.state,
        this.address.country,
        this.address.postalCode,
    ].filter(Boolean);
    return parts.join(', ');
});

// Middleware
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();

    // Validate driver profile
    if (this.userType === 'driver') {
        if (!this.driverProfile.licenseNumber) {
            next(new Error('License number is required for drivers'));
        }
    }

    next();
});

// Methods
userSchema.methods.isAccountLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incrementLoginAttempts = async function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return await this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };
    if (this.loginAttempts + 1 >= 5) {
        updates.$set = { lockUntil: Date.now() + (2 * 60 * 60 * 1000) }; // Lock for 2 hours
    }

    return await this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function() {
    return await this.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
    });
};

// Static methods
userSchema.statics.findByEmailOrPhone = function(email, phone) {
    return this.findOne({
        $or: [{ email }, { phone }],
    });
};

userSchema.statics.findNearbyDrivers = function(coordinates, maxDistance = 5000) {
    return this.find({
        userType: 'driver',
        'driverProfile.status': 'active',
        'address.coordinates': {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates,
                },
                $maxDistance: maxDistance,
            },
        },
    });
};

module.exports = mongoose.model('User', userSchema);