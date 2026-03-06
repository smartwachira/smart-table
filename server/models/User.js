import sequelize from '../config/db.js';
import { DataTypes } from "sequelize";

const User = sequelize.define("User", {
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
        allowNull: true, // Wait/Kitchen staff do not require emails
        validate: { isEmail:true}
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true, // For Web Dashboard (Owners/Managers)

    },
    pin: {
        type: DataTypes.STRING, 
        allowNull: true, // For Mobile KDS login (Hashed 4-digit PIN)
    },
    role: {
        type: DataTypes.ENUM("OWNER", "MANAGER", "KITCHEN_STAFF", "WAITER"),
        defaultValue: 'WAITER',
        allowNull: false
    },
    is_active: {
        type: DataTypes.BOOLEAN, 
        defaultValue: true, // For Mobile KDS login (Hashed 4-digit PIN)
    },
    last_login: {
        type: DataTypes.DATE, // Maps to TIMESTAMP WITH TIME ZONE
        allowNull: true
    },
    pin: {
        type: DataTypes.STRING, 
        allowNull: true, // For Mobile KDS login (Hashed 4-digit PIN)
    },
    venue_id: {
        type: DataTypes.UUID,
        allowNull: false
    }
},{
    timestamps: true,
    createdAt: 'created_at', // Telling Sequelize to use snake_case to match your SQL
    updatedAt: 'updated_at',
    tableName: 'users',
    indexes: [
        //Multi-tenant isolation: Usernames and Emails are unique only within the specific venue
        {
            name: 'idx_users_venue_role',
            fields: ['venue_id', 'role']
        },
        {
            unique: true,
            fields: ['venue_id','username']
        }
    ]
});

// ✅ New
export default User;