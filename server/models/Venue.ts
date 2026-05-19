import sequelize from '../config/db.js';
import { DataTypes, Model, Optional } from "sequelize";

export type OnboardingStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface VenueAttributes {
    venue_id: string;
    name: string;
    location: string;
    logo_url?: string | null;
    contact_email: string;
    phone_number?: string | null;
    qr_code_base_url?: string | null;
    tax_rate: number;
    is_accepting_orders: boolean;
    allow_cash_payments: boolean;
    shift_duration_hours: number;
    wifi_ssid?: string | null;
    wifi_password?: string | null;
    
    // ⚡ NEW: Secure Financial Routing Columns
    gateway_subaccount_id?: string | null;
    settlement_bank?: string | null;
    account_number_last_4?: string | null;
    is_financially_onboarded: boolean;
    payment_onboarding_status: OnboardingStatus;
}

export interface VenueCreationAttributes extends Optional<VenueAttributes, 
    'venue_id' | 'tax_rate' | 'is_accepting_orders' | 'allow_cash_payments' | 'shift_duration_hours' | 'payment_onboarding_status' | 'is_financially_onboarded'
> {}

class Venue extends Model<VenueAttributes, VenueCreationAttributes> implements VenueAttributes {
    public venue_id!: string;
    public name!: string;
    public location!: string;
    public logo_url!: string | null;
    public contact_email!: string;
    public phone_number!: string | null;
    public qr_code_base_url!: string | null;
    public tax_rate!: number;
    public is_accepting_orders!: boolean;
    public allow_cash_payments!: boolean;
    public shift_duration_hours!: number;
    public wifi_ssid!: string | null;
    public wifi_password!: string | null;

    // ⚡ NEW: Paystack Attributes
    public gateway_subaccount_id!: string | null;
    public settlement_bank!: string | null;
    public account_number_last_4!: string | null;
    public is_financially_onboarded!: boolean;
    public payment_onboarding_status!: OnboardingStatus;
}

Venue.init({
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
        allowNull: true,
    },
    contact_email: {
        type: DataTypes.STRING,
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
    tax_rate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00
    },
    is_accepting_orders: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    allow_cash_payments: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    shift_duration_hours: {
        type: DataTypes.INTEGER,
        defaultValue: 14 
    },
    wifi_ssid: {
        type: DataTypes.STRING,
        allowNull: true
    },
    wifi_password: {
        type: DataTypes.STRING,
        allowNull: true
    },
    gateway_subaccount_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    settlement_bank: {
        type: DataTypes.STRING,
        allowNull: true
    },
    account_number_last_4: {
        type: DataTypes.STRING(4),
        allowNull: true
    },
    is_financially_onboarded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // ⚡ FIX: Replaced ENUM with STRING + Validation for PostgreSQL compatibility
    payment_onboarding_status: {
        type: DataTypes.STRING, 
        defaultValue: 'PENDING',
        validate: {
            isIn: [['PENDING', 'VERIFIED', 'REJECTED']] // ORM-level enforcement
        }
    }
}, {
    sequelize,
    tableName: 'venues',
    timestamps: true
});

export default Venue;