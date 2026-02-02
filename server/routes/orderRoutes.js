import express from 'express';
import router from express.Router();
import orderController from '../controllers/orderControllers';

// POST /api/orders
router.post('/', orderController.createOrder);
router.get("/:venueId", orderController.getOrders);
router.put("/:orderId/status", orderController.updateOrderStatus);
router.get("/track/:orderId",orderController.getOrderStatus);

export default router;