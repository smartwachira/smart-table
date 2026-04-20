import { DataTypes, Model, Optional } from "sequelize";
import sequelize from '../config/db.js';

export interface OrderItemAttributes {
    order_item_id: string;
    quantity: number;
    price_at_time: number;
    order_id: string;
    item_id: string;
}

export interface OrderItemCreationAttributes extends Optional<OrderItemAttributes, 'order_item_id' | 'quantity'> {}

class OrderItem extends Model<OrderItemAttributes, OrderItemCreationAttributes> implements OrderItemAttributes {
    public order_item_id!: string;
    public quantity!: number;
    public price_at_time!: number;
    public order_id!: string;
    public item_id!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

OrderItem.init({
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
        type: DataTypes.DECIMAL(10, 2),
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
    sequelize,
    timestamps: true,
    tableName: 'order_items' 
});

export default OrderItem;