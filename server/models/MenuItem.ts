import { DataTypes, Model, Optional } from "sequelize";
import sequelize from '../config/db.js';

export interface MenuItemAttributes {
    item_id: string;
    name: string;
    price: number | null;
    description?: string | null;
    image_url?: string | null;
    is_available: boolean;
    category_id: string;
}

export interface MenuItemCreationAttributes extends Optional<MenuItemAttributes, 'item_id' | 'is_available'> {}

class MenuItem extends Model<MenuItemAttributes, MenuItemCreationAttributes> implements MenuItemAttributes {
    public item_id!: string;
    public name!: string;
    public price!: number | null;
    public description!: string | null;
    public image_url!: string | null;
    public is_available!: boolean;
    public category_id!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

MenuItem.init({
    item_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    image_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    is_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    category_id: {
        type: DataTypes.UUID,
        allowNull: false,
    }
}, {
    sequelize,
    timestamps: true,
    tableName: "menu_items"
});

export default MenuItem;