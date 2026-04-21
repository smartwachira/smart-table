import express from 'express';
import * as orderController from '../controllers/orderControllers.js';
import { protect, authorize, protectUniversal } from "../middleware/authMiddleware.js"; 
 
const router = express.Router();

// POST /api/orders (Customers & Staff)
// Polymorphic route protected by the Universal middleware
router.post('/', protectUniversal as any, orderController.createOrder as any);
router.get('/:orderId/status', protectUniversal as any, orderController.getOrderStatus as any);

// PATCH & GET (Staff Only)
// Standard internal POS routes protected by strict Auth and RBAC
router.patch("/:orderId/status", protect as any, authorize('OWNER', 'MANAGER', 'KITCHEN_STAFF', 'WAITER') as any, orderController.updateOrderStatus as any);
router.get("/live", protect as any, authorize('OWNER', 'MANAGER', 'KITCHEN_STAFF', 'WAITER') as any, orderController.getOrders as any);
router.patch('/:orderId/collect-cash', protect as any, authorize('OWNER', 'MANAGER', 'WAITER') as any, orderController.markCashCollected as any);
router.get('/history', protect as any, authorize('OWNER', 'MANAGER') as any, orderController.getHistoricalOrders as any);

export default router;