import express from 'express';
import * as orderController from '../controllers/orderControllers.js';
import { protect, authorize, protectUniversal } from "../middleware/authMiddleware.js"; 

const router = express.Router();

// GET /api/orders/guest (Customers Only)
router.get('/guest', protectUniversal as any, orderController.getGuestOrders as any);

// GET /api/orders/live (Staff Only)
router.get("/live", protect as any, authorize('OWNER', 'MANAGER', 'KITCHEN_STAFF', 'WAITER') as any, orderController.getOrders as any);

// GET /api/orders/history (Staff Only)
router.get('/history', protect as any, authorize('OWNER', 'MANAGER') as any, orderController.getHistoricalOrders as any);

// ⚡ SPRINT 21: Bulk Tab Settlement Routes
router.patch('/tabs/settle', protect as any, authorize('OWNER', 'MANAGER', 'WAITER') as any, orderController.settleOpenTab as any);
router.patch('/tabs/init-payment', protect as any, authorize('OWNER', 'MANAGER', 'WAITER') as any, orderController.initTabPayment as any);

// POST /api/orders (Customers & Staff)
router.post('/', protectUniversal as any, orderController.createOrder as any);

// Guest-only tab settlement
router.post('/tabs/guest-checkout', protectUniversal as any, orderController.guestTabCheckout as any);

// GET /api/orders/:orderId/status (Customers & Staff)
router.get('/:orderId/status', protectUniversal as any, orderController.getOrderStatus as any);

// PATCH /api/orders/:orderId/status (Staff Only)
router.patch("/:orderId/status", protect as any, authorize('OWNER', 'MANAGER', 'KITCHEN_STAFF', 'WAITER') as any, orderController.updateOrderStatus as any);

// PATCH /api/orders/:orderId/collect-cash (Staff Only)
router.patch('/:orderId/collect-cash', protect as any, authorize('OWNER', 'MANAGER', 'WAITER') as any, orderController.markCashCollected as any);

export default router;