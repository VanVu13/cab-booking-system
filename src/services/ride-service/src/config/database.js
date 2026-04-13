const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cab_ride';

async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✓ MongoDB connected successfully');
        return mongoose.connection;
    } catch (error) {
        console.error('✗ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

module.exports = { connectDB, mongoose };
