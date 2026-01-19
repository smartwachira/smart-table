const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const MenuItem = sequelize.define("MenuItem", {
    item_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,

    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    image_url: {
        type: DataTypes.STRING,
        allowNull: true,

    },
    is_available: {
        type: DataTypes.BOOLEAN,
        defaultvalue: true,
    },
    //Foreign Key linking to MenuCategory
    category_id: {
        type: DataTypes.UUID,
        allowNull: false,

    }
}, {
    timestamps: true,
    tableName: "menu_items"
});

module.exports = MenuItem;