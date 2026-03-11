import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import { v4 as uuidv4 } from 'uuid';

// --- CATEGORY MANAGEMENT ---

export const getCategories = async (req,res) =>{
    try {
        const venueId = req.user.venueId;
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

export const createCategory =async (req,res)=>{
    try{
        const venueId = req.user.venueId;
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
export const getMenuItems = async (req, res) => {
    try {
        const venueId = req.user.venueId;

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

export const createMenuItem = async (req,res)=>{
    try{
        const venueId = req.user.venueId;
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
            price: parseFloat(price),
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

export const updatedMenuItem = async (req,res)=>{
    try {
        const venueId = req.user.venueId;
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
        if (price) item.price = parseFloat(price);
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




