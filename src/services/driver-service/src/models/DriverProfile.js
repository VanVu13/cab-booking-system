const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class DriverProfile extends Model { }

DriverProfile.init(
    {
        driverId: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            field: 'driver_id'
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        licenseNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'license_number'
        },
        // Vehicle information
        vehicleType: {
            type: DataTypes.ENUM('SEDAN', 'SUV', 'BIKE'),
            allowNull: false,
            field: 'vehicle_type'
        },
        vehiclePlate: {
            type: DataTypes.STRING(20),
            allowNull: false,
            field: 'vehicle_plate'
        },
        vehicleModel: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'vehicle_model'
        },
        vehicleColor: {
            type: DataTypes.STRING(30),
            allowNull: false,
            field: 'vehicle_color'
        },
        // Operational metrics
        rating: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: false,
            defaultValue: 5.00
        },
        totalTrips: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'total_trips'
        },
        isOnline: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_online'
        },
        // Admin info
        rejectionReason: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'rejection_reason'
        }
    },
    {
        sequelize,
        modelName: 'DriverProfile',
        tableName: 'driver_profiles',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

module.exports = DriverProfile;
