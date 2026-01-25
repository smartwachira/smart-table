const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const sequelize = require('../config/db');
const { request } = require('express');

exports.createOrder = async (req,res) => {
    const t = await sequelize.transaction(); //Start a "Safety Net"

    try {

        // Collect data from request
        const { venueId, tableNumber, items, total, paymentMethod } = req.body;

        // 1. Create the Main Order Record
        const newOrder = await Order.create({
            venue_id: venueId,
            tableNumber: tableNumber,
            total_amount: total,
            payment_method: paymentMethod,
            status: "pending"
        }, {transaction: t}); // pass the transaction object

        // 2. Prepare the Items Data
    }
}