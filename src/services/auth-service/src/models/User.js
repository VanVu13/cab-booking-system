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
            type: DataTypes.ENUM('ACTIVE', 'BLOCKED'),
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
