const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define('Order', {
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
    defaultValue: 'pending', // Options: 'pending', 'paid', 'completed'
    allowNull: false
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2), // Stores exact money values (e.g., 1500.00)
    allowNull: false
  },
  payment_method: {
    type: DataTypes.STRING, // 'M-Pesa' or 'Cash'
    allowNull: false
  },
  venue_id: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

module.exports = Order;