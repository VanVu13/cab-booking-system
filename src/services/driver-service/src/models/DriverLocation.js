const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Driver Location Model
 * Stores real-time GPS location of drivers
 */
const DriverLocation = sequelize.define('DriverLocation', {
    driverId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    lat: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: false
    },
    lng: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('AVAILABLE', 'BUSY', 'OFFLINE'),
        defaultValue: 'AVAILABLE'
    },
    vehicleType: {
        type: DataTypes.ENUM('SEDAN', 'SUV', 'BIKE'),
        defaultValue: 'SEDAN'
    },
    rating: {
        type: DataTypes.DECIMAL(2, 1),
        defaultValue: 4.5
    }
}, {
    tableName: 'drivers_location',
    timestamps: true
});

module.exports = DriverLocation;
