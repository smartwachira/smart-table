import { DataTypes, Model, Optional } from "sequelize";
import sequelize from '../config/db.js';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderAttributes {
    order_id: string;
    customer_name: string;
    table_number: string;
    status: OrderStatus | string; 
    total_amount: number;
    payment_method: string;
    venue_id: string;
    phone_number?: string | null;
    payment_status: PaymentStatus;
    checkout_request_id?: string | null;
    mpesa_receipt?: string | null;
    notes?: string | null;
    cash_collected_by?: string | null;
    staff_id?: string | null;
}

export interface OrderCreationAttributes extends Optional<OrderAttributes, 'order_id' | 'status' | 'payment_status'> {}

class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
    public order_id!: string;
    public customer_name!: string;
    public table_number!: string;
    public status!: OrderStatus | string;
    public total_amount!: number;
    public payment_method!: string;
    public venue_id!: string;
    public phone_number!: string | null;
    public payment_status!: PaymentStatus;
    public checkout_request_id!: string | null;
    public mpesa_receipt!: string | null;
    public notes!: string | null;
    public cash_collected_by!: string | null;
    public staff_id!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Order.init({
    order_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    customer_name: {
        type: DataTypes.STRING,
        allowNull: false
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
    },
    phone_number: {
        type: DataTypes.STRING,
        allowNull: true
    },
    payment_status: {
        type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED'),
        defaultValue: 'PENDING'
    },
    checkout_request_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mpesa_receipt: {
        type: DataTypes.STRING, 
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    cash_collected_by: {
        type: DataTypes.UUID,
        allowNull: true
    },
    staff_id: {
        type: DataTypes.UUID,
        allowNull: true,
    }
}, {
    sequelize,
    timestamps: true,
    tableName: 'Orders' // Note: Ensure casing matches your DB structure
});

export default Order;