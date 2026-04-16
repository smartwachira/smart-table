import express from 'express';
import * as orderController from '../controllers/orderControllers.js';
import { protect,authorize,protectUniversal} from "../middleware/authMiddleware.js" //Middleware
 
const router = express.Router();

// POST /api/orders
//(Customers)
router.post('/',protectUniversal, orderController.createOrder);
router.get('/:orderId/status', protectUniversal, orderController.getOrderStatus);


//  (Staff Only)
router.patch("/:orderId/status",protect,authorize, orderController.updateOrderStatus);
router.get("/live",protect,authorize, orderController.getOrders);
router.patch('/:orderId/collect-cash', protect,authorize, orderController.markCashCollected);
router.get('/history',protect,authorize,orderController.getHistoricalOrders)




export default router;