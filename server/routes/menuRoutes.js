import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { upload  } from '../middleware/uploadMiddleware.js';

const router = express.Router();
import * as menuController from '../controllers/menuController.js';

// 1. Secure all menu routes - only logged-in staff/managers can access
router.use(protect)

// 2. Category Routes
router.get('/categories',menuController.getCategories)
router.post('/categories', menuController.createCategory);

//3. Menu Item Routes
router.get('/items', menuController.getMenuItems);

// ⚡ The crucial part: upload.single('image') intercepts the request, saves the file to disk, 
// and attaches the file data to req.file before passing it to createMenuItem.
// 'image' MUST exactly match the key used in React: payload.append('image', imageFile)
router.post('/items', upload.single('image'), menuController.createMenuItem);

// PATCH is better than PUT for partial updates (like just toggling availability)
router.patch('/items/:itemId',upload.single('image'), menuController.updatedMenuItem);

export default router;