import { Request, Response} from 'express';
import { Server } from 'socket.io';
import Order, { OrderStatus} from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import MenuItem from '../models/MenuItem.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import Venue from '../models/Venue.js';
import User from '../models/User.js';

// 🛡️ Strict Payload Definitions
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
// 🛡️ Note: Query parameters are always strings or undefined in Express
interface HistoricalOrdersQuery {
    startDate?: string;
    endDate?: string;
}

export const createOrder = async (req: Request<{}, {}, CreateOrderBody>, res: Response): Promise<Response | void> => {

    console.log("🕵️ EXTRACTED GUEST ID:", req.headers['x-guest-id']);
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
            staffId = req.user.userId; 
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
            status: 'pending',
            payment_status: 'PENDING',
            guest_session_id: guestSessionId || null,
            gateway_fee: 0, // ⚡ Explicitly pass default
            platform_fee: 0 // ⚡ Explicitly pass default
        }, { transaction: t });


        const orderItemsData = validatedItems.map(item => ({
            ...item,
            order_id: newOrder.order_id || newOrder.getDataValue('order_id')
        }));

        await OrderItem.bulkCreate(orderItemsData, { transaction: t });
        await t.commit();

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

    } catch (error: any) {
        await t.rollback(); 
        console.error('❌ Order Error:', error);
        res.status(500).json({ message: 'Failed to place order', error: error.message });
    }
};

export const getOrders = async (req: Request, res: Response): Promise<Response | void> =>{
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
                    // ⚡ UPDATED LOGIC: Strict payment conditions
                    {
                        [Op.or]: [
                            { payment_method: { [Op.in]: ['CARD', 'M-PESA'] }, payment_status: 'PAID' },
                            { payment_method: 'CASH' }
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

        if (upperStatus === 'COMPLETED' && order.payment_status !== 'PAID') {
            return res.status(403).json({ 
                message: "Order cannot be completed until payment is received (Mark as Cash Collected or await M-Pesa)." 
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
        const staffId = req.user!.userId 

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
            io.to(venueId).emit("orderUpdated", { orderId: order.order_id });
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

export const getGuestOrders = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const guestSessionId = req.headers['x-guest-id'] as string | undefined;

        if (!guestSessionId) {
            return res.status(400).json({ message: "Missing x-guest-id header" });
        }

        const orders = await Order.findAll({
            where: { 
                guest_session_id: guestSessionId,
                status: { [Op.ne]: 'CANCELLED' }, // Hide cancelled orders
                // ⚡ UPDATED LOGIC: Hide failed/pending digital ghost orders
                [Op.or]: [
                    { payment_method: { [Op.in]: ['CARD', 'M-PESA'] }, payment_status: 'PAID' },
                    { payment_method: 'CASH' }
                ]
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