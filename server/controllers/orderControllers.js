import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import MenuItem from '../models/MenuItem.js';
import sequelize from '../config/db.js';
import { request } from 'express';
;



export const createOrder = async (req,res) => {
    const t = await sequelize.transaction(); //Start a "Safety Net"

    try {

        // Collect data from request
        const {venueId,tableNumber, items, total, paymentMethod, customerName } = req.body;

        if (!items || items.length === 0){
            return res.status(400).json({ message: "Cannot place empty order"});
        }

        // 1. Create the Main Order Record
        const newOrder = await Order.create({
            venue_id: venueId,
            customer_name: customerName || `Guest (table ${tableNumber})`,
            table_number: tableNumber,
            total_amount: total,
            payment_method: paymentMethod,
            status: "pending"
        }, {transaction: t}); // pass the transaction object

        // 2. Prepare the Items Data
        const orderItemsData = items.map((item) => ({ 
            order_id: newOrder.order_id,
            item_id: item.item_id,          
            quantity: item.quantity,
            price_at_time: item.price
        }));

        //3. Bulk Insert all Items at once
        await OrderItem.bulkCreate(orderItemsData, { transaction: t});

        // 4. Commit (save) changes.
        await t.commit(); //success

        res.status(201).json({
            message: 'Order placed successfully',
            orderId: newOrder.order_id
        });
       
    } catch (error){
        await t.rollback(); // Failure
        console.error('❌ Order Error:', error);
        res.status(500).json({ message: 'Failed to place order', error: error.message})
    }
};

//Fetch all orders from the database

export const getOrders = async (req, res) => {
  try {
    const { venueId } = req.params;

    const orders = await Order.findAll({
      where: { 
        venue_id: venueId,
        // Only show active orders in the kitchen (hide completed ones)
        status: ['pending', 'preparing', 'ready'] 
      },
      include: [
        {
          model: OrderItem,
          include: [MenuItem] // Include Food Names
        }
      ],
      order: [['createdAt', 'ASC']] // Oldest orders first
    });

    res.json(orders);
  } catch (error) {
    console.error('❌ Get Orders Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
//Update Order status
export const updateOrderStatus = async (req, res) =>{
    try {
        //collect data
        const { orderId} = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'ready','served'];
        if(!validStatuses.includes(status)){
            return res.status(400).json({message: 'Invalid status'});
        }

        //1. Find the order
        const order = await Order.findByPk(orderId);

        if (!order){
            return res.status(404).json({ message: 'Order not found'});

        }
        //2. Update the status

        order.status = status;
        await order.save();

        res.json({message: 'Order updated', order});


    } catch(error){
        console.error('Error updating order:', error);
        res.status(500).json({message: 'Failed to update order'})
    }
};

// 5. TRACK ORDER (For Customer) - FIXED SYNTAX
export const getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, include: [MenuItem] }]
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    console.error('❌ Track Order Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

//DELETE ORDER
export const deleteOrder = async (req,res) => {
  try{
    const { orderId } = req.params;

    // 1. SECURITY CHECK:Only Managers can delete
    if(req.user.role !== 'manager'){
      return res.status(403).json({message: "Access Denied: Managers Only"});
    }

    //2. Find and Destroy
    const order = await Order.findByPk(orderId);
    if(!order) return res.status(404).json({message: "Order not found"});

    //  Because of "Cascade" in our model, 
    // deleting the Order *should* automatically delete the orderItems
    await order.destroy();

    res.json({message: "Order deleted successfully"});
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({message: "Failed to delete order"});
  }

}
