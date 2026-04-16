import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import MenuItem from '../models/MenuItem.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import Venue from '../models/Venue.js';
import User from '../models/User.js';

export const createOrder = async (req, res) => {
    const t = await sequelize.transaction(); // Start a "Safety Net"

    try {
        // ⚡ We NO LONGER extract venue_id and table_number blindly from the body!
        const { items, payment_method, customer_name, phone_number } = req.body;

        let venue_id;
        let table_number;
        let staffId = null;

        // ⚡ ZERO-TRUST POLYMORPHIC IDENTITY CHECK
        if (req.guest) {
            // 1. The request came from a customer scanning a QR code
            // We completely ignore req.body and trust ONLY the cryptographically signed token
            venue_id = req.guest.venueId;
            table_number = req.guest.tableName;
            
        } else if (req.user && ['WAITER', 'MANAGER', 'OWNER', 'KITCHEN_STAFF'].includes(req.user.role)) {
            // 2. The request came from a staff member using the POS
            venue_id = req.user.venueId; // Enforce staff can only order for their employed venue
            table_number = req.body.table_number; // Staff must specify which table they are serving
            staffId = req.user.userId || req.user.id; // Log the audit trail
            
        } else {
            // 3. Unrecognized or missing identity
            return res.status(403).json({ message: "Unauthorized order request." });
        }

        if (!venue_id || !table_number) {
            return res.status(400).json({ message: "Missing venue or table identification." });
        }

        // STRICT VALIDATION AGAINST VENUE SETTINGS
        const venue = await Venue.findByPk(venue_id);
        if (!venue) return res.status(404).json({ message: "Venue not found." });

        if (!venue.is_accepting_orders) {
            return res.status(403).json({ message: 'This venue is currently not accepting orders.' });
        }

        if (payment_method === 'CASH' && !venue.allow_cash_payments) {
            return res.status(400).json({ message: 'Cash payments are disabled for this venue.' });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Cannot place empty order" });
        }

        // Fetch all requested items from the database to verify prices securely
        const itemIds = items.map(item => item.item_id);
        const dbItems = await MenuItem.findAll({ where: { item_id: itemIds } });

        let trueTotalAmount = 0;

        const validatedItems = items.map((clientItem) => {
            const realItem = dbItems.find(dbI => dbI.item_id === clientItem.item_id);
            if (!realItem) throw new Error(`Item ${clientItem.item_id} not found`);

            trueTotalAmount += Number(realItem.price) * clientItem.quantity;

            return {
                item_id: realItem.item_id,
                quantity: clientItem.quantity,
                price_at_time: realItem.price
            };
        });

        // Create the Main Order Record
        const newOrder = await Order.create({
            venue_id, // Safely extracted from token
            staff_id: staffId, // Null for guests, populated for staff
            customer_name: customer_name || (staffId ? `Walk-in (Staff)` : `Guest (table ${table_number})`),
            table_number, // Safely extracted from token OR staff input
            phone_number,
            total_amount: trueTotalAmount,
            payment_method,
            status: 'PENDING',
            payment_status: payment_method === 'CASH' ? 'PENDING' : 'PENDING'
        }, { transaction: t });

        const orderItemsData = validatedItems.map(item => ({
            ...item,
            order_id: newOrder.order_id || newOrder.getDataValue('order_id')
        }));

        // Bulk Insert all Items at once
        await OrderItem.bulkCreate(orderItemsData, { transaction: t });

        // Commit (save) changes
        await t.commit();

        // BROADCAST: to socket system
        const io = req.app.get('socketio');
        if (io) {
            io.to(venue_id).emit('receive_order', {
                order: newOrder,
                items: items
            });
        }

        res.status(201).json({
            message: 'Order placed successfully',
            orderId: newOrder.order_id || newOrder.getDataValue('order_id'),
            amount: trueTotalAmount
        });

    } catch (error) {
        await t.rollback(); // Failure
        console.error('❌ Order Error:', error);
        res.status(500).json({ message: 'Failed to place order', error: error.message });
    }
};

// Fetch live active orders AND today's completed orders (For the KDS Recall Tab)
export const getOrders = async (req, res) => {
    try {
        const venueId = req.user.venueId; 
        
        //Fetch the venue's custom rolling window setting
        const venue = await Venue.findByPk(venueId, { attributes: ['shift_duration_hours'] });
        const shiftHours = venue?.shift_duration_hours || 14; // Fallback to 14 if undefined
        
        const rollingWindow = new Date();
        rollingWindow.setHours(rollingWindow.getHours() - shiftHours);

        const orders = await Order.findAll({
            where: {
                venue_id: venueId,
                [Op.and]: [
                    {
                        [Op.or]: [
                            { status: { [Op.in]: ['PENDING', 'PREPARING', 'READY'] } },
                            { 
                                status: { [Op.in]: ['COMPLETED', 'CANCELLED'] },
                                updatedAt: { [Op.gte]: rollingWindow } 
                            }
                        ]
                    },
                    {
                        [Op.or]: [
                            { payment_status: 'PAID' },
                            { payment_method: 'CASH' } 
                        ]
                    }
                ]
            },
            include: [
                {
                    model: OrderItem,
                    include: [MenuItem] 
                },
                {
                    model: User, 
                    as: 'CashCollector', 
                    // ⚡ FIX: Double brackets create an alias -> Fetches 'username' but outputs it as 'name'
                    attributes: [['username', 'name']] 
                }
            ],
            order: [['createdAt', 'ASC']] // Oldest orders first (FIFO)
        });

        res.status(200).json(orders);

    } catch (error) {
        console.error('❌ Get Orders Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update Order status (State Machine)
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, cancelReason } = req.body;
        const venueId = req.user.venueId;

        const validStates = ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
        
        if (!status) return res.status(400).json({ message: "Status is required." });

        const upperStatus = status.toUpperCase();

        if (!validStates.includes(upperStatus)) {
            return res.status(400).json({ 
                message: `Invalid status transition. Allowed status: ${validStates.join(', ')}` 
            });
        }

        const order = await Order.findOne({ where: { order_id: orderId, venue_id: venueId } });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // ⚡ REVENUE LEAKAGE FIX: Prevent completing an unpaid order
        if (upperStatus === 'COMPLETED' && order.payment_status !== 'PAID') {
            return res.status(403).json({ 
                message: "Order cannot be completed until payment is received (Mark as Cash Collected or await M-Pesa)." 
            });
        }

        // Only Managers/Owners should cancel orders
        if (upperStatus === 'CANCELLED' && !['MANAGER', 'OWNER'].includes(req.user.role)) {
            return res.status(403).json({ message: "Only managers can cancel active orders." });
        }

        order.status = upperStatus;
        
        if (upperStatus === 'CANCELLED') {
            const reasonText = cancelReason || 'No reason provided';
            order.notes = order.notes ? `${order.notes} | Cancelled: ${reasonText}` : `Cancelled: ${reasonText}`;
        }
        
        await order.save();

        const io = req.app.get('socketio');
        if (io) {
            io.to(venueId).emit("orderUpdated", {
                newStatus: upperStatus,
                orderId: order.order_id
            });
        }

        res.json({ message: 'Order updated', order });

    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Failed to update order' });
    }
};

// TRACK ORDER (For Customer)
export const getOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findByPk(orderId, {
            include: [{ model: OrderItem, include: [MenuItem] }]
        });

        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.status(200).json(order);
    } catch (error) {
        console.error('❌ Track Order Error:', error);
        res.status(500).json({ message: 'Failed to check order status.' });
    }
};

// ⚡ SECURE CASH COLLECTION
export const markCashCollected = async (req, res) => {
    try {
        const { orderId } = req.params;
        const venueId = req.user.venueId;
        // Safeguard: use userId or id depending on your JWT payload structure
        const staffId = req.user.userId || req.user.id; 

        const order = await Order.findOne({ where: { order_id: orderId, venue_id: venueId } });

        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.payment_method !== 'CASH') return res.status(400).json({ message: 'Not a cash order' });
        if (order.payment_status === 'PAID') return res.status(400).json({ message: 'Cash already collected' });

        // Update status and stamp the audit trail
        order.payment_status = 'PAID';
        order.cash_collected_by = staffId; 

        // Fetch the EXACT name from the database to guarantee integrity
        const staffMember = await User.findByPk(staffId, { attributes: ['username'] });

        // Attach the exact DB name to the response object using the 'name' property expected by frontend
        const updatedOrderData = order.toJSON();
        updatedOrderData.CashCollector = { name: staffMember?.username || 'Unknown Staff' };
        
        await order.save();

        const io = req.app.get('socketio');
        if (io) {
            io.to(venueId).emit("orderUpdated", { orderId: order.order_id });
        }

        res.json({ message: 'Cash collected and logged successfully', order: updatedOrderData });

    } catch (error) {
        console.error('Error collecting cash:', error);
        res.status(500).json({ message: 'Failed to process cash collection' });
    }
};

// ⚡ FETCH HISTORICAL ORDERS (For Management Audits)
export const getHistoricalOrders = async (req, res) => {
    try {
        const venueId = req.user.venueId;
        const { startDate, endDate } = req.query;

        // Construct the date filter securely
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                }
            };
        }

        const orders = await Order.findAll({
            where: {
                venue_id: venueId,
                ...dateFilter // Apply temporal date filtering
            },
            include: [
                {
                    model: OrderItem,
                    include: [MenuItem] 
                },
                {
                    model: User, 
                    as: 'CashCollector', 
                    attributes: [['username', 'name']] 
                }
            ],
            order: [['createdAt', 'DESC']] // Newest first for auditing
        });

        res.status(200).json(orders);

    } catch (error) {
        console.error('❌ Get History Error:', error);
        res.status(500).json({ message: 'Failed to fetch order history' });
    }
};