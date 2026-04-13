const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const DriverWallet = require('./DriverWallet');

class WalletTransaction extends Model { }

WalletTransaction.init(
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
            comment: 'ID của tài xế thực hiện giao dịch'
        },
        type: {
            type: DataTypes.ENUM('EARNING', 'WITHDRAWAL', 'PENALTY', 'BONUS'),
            allowNull: false
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'Số tiền thay đổi (+ hoặc -)'
        },
        balanceAfter: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'Số dư của ví sau khi giao dịch này được áp dụng'
        },
        referenceId: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Ví dụ: ID chuyến đi, ID payment, hoặc ID lệnh rút tiền'
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    },
    {
        sequelize,
        modelName: 'WalletTransaction',
        tableName: 'wallet_transactions',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                fields: ['driver_id']
            },
            {
                fields: ['reference_id']
            }
        ]
    }
);

// Mối quan hệ
DriverWallet.hasMany(WalletTransaction, { foreignKey: 'driver_id', sourceKey: 'driverId', as: 'transactions' });
WalletTransaction.belongsTo(DriverWallet, { foreignKey: 'driver_id', targetKey: 'driverId', as: 'wallet' });

module.exports = WalletTransaction;
