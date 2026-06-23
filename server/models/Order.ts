import { DataTypes, Model, Optional } from "sequelize";
import sequelize from '../config/db.js';

// ⚡ SPRINT 21 FIX: Added 'UNPAID_TAB' to PaymentStatus and 'TAB' to PaymentMethod
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'UNPAID_TAB';
export type PaymentMethod = 'CASH' | 'M-PESA' | 'AIRTEL' | 'CARD' | 'TAB';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled' | 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
export interface OrderAttributes {
    order_id: string;
    customer_name: string;
    table_number: string;
    status: OrderStatus | string; 
    total_amount: number;
    payment_method: PaymentMethod | string;
    venue_id: string;
    phone_number?: string | null;
    payment_status: PaymentStatus | string;
    checkout_request_id?: string | null;
    mpesa_receipt?: string | null;
    notes?: string | null;
    cash_collected_by?: string | null;
    staff_id?: string | null;
    guest_session_id?: string | null;
    gateway_reference?: string | null;
    gateway_fee: number;
    platform_fee: number;

    
}

export interface OrderCreationAttributes extends Optional<OrderAttributes, 
    'order_id' | 'status' | 'payment_status' | 'gateway_fee' | 'platform_fee'
> {}

// ⚡ SPRINT 21 FIX: Explicitly declaring ALL properties so TypeScript stops throwing errors in the controllers
class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
    public order_id!: string;
    public customer_name!: string;
    public table_number!: string;
    public status!: OrderStatus | string;
    public total_amount!: number;
    public payment_method!: PaymentMethod | string; // Type-safe property
    public venue_id!: string;
    public phone_number!: string | null;
    public payment_status!: PaymentStatus | string; // Type-safe property
    public checkout_request_id!: string | null;
    public mpesa_receipt!: string | null;
    public gateway_reference!: string | null;
    public notes!: string | null;
    public cash_collected_by!: string | null;
    public staff_id!: string | null;
    public guest_session_id!: string | null; 
    public gateway_fee!: number;
    public platform_fee!: number;

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
        defaultValue: 'PENDING', 
        allowNull: false
    },
    total_amount: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false
    },
    payment_method: {
        // ⚡ Added 'TAB' to the DB ENUM as well
        type: DataTypes.ENUM('CASH', 'M-PESA','AIRTEL', 'CARD', 'TAB'),
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
        type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'UNPAID_TAB'),
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
    gateway_reference: {
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
    },
    guest_session_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    gateway_fee: {
        type: DataTypes.DECIMAL(10,2),
        defaultValue: 0.00
    },
    platform_fee: {
        type: DataTypes.DECIMAL(10,2),
        defaultValue: 0.00
    }
}, {
    sequelize,
    timestamps: true,
    tableName: 'Orders' 
});

export default Order;