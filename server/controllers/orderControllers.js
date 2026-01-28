const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const sequelize = require('../config/db');
const { request } = require('express');


exports.createOrder = async (req,res) => {
    const t = await sequelize.transaction(); //Start a "Safety Net"

    try {

        // Collect data from request
        const {tableNumber, items, total, paymentMethod } = req.body;

        console.log("DEBUG BODY:", req.body)

        const { venueId } = req.body;
       

        if (!items || items.length === 0){
            return res.status(400).json({ message: "Cannot place empty order"});
        }

        // 1. Create the Main Order Record
        const newOrder = await Order.create({
            venue_id: venueId,
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
        console.error('Order Error:', error);
        res.status(500).json({ message: 'Failed to place order', error: error.message})
    }
};

//Fetch all orders from the database

exports.getOrders = async (req, res) => {
    try {
        const { venueId } = req.params;

        const orders = await Order.findAll({
            where: {venue_id: venueId},
            include: [
                {model: OrderItem,
                    include: [
                        { model: require('../models/MenuItem') }//Include the name of the items
                    ]
                }
            ],
            order: [['createdAt', 'DESC']], //newest orders first
            limit: 50,
            offset: 0
        });

        res.json(orders);
    } catch (error){
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders'});
    }
}