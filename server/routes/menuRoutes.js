import express from 'express';
import { protect, authorize, protectGuest } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import * as menuController from '../controllers/menuController.js';

const router = express.Router();

// PUBLIC ROUTE (Guests via QR Code)
router.get('/public', protectGuest, menuController.getPublicMenu);

// 1. Secure all subsequent routes - must have a valid staff token
router.use(protect);

// ==========================================
// 📖 READ ROUTES (Waiters, Kitchen, Managers, Owners)
// ==========================================
router.get('/categories', authorize('OWNER', 'MANAGER', 'WAITER', 'KITCHEN_STAFF'), menuController.getCategories);
router.get('/items', authorize('OWNER', 'MANAGER', 'WAITER', 'KITCHEN_STAFF'), menuController.getMenuItems);

// ==========================================
// ✍️ WRITE ROUTES (Managers & Owners ONLY)
// ==========================================
router.post('/categories', authorize('OWNER', 'MANAGER'), menuController.createCategory);
router.post('/items', authorize('OWNER', 'MANAGER'), upload.single('image'), menuController.createMenuItem);
router.patch('/items/:itemId', authorize('OWNER', 'MANAGER'), upload.single('image'), menuController.updatedMenuItem);
router.delete('/categories/:categoryId', authorize('OWNER', 'MANAGER'), menuController.deleteCategory);
router.delete('/items/:itemId', authorize('OWNER', 'MANAGER'), menuController.deleteMenuItem);

export default router;