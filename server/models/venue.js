const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); 



// Now this will work:
const Venue = sequelize.define('Venue',{
    venue_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,

    },
    location: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    image_url: {
        type: DataTypes.STRING,
        allowNull: true, // Logo is optional initially
    }
}, {
    timestamps: true, // Adds createdAt and updateAt automatically
    tableName: 'venues' 
});

module.exports = Venue;