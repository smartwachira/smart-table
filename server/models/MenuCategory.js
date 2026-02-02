import sequelize from '../config/db.js';
import { DataTypes } from "sequelize";

const MenuCategory = sequelize.define('MenuCategory',{
    category_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,

    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    //Foreign key linking to venue
    venue_id: {
        type: DataTypes.UUID,
        allowNull: false,
    }

}, {
    timestamps: true,
    tableName: 'menu_categories'
});

// ✅ New
export default MenuCategory;