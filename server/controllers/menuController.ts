import { Request, Response } from 'express';
import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import Venue from '../models/Venue.js'

interface CreateCategoryBody { name: string}

interface MenuPayloadBody {
    name: string;
    price: string | number;
    description?: string;
    category_id: string;
    is_available: string |  boolean
}

// --- CATEGORY MANAGEMENT ---

export const getCategories = async (req: Request, res: Response): Promise<Response | void> =>{
    try {
        const venueId = req.user!.venueId;
        const categories = await MenuCategory.findAll({
            where: { venue_id: venueId},
            order: [['createdAt', 'ASC']]
        });
        res.status(200).json(categories)

    } catch(error){
        console.error("Fetch Categories Error:",error);
        res.status(500).json({ message: 'Failed to load menu categories'})
    }
}

export const createCategory =async (req: Request<{}, {}, CreateCategoryBody>, res: Response): Promise<Response | void> =>{
    try{
        const venueId = req.user!.venueId;
        const { name } = req.body;

        if (!name) return res.status(400).json({ message: "Category name is required."});

        const newCategory = await MenuCategory.create({ name, venue_id: venueId});

        res.status(201).json(newCategory);
    } catch (error){
        console.error("Create Category Error:", error);
        res.status(500).json({ message: "Failed to create category."});
    }
};

// --- MENU ITEM MANAGEMENT ---
export const getMenuItems = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId;

        //Fetch items by joining with Categories to ensure we only get this venue's items
        const items = await MenuItem.findAll({
            include: [{
                model: MenuCategory,
                attributes: [],
                where: {venue_id: venueId}
            }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(items);
    } catch (error) {
        console.error("Fetch Menu Items Error:",error);
        res.status(500).json({ message: 'Failed to load menu items.'});
    }
};

export const createMenuItem = async (req: Request<{}, {}, MenuPayloadBody>, res: Response): Promise<Response | void> =>{
    try{
        const venueId = req.user!.venueId;
        const { name, price, description, category_id, is_available} = req.body;

        //Security Check: Prevent IDOR by ensuring the category belongs to this venue
        const category = await MenuCategory.findOne({ where: {category_id, venue_id:venueId}});
        if (!category){
            return res.status(403).json({ message: "Unauthorized category assignment."});
        }

        //Handle the physical file uploaded by Multer
        let image_url = null;
        if (req.file){
            //Save the relative path so the frontend can request it via your static express route
            image_url = `/uploads/${req.file.filename}`;
        }

        const newItem = await MenuItem.create({
            name,
            price: Number(price),
            description,
            category_id,
            // Multer form-data converts booleans to strings ("true"/"false")
            is_available: is_available === 'true' || is_available === true,
            image_url
        });

        res.status(201).json(newItem);
    } catch (error){
        console.error("Create Menu Item Error:", error);
        res.status(500).json({ message: "Failed to create menu item."});
    }
};

export const updatedMenuItem = async (req: Request<{itemId: string}, {}, MenuPayloadBody>, res: Response): Promise<Response | void> =>{
    try {
        const venueId = req.user!.venueId;
        const { itemId } = req.params;
        const { name,price, description, category_id,is_available} = req.body;

        //Find the item,verifying it belongs to the manager's venue via the category relation
        const item = await MenuItem.findOne({
            where: { item_id: itemId},
            include: [{
                model: MenuCategory,
                where: {venue_id: venueId}
            }]
        });

        if (!item) return res.status(404).json({ message: "Menu item not found."});

        //Update fields if they were provided
        if (name) item.name = name;
        if (price) item.price = Number(price);
        if (description) item.description = description;
        if (category_id) item.category_id = category_id;

        //Handle availability toggle (can be sent as string from form or boolean from direct toggle)
        if  (is_available !== undefined){
            item.is_available = is_available === 'true' || is_available === true;
        }

        //Handle a new image upload (overwrite the old image path)
        if (req.file){
            item.image_url = `/uploads/${req.file.filename}`;
            // Pro-tip: In a larger app, you'd use the 'fs' module here to delete the old image file to save server storage!
        }

        await item.save();
        res.status(200).json(item);
    } catch  (error){
        console.error("Update Menu Item Error:",error);
        res.status(500).json({message: "Failed to update menu item."})
    }
}

// ---PUBLIC CUSTOMER MENU ---
export const getPublicMenu = async (req: Request, res: Response): Promise<Response | void> =>{
    try {
        const venueId = req.guest!.venueId;

        if (!venueId) {
            return res.status(400).json({ message: "Invalid session context." });
        }

        //1. Fetch Venue Setting  FIRST
        const venue = await Venue.findByPk(venueId, {
            attributes: ['name','is_accepting_orders','tax_rate','allow_cash_payments','logo_url']
        });

        //2. Fetch Categories for this venue
        const categories = await MenuCategory.findAll({
            where: { venue_id:venueId},
            order: [['createdAt','ASC']]
        });

        //2. Fetch ONLY Available Items for this venue
        const items = await MenuItem.findAll({
            where: {is_available: true},
            include: [{
                model: MenuCategory,
                attributes: [],
                where: { venue_id: venueId}
            }],
            order: [['category_id','ASC'],['name','ASC']]
        });

        res.status(200).json({ categories, items,venue});
    } catch (error){
        console.error("Public Menu Fetch Error:",error);
        res.status(500).json({ message: 'Failed to load menu.'})
    }
}

// ⚡ DELETE CATEGORY (Only if empty)
export const deleteCategory =  async (req: Request<{categoryId: string}, {}>, res: Response): Promise<Response | void> =>{
    try {
        const { categoryId } = req.params;
        const venueId = req.user!.venueId;

        // 1. Find the category and verify ownership securely
        const category = await MenuCategory.findByPk(categoryId);
        
        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }
        
        if (category.venue_id !== venueId) {
            return res.status(403).json({ message: "Unauthorized to delete this category." });
        }

        // 2. Safety Check: Does it contain items? 
        // We only need to check category_id here because we already proved the category belongs to the venue.
        const itemsCount = await MenuItem.count({ where: { category_id: categoryId } });
        
        if (itemsCount > 0) {
            return res.status(400).json({ 
                message: "Cannot delete category because it still contains items. Move or delete the items first." 
            });
        }

        // 3. Execute the safe delete
        await category.destroy();

        res.status(200).json({ message: "Category deleted successfully." });
    } catch (error) {
        console.error("Delete Category Error:", error);
        res.status(500).json({ message: "Failed to delete category." });
    }
};

// ⚡ DELETE MENU ITEM (Safe Delete)
export const deleteMenuItem = async (req: Request<{itemId: string}, {}>, res: Response) : Promise<Response | void> =>{
    try {
        const { itemId } = req.params;
        const venueId = req.user!.venueId;

        // 1. Find the specific menu item
        const item = await MenuItem.findByPk(itemId);
        
        if (!item) {
            return res.status(404).json({ message: "Item not found." });
        }

        // 2. Relational Security Check: Verify the venue owns this item's category
        const category = await MenuCategory.findByPk(item.category_id);
        
        if (!category || category.venue_id !== venueId) {
            return res.status(403).json({ message: "Unauthorized to delete this item." });
        }

        // 3. Attempt the Safe Delete
        try {
            await item.destroy(); 
            res.status(200).json({ message: "Item deleted successfully." });
            
        } catch (dbError: any) {
            // Safety Check: Is it linked to past orders in the OrderItems table?
            if (dbError.name === 'SequelizeForeignKeyConstraintError') {
                return res.status(400).json({ 
                    message: "Cannot delete this item because it is linked to past orders and receipts. Please mark it as 'Sold Out' (Unavailable) instead to preserve your accounting history." 
                });
            }
            throw dbError; // Pass other DB errors to the outer catch block
        }
        
    } catch (error) {
        console.error("Delete Menu Item Error:", error);
        res.status(500).json({ message: "Failed to delete menu item." });
    }
};