import express from 'express';
import * as orderController from '../controllers/orderControllers.js';
import { protect,protectGuest} from "../middleware/authMiddleware.js" //Middleware
 
const router = express.Router();

// POST /api/orders
//(Customers)
router.post('/', orderController.createOrder);
router.get('/:orderId/status',orderController.getOrderStatus);


//  (Staff Only)
router.patch("/:orderId/status",protect, orderController.updateOrderStatus);
router.get("/live",protect, orderController.getOrders);
router.patch('/:orderId/collect-cash', protect, orderController.markCashCollected);
router.get('/history',protect,orderController.getHistoricalOrders)




export default router;