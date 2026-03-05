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
        type: DataTypes.ENUM("OWNER", "MANAGER", "KITCHEN_STAFF", "WAIT_STAFF"),
        defaultValue: 'WAIT_STAFF',
        allowNull: false
    },
    venue_id: {
        type: DataTypes.UUID,
        allowNull: false
    }
},{
    timestamps: true,
    tableName: 'users',
    indexes: [
        //Multi-tenant isolation: Usernames and Emails are unique only within the specific venue
        {
            unique: true,
            fields: ['venue_id', 'username']
        },
        {
            unique: true,
            fields: ['venue_id','email']
        }
    ]
});

// ✅ New
export default User;