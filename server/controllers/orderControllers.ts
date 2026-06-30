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
import TransactionLedger from '../models/TransactionLedger.js';

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
    settlement_method: 'CASH' | 'CARD' | 'M-PESA' | 'AIRTEL';
    orderIds?: string[];
    phone?: string;
    provider?: string;
}

export const createOrder = async (req: Request<{}, {}, CreateOrderBody>, res: Response): Promise<Response | void> => {
    const t = await sequelize.transaction(); 

    try {
        const { items, payment_method, customer_name, phone_number } = req.body;
        
        let guestSessionId = req.headers['x-guest-id'] as string | undefined;
        if (!guestSessionId && req.headers.authorization?.startsWith('Bearer ')) {
            guestSessionId = req.headers.authorization.split(' ')[1];
        }
        
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
            if (['TAB', 'CASH'].includes(payment_method)) {
                io.to(`venue:${venue_id}`).emit('order:created', {
                    order: newOrder,
                    items: items
                });
            }
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
                            { status: { [Op.in]: ['COMPLETED', 'CANCELLED'] }, updatedAt: { [Op.gte]: rollingWindow } },
                            { payment_status: 'PENDING', payment_method: 'TAB',status:{ [Op.ne]:'CANCELLED'}}
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
            include: [ { model: OrderItem, include: [MenuItem] }, { model: User, as: 'CashCollector' } ],
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
            return res.status(400).json({ message: `Invalid status transition. Allowed status: ${validStates.join(', ')}` });
        }

        const order = await Order.findOne({ where: { order_id: orderId, venue_id: venueId } });
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (upperStatus === 'COMPLETED' && order.payment_status !== 'PAID' && !['TAB', 'CASH'].includes(order.payment_method as string)) {
            return res.status(403).json({ message: "Order cannot be marked served until the digital payment is successfully verified." });
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
        res.status(500).json({ message: 'Failed to update order' });
    }
};

export const getOrderStatus = async (req: Request<{orderId: string}, {}>, res: Response): Promise<Response | void> => {
    try {
        const { orderId } = req.params;
        const order = await Order.findByPk(orderId, { include: [{ model: OrderItem, include: [MenuItem] }] });
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.status(200).json(order);
    } catch (error) {
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
        res.status(500).json({ message: 'Failed to process cash collection' });
    }
};

export const getHistoricalOrders = async (req: Request<{}, {}, {}, HistoricalOrdersQuery>, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId;
        const { startDate, endDate } = req.query;

        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = { createdAt: { [Op.between]: [new Date(startDate), new Date(endDate)] } };
        }

        const orders = await Order.findAll({
            where: { venue_id: venueId, ...dateFilter },
            include: [ { model: OrderItem, include: [MenuItem] }, { model: User, as: 'CashCollector' } ],
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
        res.status(500).json({ message: 'Failed to fetch order history' });
    }
};

export const getGuestOrders = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const guestSessionId = req.headers['x-guest-id'] as string | undefined;
        if (!guestSessionId) return res.status(400).json({ message: "Missing x-guest-id header" });

        const orConditions: any[] = [
            { 
                
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
            where: { guest_session_id: guestSessionId, status: { [Op.ne]: 'CANCELLED' }, [Op.or]: orConditions },
            include: [{ model: OrderItem, include: [{ model: MenuItem, attributes: ['name', 'image_url'] }] }],
            order: [['createdAt', 'DESC']] 
        });

        return res.status(200).json(orders);
    } catch (error: any) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// ============================================================================
// ⚡ SPRINT 24: SPLIT TENDER - CASH & PARTIAL SETTLEMENT LOGIC
// ============================================================================
export const settleOpenTab = async (req: Request<{}, {}, SettleTabBody & { amount_paid?: number }>, res: Response): Promise<Response | void> => {
    const t = await sequelize.transaction();
    try {
        const venueId = req.user!.venueId;
        const staffId = req.user!.userId;
        const { table_number, settlement_method, orderIds, amount_paid } = req.body;

        if (!table_number || settlement_method !== 'CASH') {
            return res.status(400).json({ message: "Invalid partial settlement payload." });
        }

        const whereClause: any = { 
            venue_id: venueId, 
            table_number: { [Op.iLike]: table_number }, 
            payment_status: { [Op.in]: ['PENDING', 'PARTIALLY_PAID'] }, 
            status: { [Op.notIn]: ['CANCELLED'] } 
        };

        if (orderIds && orderIds.length > 0) whereClause.order_id = { [Op.in]: orderIds };

        const openOrders = await Order.findAll({ where: whereClause, transaction: t });
        if (openOrders.length === 0) {
            await t.rollback();
            return res.status(404).json({ message: "No active balance found." });
        }

        let remainingBalanceToPay = amount_paid || 0;
        
        // If no specific amount is provided, calculate the full remaining balance
        if (!amount_paid) {
            for (const order of openOrders) {
                const previousPayments = await TransactionLedger.sum('amount_paid', { where: { order_id: order.order_id }, transaction: t }) || 0;
                remainingBalanceToPay += (Number(order.total_amount) - previousPayments);
            }
        }

        for (const order of openOrders) {
            if (remainingBalanceToPay <= 0) break;

            const previousPayments = await TransactionLedger.sum('amount_paid', { where: { order_id: order.order_id }, transaction: t }) || 0;
            const orderBalance = Number(order.total_amount) - previousPayments;

            if (orderBalance <= 0) continue; 

            const paymentForThisOrder = Math.min(orderBalance, remainingBalanceToPay);

            // 1. Write the micro-payment to the Ledger
            await TransactionLedger.create({
                order_id: order.order_id,
                amount_paid: paymentForThisOrder,
                payment_method: 'CASH',
                staff_id: staffId
            }, { transaction: t });

            remainingBalanceToPay -= paymentForThisOrder;

            // 2. Recalculate Order Status
            const newTotalPaid = previousPayments + paymentForThisOrder;
            const newStatus = newTotalPaid >= Number(order.total_amount) ? 'PAID' : 'PARTIALLY_PAID';

            await order.update({
                payment_status: newStatus,
                cash_collected_by: newStatus === 'PAID' ? staffId : order.cash_collected_by,
                payment_method: newStatus === 'PAID' ? 'CASH' : order.payment_method, 
                notes: literal(`CONCAT(COALESCE(notes, ''), ' | Partial Cash: ${paymentForThisOrder}')`)
            }, { transaction: t });
        }

        await t.commit();

        const io = req.app.get('socketio');
        if (io) {
            io.to(`venue:${venueId}`).emit("payment:completed", { table_number, method: 'CASH', bulk: true });
            openOrders.forEach(o => io.to(`order:${o.order_id}`).emit("payment:completed", { orderId: o.order_id, method: 'CASH' }));
        }

        res.status(200).json({ message: `Payment applied successfully` });
    } catch (error) {
        await t.rollback();
        console.error("Split Settlement Error:", error);
        res.status(500).json({ message: "Failed to apply payment." });
    }
};

// ============================================================================
// ⚡ SPRINT 24: POS DIGITAL PAYMENT INITIALIZATION (SPLIT TENDER)
// ============================================================================
export const initTabPayment = async (req: Request<{}, {}, SettleTabBody & { amount_to_pay?: number }>, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId;
        const { orderIds, settlement_method, phone, amount_to_pay } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0){
            return res.status(400).json({ message: "Invalid payload. No orders selected."})
        }

        const openOrders = await Order.findAll({
            where: { venue_id: venueId, order_id: { [Op.in]: orderIds}, payment_status: { [Op.in]: ['PENDING', 'PARTIALLY_PAID'] }, status: { [Op.notIn]: ['CANCELLED'] } },
            include: [{ model: Venue, attributes: ['gateway_subaccount_id', 'is_financially_onboarded'] }]
        });

        if (openOrders.length === 0) {
            return res.status(404).json({ message: "No active balance found." })
        };
        
        let trueRemainingBalance = 0;
        for (const order of openOrders) {
            const previousPayments = await TransactionLedger.sum('amount_paid', { where: { order_id: order.order_id } }) || 0;
            trueRemainingBalance += (Number(order.total_amount) - previousPayments);
        }

        const targetChargeAmount = amount_to_pay ? Number(amount_to_pay) : trueRemainingBalance;

        if (targetChargeAmount > trueRemainingBalance) {
            return res.status(400).json({ message: "Cannot pay more than the remaining balance." });
        }

        const venue = (openOrders[0] as any).Venue;
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

        if (!paystackSecret || !venue.is_financially_onboarded) {
            return res.status(500).json({ message: "Digital payments currently offline." });
        }

        const isAirtel = settlement_method === 'AIRTEL';
        const isCard = settlement_method === 'CARD';

        if (isCard || isAirtel) {
            const payload: any = {
                email: "pos-staff@smarttable.app",
                amount: Math.round(targetChargeAmount * 100),
                currency: "KES",
                subaccount: venue.gateway_subaccount_id,
                metadata: { isTabSettlement: true, orderIds, splitAmount: targetChargeAmount } 
            };

            if (isAirtel) payload.channels = ['mobile_money']; 

            const response = await axios.post('https://api.paystack.co/transaction/initialize', payload, {
                headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' }
            });
            
            return res.status(200).json({ method: 'CARD', access_code: response.data.data.access_code });
        }

        if (settlement_method === 'M-PESA' ) {
            let formattedPhone = phone!.replace(/\D/g, '');
            if (formattedPhone.startsWith('0')) formattedPhone = '+254' + formattedPhone.slice(1);
            else if (formattedPhone.length === 9) formattedPhone = '+254' + formattedPhone;
            
            const payload = {
                email: "pos-staff@smarttable.app",
                amount: Math.round(targetChargeAmount * 100),
                currency: "KES",
                subaccount: venue.gateway_subaccount_id,
                mobile_money: { phone: formattedPhone, provider: 'mpesa' },
                metadata: { isTabSettlement: true, orderIds, splitAmount: targetChargeAmount } 
            };
            const response = await axios.post('https://api.paystack.co/charge', payload, {
                headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' }
            });
            return res.status(200).json({ method: 'M-PESA', message: "Prompt dispatched." });
        }
        
        return res.status(400).json({ message: "Invalid payment method." });

    } catch (error: any) {
        console.error("Init Tab Payment Error:", error?.response?.data || error.message);
        res.status(500).json({ message: "Failed to initialize payment gateway." });
    }
};

// ============================================================================
// ⚡ SPRINT 24: GUEST DIGITAL SETTLEMENT ENGINE (SPLIT TENDER)
// ============================================================================
export const guestTabCheckout = async (req: Request<{}, {}, SettleTabBody & { amount_to_pay?: number }>, res: Response): Promise<Response | void> => {
    try {
        let guestToken = req.headers['x-guest-id'] as string | undefined;
        if (!guestToken && req.headers.authorization?.startsWith('Bearer ')) {
            guestToken = req.headers.authorization.split(' ')[1];
        }

        const { orderIds, settlement_method, phone, amount_to_pay } = req.body;
        
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ message: "Invalid payload. No orders selected." });
        }

        const orConditions: any[] = [];
        if (guestToken) orConditions.push({ guest_session_id: guestToken });
        if (req.guest?.venueId && req.guest?.tableName) {
            orConditions.push({ venue_id: req.guest.venueId, table_number: req.guest.tableName });
        }

        if (orConditions.length === 0) {
            return res.status(403).json({ message: "Unauthorized session context." });
        }

        const orders = await Order.findAll({
            where: {
                order_id: { [Op.in]: orderIds },
                payment_status: { [Op.in]: ['PENDING', 'PARTIALLY_PAID'] },
                status: { [Op.notIn]: ['CANCELLED'] },
                [Op.or]: orConditions
            },
            include: [{ model: Venue, attributes: ['venue_id', 'gateway_subaccount_id', 'is_financially_onboarded', 'name'] }]
        });

        if (orders.length === 0) return res.status(400).json({ message: "No active balance found." });

        const venue = (orders[0] as any).Venue;

        if (settlement_method === 'CASH') {
            const io = req.app.get('socketio');
            if (io) {
                io.to(`venue:${venue.venue_id}`).emit('order:status_updated', { bulk: true });
                orderIds.forEach(id => io.to(`order:${id}`).emit('order:status_updated', {}));
            }
            return res.status(200).json({ message: "Cash collection requested.", method: 'CASH' });
        }

        let trueRemainingBalance = 0;
        for (const order of orders) {
            const previousPayments = await TransactionLedger.sum('amount_paid', { where: { order_id: order.order_id } }) || 0;
            trueRemainingBalance += (Number(order.total_amount) - previousPayments);
        }

        const targetChargeAmount = amount_to_pay ? Number(amount_to_pay) : trueRemainingBalance;

        if (targetChargeAmount > trueRemainingBalance) {
            return res.status(400).json({ message: "Cannot pay more than the remaining balance." });
        }

        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        
        if (!paystackSecret || !venue.is_financially_onboarded) {
            return res.status(500).json({ message: "Digital payments currently offline." });
        }

        const isAirtel = settlement_method === 'AIRTEL';
        const isCard = settlement_method === 'CARD';
        
        if (isCard || isAirtel) {
            const payload: any = {
                email: "guest@smarttable.app",
                amount: Math.round(targetChargeAmount * 100),
                currency: "KES",
                subaccount: venue.gateway_subaccount_id,
                metadata: { isTabSettlement: true, orderIds, splitAmount: targetChargeAmount } 
            };

            if (isAirtel) payload.channels = ['mobile_money']; 

            const response = await axios.post('https://api.paystack.co/transaction/initialize', payload, {
                headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' }
            });
            return res.status(200).json({ method: 'CARD', access_code: response.data.data.access_code });
        }

        if (settlement_method === 'M-PESA') {
            let formattedPhone = phone!.replace(/\D/g, ''); 
            if (formattedPhone.startsWith('0')) formattedPhone = '+254' + formattedPhone.slice(1);
            else if (formattedPhone.length === 9) formattedPhone = '+254' + formattedPhone;
            
            const payload = {
                email: "guest@smarttable.app",
                amount: Math.round(targetChargeAmount * 100),
                currency: "KES",
                subaccount: venue.gateway_subaccount_id,
                mobile_money: { phone: formattedPhone, provider: 'mpesa' },
                metadata: { isTabSettlement: true, orderIds, splitAmount: targetChargeAmount } 
            };
            const response = await axios.post('https://api.paystack.co/charge', payload, {
                headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' }
            });
            return res.status(200).json({ method: 'M-PESA', message: "Prompt dispatched." });
        }

        return res.status(400).json({ message: `Invalid payment method: ${settlement_method}` });

    } catch (error: any) {
        console.error("Guest Tab Checkout Error:", error?.response?.data || error.message);
        return res.status(500).json({ message: "Failed to process digital checkout." });
    }
};