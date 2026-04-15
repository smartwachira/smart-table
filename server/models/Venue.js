import sequelize from '../config/db.js';
import { DataTypes } from "sequelize";



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
    logo_url: {
        type: DataTypes.STRING,
        allowNull: true, // Logo is optional initially
    },
    contact_email:{
        type:DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    phone_number: {
        type: DataTypes.STRING,
        allowNull: true
    },
    qr_code_base_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tax_rate:{
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00
    },
    is_accepting_orders: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    allow_cash_payments:{
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    wifi_ssid: {
        type: DataTypes.STRING,
        allowNull: true
    },
    wifi_password: {
        type: DataTypes.STRING,
        allowNull: true
    },
    shift_duration_hours: {
        type: DataTypes.INTEGER,
        defaultValue: 14,
        allowNull: false
    }
}, {
    timestamps: true, // Adds createdAt and updateAt automatically
    tableName: 'venues' 
});

// ✅ New
export default Venue;
