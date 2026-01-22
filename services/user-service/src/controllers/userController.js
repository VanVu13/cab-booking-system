const User = require('../models/User');
const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

// Create new user
exports.createUser = async(req, res) => {
    try {
        const { authId, email, phone, fullName, userType = 'customer' } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { phone }, { authId }]
        });

        if (existingUser) {
            return res.status(409).json({
                error: 'User already exists'
            });
        }

        const user = new User({
            authId,
            email,
            phone,
            fullName,
            userType,
        });

        await user.save();
        logger.info(`User created: ${user._id}`);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                userType: user.userType,
            },
        });
    } catch (error) {
        logger.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get user by ID
exports.getUserById = async(req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-__v');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        logger.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Update user
exports.updateUser = async(req, res) => {
    try {
        const userId = req.params.id;
        const updates = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Prevent updating protected fields
        delete updates.authId;
        delete updates.email;
        delete updates.walletBalance;
        delete updates.createdAt;

        Object.assign(user, updates);
        await user.save();

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
            },
        });
    } catch (error) {
        logger.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Delete user (soft delete)
exports.deleteUser = async(req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        user.isActive = false;
        await user.save();

        logger.info(`User deactivated: ${userId}`);

        res.status(200).json({
            success: true,
            message: 'User deactivated successfully',
        });
    } catch (error) {
        logger.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Search users
exports.searchUsers = async(req, res) => {
    try {
        const { query, userType, page = 1, limit = 10 } = req.query;
        const filter = { isActive: true };

        if (query) {
            filter.$or = [
                { fullName: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } },
            ];
        }

        if (userType) {
            filter.userType = userType;
        }

        const users = await User.find(filter)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .select('-__v');

        const total = await User.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        logger.error('Error searching users:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Update wallet balance
exports.updateWallet = async(req, res) => {
    try {
        const { amount, operation } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (operation === 'add') {
            user.walletBalance += amount;
        } else if (operation === 'subtract') {
            if (user.walletBalance < amount) {
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient balance'
                });
            }
            user.walletBalance -= amount;
        } else {
            return res.status(400).json({
                success: false,
                error: 'Invalid operation'
            });
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Wallet updated',
            data: {
                newBalance: user.walletBalance,
            },
        });
    } catch (error) {
        logger.error('Error updating wallet:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get user by authId
exports.getUserByAuthId = async(req, res) => {
    try {
        const user = await User.findOne({ authId: req.params.authId }).select('-__v');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        logger.error('Error fetching user by authId:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};