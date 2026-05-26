import { Request, Response } from 'express';
import { Server } from 'socket.io';
import axios from 'axios';
import Order, { OrderStatus } from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import MenuItem from '../models/MenuItem.js';
import sequelize from '../config/db.js';
import { Op, literal } from 'sequelize';
import Venue from '../models/Venue.js';
import User from '../models/User.js';

interface OrderItemPayload {
    item_id: string;
    quantity: number;
}

interface CreateOrderBody {
    items: OrderItemPayload[];
    payment_method: string;
    customer_name?: string;
    phone_number?: string;
    table_number?: string;
}

interface updateOrderStatusBody {
    status: OrderStatus | string;
    cancelReason?: string;
}

interface HistoricalOrdersQuery {
    startDate?: string;
    endDate?: string;
}

interface SettleTabBody {
    table_number?: string;
    settlement_method: 'CASH' | 'CARD' | 'M-PESA';
    orderIds?: string[];
    phone?: string;
    provider?: string;
}

export const createOrder = async (req: Request<{}, {}, CreateOrderBody>, res: Response): Promise<Response | void> => {
    const t = await sequelize.transaction(); 

    try {
        const { items, payment_method, customer_name, phone_number } = req.body;
        const guestSessionId = req.headers['x-guest-id'] as string | undefined;
        
        let venue_id: string;
        let table_number: string;
        let staffId: string | null = null;

        if (req.guest) {
            venue_id = req.guest.venueId;
            table_number = req.guest.tableName;
        } else if (req.user && ['WAITER', 'MANAGER', 'OWNER', 'KITCHEN_STAFF'].includes(req.user.role)) {
            venue_id = req.user.venueId; 
            table_number = req.body.table_number as string; 
            staffId = (req.user as any).userId || (req.user as any).id || (req.user as any).user_id || null; 
        } else {
            return res.status(403).json({ message: "Unauthorized order request." });
        }

        if (!venue_id || !table_number) {
            return res.status(400).json({ message: "Missing venue or table identification." });
        }

        const venue = await Venue.findByPk(venue_id);
        if (!venue) return res.status(404).json({ message: "Venue not found." });

        if (!venue.is_accepting_orders) {
            return res.status(403).json({ message: 'This venue is currently not accepting orders.' });
        }

        if (payment_method === 'CASH' && !venue.allow_cash_payments) {
            return res.status(400).json({ message: 'Cash payments are disabled for this venue.' });
        }

        // ⚡ SPRINT 21: Backend Enforcement of VIP Routing
        if (payment_method === 'TAB') {
            const isTabAllowed = venue.tab_operating_mode === 'ENABLED_ALL' || 
                (venue.tab_operating_mode === 'VIP_ONLY' && 
                 Array.isArray(venue.vip_tables) && 
                 venue.vip_tables.map(t => t.toLowerCase()).includes(table_number.toLowerCase().trim()));
            
            if (!isTabAllowed) {
                return res.status(403).json({ message: 'Open tabs are strictly not permitted for this table designation.' });
            }
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Cannot place empty order" });
        }

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
                price_at_time: realItem.price || 0
            };
        });

        const newOrder = await Order.create({
            venue_id, 
            staff_id: staffId || null, 
            customer_name: customer_name || (staffId ? `Walk-in (Staff)` : `Guest (table ${table_number})`),
            table_number, 
            phone_number: phone_number || null,
            total_amount: trueTotalAmount,
            payment_method,
            status: 'PENDING', 
            payment_status: 'PENDING',
            guest_session_id: guestSessionId || null,
            gateway_fee: 0, 
            platform_fee: 0 
        }, { transaction: t });

        const orderItemsData = validatedItems.map(item => ({
            ...item,
            order_id: newOrder.order_id || newOrder.getDataValue('order_id')
        }));

        await OrderItem.bulkCreate(orderItemsData, { transaction: t });
        await t.commit();

        const io = req.app.get('socketio');
        if (io) {
            io.to(`venue:${venue_id}`).emit('order:created', {
                order: newOrder,
                items: items
            });
        }

        res.status(201).json({
            message: 'Order placed successfully',
            orderId: newOrder.order_id || newOrder.getDataValue('order_id'),
            amount: trueTotalAmount
        });

    } catch (error: any) {
        await t.rollback(); 
        console.error('❌ Order Error:', error);
        res.status(500).json({ message: 'Failed to place order', error: error.message });
    }
};

export const getOrders = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId; 
        
        const venue = await Venue.findByPk(venueId);
        const shiftHours = venue?.shift_duration_hours || 14; 
        
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
                            { payment_method: { [Op.in]: ['CASH', 'TAB'] } }
                        ]
                    }
                ]
            } as any,
            include: [
                {
                    model: OrderItem,
                    include: [MenuItem] 
                },
                {
                    model: User, 
                    as: 'CashCollector'
                }
            ],
            order: [['createdAt', 'ASC']] 
        });

        const safeOrders = orders.map(order => {
            const orderJson = order.toJSON() as any;
            if (orderJson.CashCollector) {
                orderJson.CashCollector.name = orderJson.CashCollector.name || orderJson.CashCollector.username || 'Staff';
            }
            return orderJson;
        });

        res.status(200).json(safeOrders);

    } catch (error) {
        console.error('❌ Get Orders Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateOrderStatus = async (req: Request<{orderId: string}, {}, updateOrderStatusBody>, res: Response) => {
    try {
        const { orderId } = req.params;
        const { status, cancelReason } = req.body;
        const venueId = req.user!.venueId;

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

        // ⚡ SPRINT 21 FIX: Decoupling Fulfillment from Settlement
        // Allow the kitchen/waiters to mark food as 'COMPLETED' (Served) if it is a TAB or CASH order.
        // It will safely route to the "Awaiting Settlement" tab on the frontend.
        if (upperStatus === 'COMPLETED' && order.payment_status !== 'PAID' && !['TAB', 'CASH'].includes(order.payment_method as string)) {
            return res.status(403).json({ 
                message: "Order cannot be marked served until the digital payment is successfully verified." 
            });
        }

        if (upperStatus === 'CANCELLED' && !['MANAGER', 'OWNER'].includes(req.user!.role)) {
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
            if (upperStatus === 'CANCELLED') {
                io.to(`venue:${venueId}`).emit("order:cancelled", { orderId: order.order_id, reason: cancelReason });
                io.to(`order:${order.order_id}`).emit("order:cancelled", { orderId: order.order_id, reason: cancelReason });
            } else {
                io.to(`venue:${venueId}`).emit("order:status_updated", { newStatus: upperStatus, orderId: order.order_id });
                io.to(`order:${order.order_id}`).emit("order:status_updated", { newStatus: upperStatus, orderId: order.order_id });
            }
        }

        res.json({ message: 'Order updated', order });

    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Failed to update order' });
    }
};

export const getOrderStatus = async (req: Request<{orderId: string}, {}>, res: Response): Promise<Response | void> => {
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

export const markCashCollected = async (req: Request<{orderId: string}, {}>, res: Response): Promise<Response | void> => {
    try {
        const { orderId } = req.params;
        const venueId = req.user!.venueId;
        const staffId = req.user!.userId;

        const order = await Order.findOne({ where: { order_id: orderId, venue_id: venueId } });

        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.payment_method !== 'CASH') return res.status(400).json({ message: 'Not a cash order' });
        if (order.payment_status === 'PAID') return res.status(400).json({ message: 'Cash already collected' });

        order.payment_status = 'PAID';
        order.cash_collected_by = staffId; 

        const staffMember = await User.findByPk(staffId);

        const updatedOrderData = order.toJSON() as any;
        updatedOrderData.CashCollector = {name: staffMember?.username || 'Unknown Staff' };
        
        await order.save();

        const io = req.app.get('socketio');
        if (io) {
            io.to(`venue:${venueId}`).emit("payment:completed", { orderId: order.order_id, method: 'CASH' });
            io.to(`order:${order.order_id}`).emit("payment:completed", { orderId: order.order_id, method: 'CASH' });
        }

        res.json({ message: 'Cash collected and logged successfully', order: updatedOrderData });

    } catch (error) {
        console.error('Error collecting cash:', error);
        res.status(500).json({ message: 'Failed to process cash collection' });
    }
};

export const getHistoricalOrders = async (req: Request<{}, {}, {}, HistoricalOrdersQuery>, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId;
        const { startDate, endDate } = req.query;

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
                ...dateFilter 
            },
            include: [
                {
                    model: OrderItem,
                    include: [MenuItem] 
                },
                {
                    model: User, 
                    as: 'CashCollector'
                }
            ],
            order: [['createdAt', 'DESC']] 
        });

        const safeOrders = orders.map(order => {
            const orderJson = order.toJSON() as any;
            if (orderJson.CashCollector) {
                orderJson.CashCollector.name = orderJson.CashCollector.name || orderJson.CashCollector.username || 'Staff';
            }
            return orderJson;
        });

        res.status(200).json(safeOrders);

    } catch (error) {
        console.error('❌ Get History Error:', error);
        res.status(500).json({ message: 'Failed to fetch order history' });
    }
};

// ============================================================================
// ⚡ SPRINT 21: Table-Level Context Merging (Guest + Waiter synchronization)
// ============================================================================
export const getGuestOrders = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const guestSessionId = req.headers['x-guest-id'] as string | undefined;

        if (!guestSessionId) {
            return res.status(400).json({ message: "Missing x-guest-id header" });
        }

        const orConditions: any[] = [
            { 
                guest_session_id: guestSessionId,
                [Op.or]: [
                    { payment_status: 'PAID' }, 
                    { payment_method: { [Op.in]: ['CASH', 'TAB'] } }
                ]
            }
        ];

        if (req.guest?.venueId && req.guest?.tableName) {
            orConditions.push({
                venue_id: req.guest.venueId,
                table_number: req.guest.tableName,
                payment_method: 'TAB',
                payment_status: 'PENDING'
            });
        }

        const orders = await Order.findAll({
            where: { 
                status: { [Op.ne]: 'CANCELLED' }, 
                [Op.or]: orConditions
            },
            include: [
                {
                    model: OrderItem,
                    include: [{ model: MenuItem, attributes: ['name', 'image_url'] }]
                }
            ],
            order: [['createdAt', 'DESC']] 
        });

        return res.status(200).json(orders);

    } catch (error: any) {
        console.error("❌ Error fetching guest orders:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// ============================================================================
// ⚡ SPRINT 21: POS CASH TAB SETTLEMENT
// ============================================================================
export const settleOpenTab = async (req: Request<{}, {}, SettleTabBody>, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId;
        const staffId = req.user!.userId;
        const { table_number, settlement_method } = req.body;

        if (!table_number || !settlement_method) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        const openOrders = await Order.findAll({
            where: {
                venue_id: venueId,
                table_number: table_number,
                payment_method: 'TAB',
                payment_status: 'PENDING',
                status: { [Op.notIn]: ['CANCELLED'] } 
            }
        });

        if (openOrders.length === 0) {
            return res.status(404).json({ message: "No active tabs found for this table." });
        }

        const orderIds = openOrders.map(o => o.order_id);

        await Order.update({
            payment_status: 'PAID',
            cash_collected_by: settlement_method === 'CASH' ? staffId : null,
            payment_method: settlement_method, // Convert to actual payment method used
            notes: literal(`CONCAT(COALESCE(notes, ''), ' | Settled via ${settlement_method}')`)
        }, {
            where: { order_id: { [Op.in]: orderIds } }
        });

        const io = req.app.get('socketio');
        if (io) {
            io.to(`venue:${venueId}`).emit("payment:completed", { table_number, method: settlement_method, bulk: true });
            orderIds.forEach(id => {
                io.to(`order:${id}`).emit("payment:completed", { orderId: id, method: settlement_method });
            });
        }

        res.status(200).json({ message: `Tab settled for table ${table_number}`, updatedCount: openOrders.length });
    } catch (error) {
        console.error("Settle Tab Error:", error);
        res.status(500).json({ message: "Failed to settle open tab." });
    }
};

// ============================================================================
// ⚡ SPRINT 21: POS DIGITAL TAB PAYMENT INITIALIZATION
// ============================================================================
export const initTabPayment = async (req: Request<{}, {}, SettleTabBody>, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId;
        const { table_number, settlement_method } = req.body;

        const openOrders = await Order.findAll({
            where: { venue_id: venueId, table_number, payment_method: 'TAB', payment_status: 'PENDING', status: { [Op.notIn]: ['CANCELLED'] } },
            include: [{ model: Venue, attributes: ['gateway_subaccount_id', 'is_financially_onboarded'] }]
        });

        if (openOrders.length === 0) return res.status(404).json({ message: "No active tabs found." });
        
        const totalAmount = openOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
        const orderIds = openOrders.map(o => o.order_id);
        const venue = (openOrders[0] as any).Venue;
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

        if (settlement_method === 'CARD') {
            const payload = {
                email: "pos-staff@smarttable.app",
                amount: Math.round(totalAmount * 100),
                currency: "KES",
                subaccount: venue.gateway_subaccount_id,
                metadata: { isTabSettlement: true, orderIds } 
            };
            const response = await axios.post('https://api.paystack.co/transaction/initialize', payload, {
                headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' }
            });
            return res.status(200).json({ access_code: response.data.data.access_code });
        }
        
    } catch (error: any) {
        console.error("Init Tab Payment Error:", error);
        res.status(500).json({ message: "Failed to initialize tab payment" });
    }
};

// ============================================================================
// ⚡ SPRINT 21: GUEST DIGITAL TAB SETTLEMENT ENGINE
// ============================================================================
export const guestTabCheckout = async (req: Request<{}, {}, SettleTabBody>, res: Response): Promise<Response | void> => {
    try {
        const guestSessionId = req.headers['x-guest-id'] as string;
        const { orderIds, settlement_method, phone, provider } = req.body;
        
        if (!guestSessionId || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ message: "Invalid payload or missing session context." });
        }

        const orders = await Order.findAll({
            where: {
                order_id: { [Op.in]: orderIds },
                guest_session_id: guestSessionId,
                payment_status: 'PENDING',
                payment_method: 'TAB',
                status: { [Op.notIn]: ['CANCELLED'] }
            },
            include: [{ model: Venue, attributes: ['venue_id', 'gateway_subaccount_id', 'is_financially_onboarded', 'name'] }]
        });

        if (orders.length !== orderIds.length) {
            return res.status(400).json({ message: "Some orders are already paid or invalid." });
        }

        const venue = (orders[0] as any).Venue;

        // SCENARIO A: Cash Settlement (Turn orders into CASH type)
        if (settlement_method === 'CASH') {
            await Order.update({ payment_method: 'CASH' }, { where: { order_id: { [Op.in]: orderIds } } });
            
            const io = req.app.get('socketio');
            if (io) {
                io.to(`venue:${venue.venue_id}`).emit('order:status_updated', { bulk: true });
                orderIds.forEach(id => io.to(`order:${id}`).emit('order:status_updated', {}));
            }
            return res.status(200).json({ message: "Cash collection requested.", method: 'CASH' });
        }

        // SCENARIO B: Digital Settlement (Bundle and dispatch to Paystack)
        const totalAmount = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        
        if (!paystackSecret || !venue.is_financially_onboarded) {
            return res.status(500).json({ message: "Digital payments currently offline." });
        }
        
        if (settlement_method === 'CARD') {
            const payload = {
                email: "guest@smarttable.app",
                amount: Math.round(totalAmount * 100),
                currency: "KES",
                subaccount: venue.gateway_subaccount_id,
                metadata: { isTabSettlement: true, orderIds } 
            };
            const response = await axios.post('https://api.paystack.co/transaction/initialize', payload, {
                headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' }
            });
            return res.status(200).json({ method: 'CARD', access_code: response.data.data.access_code });
        }

        if (settlement_method === 'M-PESA') {
            let formattedPhone = phone!.replace(/\D/g, '');
            if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
            
            const payload = {
                email: "guest@smarttable.app",
                amount: Math.round(totalAmount * 100),
                currency: "KES",
                subaccount: venue.gateway_subaccount_id,
                mobile_money: { phone: formattedPhone, provider: provider || 'mpesa' },
                metadata: { isTabSettlement: true, orderIds } 
            };
            const response = await axios.post('https://api.paystack.co/charge', payload, {
                headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' }
            });
            return res.status(200).json({ method: 'M-PESA', message: "Prompt dispatched." });
        }

        return res.status(400).json({ message: "Invalid payment method." });

    } catch (error: any) {
        console.error("Guest Tab Checkout Error:", error?.response?.data || error.message);
        return res.status(500).json({ message: "Failed to process tab checkout." });
    }
};