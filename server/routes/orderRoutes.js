import express from 'express';
const router = express.Router();
import * as orderController from '../controllers/orderControllers.js';

// POST /api/orders
router.post('/', orderController.createOrder);
router.get("/:venueId", orderController.getOrders);
router.put("/:orderId/status", orderController.updateOrderStatus);
router.get("/track/:orderId",orderController.getOrderStatus);

export default router;