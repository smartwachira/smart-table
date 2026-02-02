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
        unique: true // No two staff members can have the same username
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false

    },
    role: {
        type: DataTypes.ENUM("manager","kitchen","waiter"),
        defaultValue: 'waiter',
        allowNull: false
    },
    venue_id: {
        type: DataTypes.UUID,
        allowNull: false
    }
});

// ✅ New
export default User;