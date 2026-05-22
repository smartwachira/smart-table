import express from 'express';
import * as orderController from '../controllers/orderControllers.js';
import { protect, authorize, protectUniversal } from "../middleware/authMiddleware.js"; 

const router = express.Router();

// ============================================================================
// ⚡ STATIC ROUTES (Must be defined first to prevent parameter shadowing)
// ============================================================================

// GET /api/orders/guest (Customers Only)
// Fetches the historical tab/session for a specific device. 
// Note: We use protectUniversal so we can extract the user/guest context.
router.get('/guest', protectUniversal as any, orderController.getGuestOrders as any);

// GET /api/orders/live (Staff Only)
// Standard internal POS route for the Kitchen Display System (KDS)
router.get("/live", protect as any, authorize('OWNER', 'MANAGER', 'KITCHEN_STAFF', 'WAITER') as any, orderController.getOrders as any);

// GET /api/orders/history (Staff Only)
// Standard internal route for analytics and reporting
router.get('/history', protect as any, authorize('OWNER', 'MANAGER') as any, orderController.getHistoricalOrders as any);

router.patch('/tabs/settle', protect as any, authorize('OWNER', 'MANAGER', 'WAITER') as any, orderController.settleOpenTab as any);


// ============================================================================
// ⚡ DYNAMIC ROUTES (Must be defined last)
// ============================================================================

// POST /api/orders (Customers & Staff)
// Polymorphic route for initial order ingestion
router.post('/', protectUniversal as any, orderController.createOrder as any);

// GET /api/orders/:orderId/status (Customers & Staff)
// Polymorphic route for real-time polling updates
router.get('/:orderId/status', protectUniversal as any, orderController.getOrderStatus as any);

// PATCH /api/orders/:orderId/status (Staff Only)
// Updates the state machine (PENDING -> PREPARING -> READY -> COMPLETED)
router.patch("/:orderId/status", protect as any, authorize('OWNER', 'MANAGER', 'KITCHEN_STAFF', 'WAITER') as any, orderController.updateOrderStatus as any);

// PATCH /api/orders/:orderId/collect-cash (Staff Only)
// Cashier/Waiter reconciliation action
router.patch('/:orderId/collect-cash', protect as any, authorize('OWNER', 'MANAGER', 'WAITER') as any, orderController.markCashCollected as any);


export default router;