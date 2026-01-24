const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define ('Order', {
    order_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    table_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending', 
        allowNull: false
    },
    total_amount: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false
    },
    payment_method: {
        type: DataTypes.STRING,
        allowNull: false
    },
    venue_id: {
        type: DataTypes.UUID,
        allowNull: false
    }

});

module.exports  = Order;