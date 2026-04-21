import express from 'express';
import { protect, authorize, protectUniversal } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import * as menuController from '../controllers/menuController.js';

const router = express.Router();

router.get('/public', protectUniversal as any, menuController.getPublicMenu as any);

router.use(protect as any);

router.get('/categories', authorize('OWNER', 'MANAGER', 'WAITER', 'KITCHEN_STAFF') as any, menuController.getCategories as any);
router.get('/items', authorize('OWNER', 'MANAGER', 'WAITER', 'KITCHEN_STAFF') as any, menuController.getMenuItems as any);

router.post('/categories', authorize('OWNER', 'MANAGER') as any, menuController.createCategory as any);
router.post('/items', authorize('OWNER', 'MANAGER') as any, upload.single('image'), menuController.createMenuItem as any);
router.patch('/items/:itemId', authorize('OWNER', 'MANAGER') as any, upload.single('image'), menuController.updatedMenuItem as any);
router.delete('/categories/:categoryId', authorize('OWNER', 'MANAGER') as any, menuController.deleteCategory as any);
router.delete('/items/:itemId', authorize('OWNER', 'MANAGER') as any, menuController.deleteMenuItem as any);

export default router;