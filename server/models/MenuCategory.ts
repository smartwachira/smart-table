import { DataTypes, Model, Optional } from "sequelize";
import sequelize from '../config/db.js';

export interface MenuCategoryAttributes {
    category_id: string;
    name: string;
    venue_id: string;
}

export interface MenuCategoryCreationAttributes extends Optional<MenuCategoryAttributes, 'category_id'> {}

class MenuCategory extends Model<MenuCategoryAttributes, MenuCategoryCreationAttributes> implements MenuCategoryAttributes {
    public category_id!: string;
    public name!: string;
    public venue_id!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

MenuCategory.init({
    category_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    venue_id: {
        type: DataTypes.UUID,
        allowNull: false,
    }
}, {
    sequelize,
    timestamps: true,
    tableName: 'menu_categories'
});

export default MenuCategory;