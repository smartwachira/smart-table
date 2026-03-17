import sequelize from '../config/db.js';
import { DataTypes } from "sequelize";

const Order = sequelize.define ('Order', {
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
        
    },
    payment_status: {
        type: DataTypes.ENUM('PENDING','PAID','FAILED'),
        defaultValue: 'PENDING'
    },
    checkout_request_id:{
        type: DataTypes.STRING,
        allowNull: true
    },
    mpesa_receipt: {
        type: DataTypes.STRING, 
        allowNull:true
    }


}, {
    timestamps: true, // Adds createdAt and updateAt automatically
    tableName: 'Orders' 
});

// ✅ New
export default Order;