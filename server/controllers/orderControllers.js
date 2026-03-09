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
        const {venue_id,table_number, items, payment_method, customer_name,phone_number } = req.body;

        if (!items || items.length === 0){
            return res.status(400).json({ message: "Cannot place empty order"});
        }

        //Fetch all requested items from the database to verify prices
        const itemIds = items.map(item=>item.item_id);
        const dbItems = await MenuItem.findAll({ where: {item_id: itemIds}});

        //Calculate the TRUE total amount on the server
        let trueTotalAmount = 0;

    

        // Prepare the Items Data
        const validatedItems = items.map((clientItem) => {
          const realItem = dbItems.find(dbI =>dbI.item_id === clientItem.item_id);
          if (!realItem) throw new Error(`Item ${clientItem.item_id} not found`);

          trueTotalAmount = Number(realItem.price) * clientItem.quantity;
          

          return {
            item_id: realItem.item_id,
            quantity: clientItem.quantity,
            price_at_time: realItem.price
          }
        });

        // Create the Main Order Record
        const newOrder = await Order.create({
            venue_id,
            customer_name: customer_name || `Guest (table ${table_number})`,
            table_number,
            phone_number,
            total_amount: trueTotalAmount,
            payment_method,
            status: 'PENDING'
        }, {transaction: t}); // pass the transaction object

        const orderItemsData = validatedItems.map(item => ({
            ...item,
            order_id: newOrder.id || newOrder.order_id || newOrder.getDataValue('order_id')
        }));

        //3. Bulk Insert all Items at once
        await OrderItem.bulkCreate(orderItemsData, { transaction: t});

        // 4. Commit (save) changes.
        await t.commit(); //success

        //BROADCAST: to socket system
        const io = req.app.get('socketio');
        if (io){
          io.to(venue_id).emit('receive_order',{
            order: newOrder,
            items: items
          });
        }

        res.status(201).json({
            message: 'Order placed successfully',
            orderId: newOrder.order_id || newOrder.id,
            amount: trueTotalAmount
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
    const { venueId } = req.user;

    const orders = await Order.findAll({
      where: { 
        venue_id: venueId,
        // Only show active orders in the kitchen (hide completed ones)
        status: ['PENDING', 'PREPARING', 'READY'] 
      },
      include: [
        {
          model: OrderItem,
          include: [MenuItem] // Include Food Names
        }
      ],
      order: [['createdAt', 'ASC']] // Oldest orders first
    });

    res.status(200).json(orders);
    
  } catch (error) {
    console.error('❌ Get Orders Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
//Update Order status
export const updateOrderStatus = async (req, res) =>{
    try {
        //collect data
        
        const { orderId,status, cancelReason } = req.body;
        const { venueId } = req.user;



        const validStatuses = ['PENDING', 'PREPARING', 'READY'];
        if(!validStatuses.includes(status)){
            return res.status(400).json({message: 'Invalid status'});
        }

        //1. Find the order
        const order = await Order.findOne({ where: { order_id: orderId, venue_id: venueId}});

        if (!order){
            return res.status(404).json({ message: 'Order not found'});

        }

        //Only Managers/Owners should cancel orders, Waiters/Kitchen can only move forward
        if (status === 'CANCELLED' && !['MANAGER', 'OWNER'].includes(req.user.role)){
          return res.status(403).json({ message: "Only managers can cancel active orders."});
        }
        //2. Update the status

        order.status = status;
        if (status === 'CANCELLED'){
          order.notes = order.notes ? `${order.notes} | Cancelled: ${cancelReason}` : `Cancelled: ${cancelReason}`
          // NOTE: In production, trigger M-Pesa reversal or Void Ledger entry here
        };
        await order.save();

        const io = req.app.get('socketio')

        io.to(venueId).emit("update-order-status",{
          newStatus: status,
          orderId: order.orderId
        })

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



