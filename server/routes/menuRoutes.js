import express from 'express';
import { protect,authorize,protectGuest } from '../middleware/authMiddleware.js';
import { upload  } from '../middleware/uploadMiddleware.js';

const router = express.Router();
import * as menuController from '../controllers/menuController.js';

//PUBLIC ROUTE: 
router.get('/public',protectGuest,menuController.getPublicMenu)

// 1. Secure all menu routes - only logged-in staff/managers can access
router.use(protect);
router.use(authorize('OWNER', 'MANAGER'));


// 2. Category Routes
router.get('/categories',menuController.getCategories)
router.post('/categories', menuController.createCategory);

//3. Menu Item Routes
router.get('/items', menuController.getMenuItems);
router.post('/items', upload.single('image'), menuController.createMenuItem);
router.patch('/items/:itemId',upload.single('image'), menuController.updatedMenuItem);
router.delete('/categories/:categoryId', protect, menuController.deleteCategory);
router.delete('/items/:itemId', protect, menuController.deleteMenuItem);

export default router;