const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class UserPaymentMethod extends Model { }

UserPaymentMethod.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        userId: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'ID của người dùng sở hữu thẻ/ví này'
        },
        method: {
            type: DataTypes.ENUM('WALLET', 'CARD'),
            allowNull: false
        },
        token: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Token mã hóa đại diện cho thẻ (do PSP trả về lúc add)'
        },
        last4: {
            type: DataTypes.STRING(4),
            allowNull: true, // Only for CARD
            comment: '4 số cuối của thẻ'
        },
        brand: {
            type: DataTypes.STRING(20),
            allowNull: true, // VISA, MASTERCARD, MOMO, ZALOPAY...
        },
        isDefault: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        status: {
            type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'DELETED'),
            allowNull: false,
            defaultValue: 'ACTIVE'
        }
    },
    {
        sequelize,
        modelName: 'UserPaymentMethod',
        tableName: 'user_payment_methods',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: false,
                fields: ['user_id']
            },
            {
                unique: true,
                fields: ['token']
            }
        ]
    }
);

module.exports = UserPaymentMethod;
