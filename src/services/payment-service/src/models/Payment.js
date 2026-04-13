const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Payment extends Model { }

Payment.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        paymentId: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        rideId: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        idempotencyKey: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Unique key to prevent duplicate payment processing'
        },
        pspReference: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Reference ID returned by the PSP (Mock payment gateway)'
        },
        userId: {
            type: DataTypes.STRING(50),
            allowNull: true // Should be false in new records, but true for migration safety
        },
        driverId: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        },
        currency: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'VND'
        },
        paymentMethod: {
            type: DataTypes.ENUM('WALLET', 'CARD', 'CASH'),
            allowNull: false,
            defaultValue: 'CASH'
        },
        status: {
            type: DataTypes.ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED'),
            allowNull: false,
            defaultValue: 'PENDING'
        },
        retryCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Number of times payment has been retried'
        },
        failureReason: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    },
    {
        sequelize,
        modelName: 'Payment',
        tableName: 'payments',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['payment_id']
            },
            {
                unique: true,
                fields: ['ride_id']
            },
            {
                unique: true,
                fields: ['idempotency_key']
            },
            {
                unique: true,
                fields: ['psp_reference']
            }
        ]
    }
);

module.exports = Payment;
