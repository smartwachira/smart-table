import { DataTypes, Model, Optional } from "sequelize";
import sequelize from '../config/db.js';

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'WAITER' | 'KITCHEN_STAFF' | 'GUEST';

export interface UserAttributes {
    user_id: string;
    username: string;
    email?: string | null;
    password?: string | null;
    pin?: string | null;
    role: UserRole;
    is_active: boolean;
    last_login?: Date | null;
    venue_id: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'user_id' | 'role' | 'is_active'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public  user_id!: string;
    public username!: string;
    public email!: string | null;
    public password!: string | null;
    public pin!: string | null;
    public role!: UserRole;
    public is_active!: boolean;
    public last_login!: Date | null;
    public venue_id!: string;

    public readonly created_at!: Date;
    public readonly updated_at!: Date;
}

User.init({
    user_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { isEmail: true }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    pin: {
        type: DataTypes.STRING, 
        allowNull: true,
    },
    role: {
        type: DataTypes.ENUM('OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_STAFF', 'GUEST'),
        defaultValue: 'WAITER',
        allowNull: false
    },
    is_active: {
        type: DataTypes.BOOLEAN, 
        defaultValue: true,
    },
    last_login: {
        type: DataTypes.DATE,
        allowNull: true
    },
    venue_id: {
        type: DataTypes.UUID,
        allowNull: false
    }
}, {
    sequelize,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'users',
});

export default User;