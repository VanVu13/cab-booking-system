require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') throw new Error('Token has expired');
        if (error.name === 'JsonWebTokenError') throw new Error('Invalid token');
        throw error;
    }
}

module.exports = { verifyToken };
