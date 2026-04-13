const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class DriverWallet extends Model { }

DriverWallet.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        driverId: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'ID của tài xế'
        },
        balance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Số dư ví hiện tại'
        },
        currency: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'VND'
        },
        status: {
            type: DataTypes.ENUM('ACTIVE', 'SUSPENDED', 'CLOSED'),
            allowNull: false,
            defaultValue: 'ACTIVE'
        }
    },
    {
        sequelize,
        modelName: 'DriverWallet',
        tableName: 'driver_wallets',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['driver_id']
            }
        ]
    }
);

module.exports = DriverWallet;
