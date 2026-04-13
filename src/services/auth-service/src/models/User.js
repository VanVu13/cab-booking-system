const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class User extends Model { }

User.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        password_hash: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('PASSENGER', 'DRIVER', 'ADMIN'),
            allowNull: false,
            defaultValue: 'PASSENGER'
        },
        status: {
            // ACTIVE: Can login (Passenger/Admin default, Driver after approval)
            // BLOCKED: Permanently banned
            // PENDING_APPROVAL: New driver waiting for admin review
            // REJECTED: Driver application denied
            // SUSPENDED: Temporarily disabled
            type: DataTypes.ENUM('ACTIVE', 'BLOCKED', 'PENDING_APPROVAL', 'REJECTED', 'SUSPENDED'),
            allowNull: false,
            defaultValue: 'ACTIVE'
        }
    },
    {
        sequelize,
        modelName: 'User',
        tableName: 'users_auth',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

module.exports = User;
