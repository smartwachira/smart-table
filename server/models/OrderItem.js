import sequelize from '../config/db.js';
import { DataTypes } from "sequelize";

const OrderItem = sequelize.define('OrderItem', {
  order_item_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false
  },
  price_at_time: {
    type: DataTypes.DECIMAL(10, 2), // We store the price at purchase time in case menu prices change later
    allowNull: false
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  item_id: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
    timestamps: true, // Adds createdAt and updateAt automatically
    tableName: 'order_items' 
});

// ✅ New
export default OrderItem;