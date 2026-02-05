const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DriverProfile = sequelize.define('DriverProfile', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    driverId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        field: 'driver_id'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    licenseNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'license_number'
    },
    vehicleDetails: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'vehicle_details'
    }
}, {
    tableName: 'drivers_profile'
});

module.exports = DriverProfile;
