const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const sequelize = require('../config/db');
const { request } = require('express');

exports.createOrder = async (req,res) => {
    const t = await sequelize.transaction(); //Start a "Safety Net"

    try {

        // Collect data from request
        const { venueId, tableNumber, items, total, paymentMethod } = req.body;

        if (!items || items.length === 0){
            return res.status(400).json({ message: "Cannot place empty order"});
        }

        // 1. Create the Main Order Record
        const newOrder = await Order.create({
            venue_id: venueId,
            tableNumber: tableNumber,
            total_amount: total,
            payment_method: paymentMethod,
            status: "pending"
        }, {transaction: t}); // pass the transaction object

        // 2. Prepare the Items Data
        const orderItemsData = items.map(item = ({
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