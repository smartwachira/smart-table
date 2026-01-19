const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MenuCategory = sequelize.define('MenuCategory',{
    category_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,

    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    //Foreign key linking to venue
    venue_id: {
        type: DataTypes.UUID,
        allowNull: false,
    }

}, {
    timestamps: true,
    tableName: 'menu_categories'
});

module.exports = MenuCategory;