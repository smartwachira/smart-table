import { Request, Response } from 'express';
import { col } from 'sequelize';
import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import Venue from '../models/Venue.js';

interface CreateCategoryBody { name: string }

interface MenuPayloadBody {
    name: string;
    price: string | number;
    description?: string;
    category_id: string;
    is_available: string | boolean;
}

// --- CATEGORY MANAGEMENT ---

export const getCategories = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId;
        const categories = await MenuCategory.findAll({
            where: { venue_id: venueId },
            order: [['createdAt', 'ASC']]
        });
        res.status(200).json(categories);

    } catch (error) {
        console.error("Fetch Categories Error:", error);
        res.status(500).json({ message: 'Failed to load menu categories' });
    }
}

export const createCategory = async (req: Request<{}, {}, CreateCategoryBody>, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId;
        const { name } = req.body;

        if (!name) return res.status(400).json({ message: "Category name is required." });

        const newCategory = await MenuCategory.create({ name, venue_id: venueId });

        // ⚡ GLOBAL BROADCAST: Menu Structure Changed
        const io = req.app.get('socketio');
        if (io) io.to(`venue:${venueId}`).emit('menu:updated');

        res.status(201).json(newCategory);
    } catch (error) {
        console.error("Create Category Error:", error);
        res.status(500).json({ message: "Failed to create category." });
    }
};

// --- MENU ITEM MANAGEMENT ---
export const getMenuItems = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId;

        const items = await MenuItem.findAll({
            include: [{
                model: MenuCategory,
                attributes: [],
                where: { venue_id: venueId }
            }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(items);
    } catch (error) {
        console.error("Fetch Menu Items Error:", error);
        res.status(500).json({ message: 'Failed to load menu items.' });
    }
};

export const createMenuItem = async (req: Request<{}, {}, MenuPayloadBody>, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId;
        const { name, price, description, category_id, is_available } = req.body;

        const category = await MenuCategory.findOne({ where: { category_id, venue_id: venueId } });
        if (!category) {
            return res.status(403).json({ message: "Unauthorized category assignment." });
        }

        let image_url = null;
        if (req.file) {
            image_url = `/uploads/${req.file.filename}`;
        }

        const newItem = await MenuItem.create({
            name,
            price: Number(price),
            description,
            category_id,
            is_available: is_available === 'true' || is_available === true,
            image_url
        });

        // ⚡ GLOBAL BROADCAST: New Item Added
        const io = req.app.get('socketio');
        if (io) io.to(`venue:${venueId}`).emit('menu:updated');

        res.status(201).json(newItem);
    } catch (error) {
        console.error("Create Menu Item Error:", error);
        res.status(500).json({ message: "Failed to create menu item." });
    }
};

export const updatedMenuItem = async (req: Request<{ itemId: string }, {}, MenuPayloadBody>, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId;
        const { itemId } = req.params;
        const { name, price, description, category_id, is_available } = req.body;

        const item = await MenuItem.findOne({
            where: { item_id: itemId },
            include: [{
                model: MenuCategory,
                where: { venue_id: venueId }
            }]
        });

        if (!item) return res.status(404).json({ message: "Menu item not found." });

        if (name) item.name = name;
        if (price) item.price = Number(price);
        if (description) item.description = description;
        if (category_id) item.category_id = category_id;

        if (is_available !== undefined) {
            item.is_available = is_available === 'true' || is_available === true;
        }

        if (req.file) {
            item.image_url = `/uploads/${req.file.filename}`;
        }

        await item.save();

        // ⚡ GLOBAL BROADCAST: Item Updated (e.g. 86'd / Sold Out)
        const io = req.app.get('socketio');
        if (io) io.to(`venue:${venueId}`).emit('menu:updated');

        res.status(200).json(item);
    } catch (error) {
        console.error("Update Menu Item Error:", error);
        res.status(500).json({ message: "Failed to update menu item." })
    }
}

// ⚡ POS SPECIFIC ENDPOINTS
export const getPosCategories = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { venueId } = req.params;
        const categories = await MenuCategory.findAll({
            where: { venue_id: venueId },
            order: [['createdAt', 'ASC']]
        });
        return res.status(200).json(categories);
    } catch (error) {
        console.error("Error fetching POS categories:", error);
        return res.status(500).json({ message: "Failed to fetch categories" });
    }
};

export const getPosItems = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { venueId } = req.params;
        
        const items = await MenuItem.findAll({
            where: { is_available: true }, 
            include: [{
                model: MenuCategory,
                attributes: [],
                where: { venue_id: venueId }
            }],
            order: [
                [col('MenuItem.category_id'), 'ASC'],
                [col('MenuItem.name'), 'ASC']
            ]
        });

        return res.status(200).json(items);
    } catch (error) {
        console.error("Error fetching POS items:", error);
        return res.status(500).json({ message: "Failed to fetch items" });
    }
};

// --- PUBLIC CUSTOMER MENU ---
export const getPublicMenu = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.guest?.venueId || req.user?.venueId;

        if (!venueId) {
            return res.status(400).json({ message: "Invalid session context." });
        }

        const venue = await Venue.findByPk(venueId, {
            // ⚡ SPRINT 20 FIX: Exposed Open Tab architectural constraints to the public payload
            attributes: ['name', 'is_accepting_orders', 'tax_rate', 'allow_cash_payments', 'logo_url', 'tab_operating_mode', 'vip_tables']
        });

        const categories = await MenuCategory.findAll({
            where: { venue_id: venueId },
            order: [['createdAt', 'ASC']]
        });

        const items = await MenuItem.findAll({
            where: { is_available: true },
            include: [{
                model: MenuCategory,
                attributes: [],
                where: { venue_id: venueId }
            }],
            order: [
                [col('MenuItem.category_id'), 'ASC'],
                [col('MenuItem.name'), 'ASC']
            ]
        });

        res.status(200).json({ categories, items, venue });
    } catch (error) {
        console.error("Public Menu Fetch Error:", error);
        res.status(500).json({ message: 'Failed to load menu.' })
    }
}

// DELETE CATEGORY
export const deleteCategory = async (req: Request<{ categoryId: string }, {}>, res: Response): Promise<Response | void> => {
    try {
        const { categoryId } = req.params;
        const venueId = req.user!.venueId;

        const category = await MenuCategory.findByPk(categoryId);
        
        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }
        
        if (category.venue_id !== venueId) {
            return res.status(403).json({ message: "Unauthorized to delete this category." });
        }

        const itemsCount = await MenuItem.count({ where: { category_id: categoryId } });
        
        if (itemsCount > 0) {
            return res.status(400).json({ 
                message: "Cannot delete category because it still contains items. Move or delete the items first." 
            });
        }

        await category.destroy();

        // ⚡ GLOBAL BROADCAST: Category Deleted
        const io = req.app.get('socketio');
        if (io) io.to(`venue:${venueId}`).emit('menu:updated');

        res.status(200).json({ message: "Category deleted successfully." });
    } catch (error) {
        console.error("Delete Category Error:", error);
        res.status(500).json({ message: "Failed to delete category." });
    }
};

// DELETE MENU ITEM
export const deleteMenuItem = async (req: Request<{ itemId: string }, {}>, res: Response): Promise<Response | void> => {
    try {
        const { itemId } = req.params;
        const venueId = req.user!.venueId;

        const item = await MenuItem.findByPk(itemId);
        
        if (!item) {
            return res.status(404).json({ message: "Item not found." });
        }

        const category = await MenuCategory.findByPk(item.category_id);
        
        if (!category || category.venue_id !== venueId) {
            return res.status(403).json({ message: "Unauthorized to delete this item." });
        }

        try {
            await item.destroy(); 
            
            // ⚡ GLOBAL BROADCAST: Item Deleted
            const io = req.app.get('socketio');
            if (io) io.to(`venue:${venueId}`).emit('menu:updated');

            res.status(200).json({ message: "Item deleted successfully." });
            
        } catch (dbError: any) {
            if (dbError.name === 'SequelizeForeignKeyConstraintError') {
                return res.status(400).json({ 
                    message: "Cannot delete this item because it is linked to past orders and receipts. Please mark it as 'Sold Out' (Unavailable) instead to preserve your accounting history." 
                });
            }
            throw dbError; 
        }
        
    } catch (error) {
        console.error("Delete Menu Item Error:", error);
        res.status(500).json({ message: "Failed to delete menu item." });
    }
};