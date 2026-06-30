import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db.js";

export interface TransactionLedgerAttributes {
    transaction_id: string;
    order_id: string;
    amount_paid:number;
    payment_method: 'CASH' | 'M-PESA' | 'AIRTEL' | 'CARD' | 'TAB';
    gateway_reference?: string | null;
    staff_id?: string | null;
}

export interface  TransactionLedgerCreationAttributes extends Optional<TransactionLedgerAttributes, 'transaction_id'> {}

class TransactionLedger extends Model<TransactionLedgerAttributes, TransactionLedgerCreationAttributes> implements TransactionLedgerAttributes {
    public transaction_id!: string;
    public order_id!: string;
    public amount_paid!: number;
    public payment_method!: 'CASH' | 'M-PESA' | 'AIRTEL' | 'CARD' | 'TAB';
    public gateway_reference!: string | null;
    public staff_id!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

TransactionLedger.init({
    transaction_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    order_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    amount_paid: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false
    },
    payment_method: {
        type: DataTypes.ENUM('CASH', 'M-PESA', 'AIRTEL', 'CARD', 'TAB'),
        allowNull: false
    },
    gateway_reference: {
        type: DataTypes.STRING,
        allowNull: true
    },
    staff_id: {
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    sequelize,
    timestamps: true,
    tableName: 'TransactionLedgers'
});

export default TransactionLedger;