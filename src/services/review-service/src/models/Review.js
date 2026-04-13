const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Review extends Model { }

Review.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        rideId: {
            type: DataTypes.STRING(50),
            allowNull: false
            // Removed unique: true to allow 2 reviews per ride (1 from passenger, 1 from driver)
        },
        userId: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        driverId: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        reviewerRole: {
            type: DataTypes.ENUM('PASSENGER', 'DRIVER'),
            allowNull: false,
            defaultValue: 'PASSENGER'
        },
        rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
                max: 5
            }
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    },
    {
        sequelize,
        modelName: 'Review',
        tableName: 'reviews',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['ride_id', 'reviewer_role'] // Ensure each role reviews a ride only once
            }
        ]
    }
);

module.exports = Review;
