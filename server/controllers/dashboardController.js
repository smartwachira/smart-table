import { Op, fn, col, literal } from 'sequelize';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import MenuItem from '../models/MenuItem.js';
import MenuCategory from '../models/MenuCategory.js';
import Venue from '../models/Venue.js'; 

const calculateDynamicDataRanges = (startDateQuery, endDateQuery, shiftHours) => {
    let startDate, endDate;

    if (startDateQuery && endDateQuery){
        startDate = new Date(startDateQuery);
        endDate = new Date(endDateQuery);
    } else {
        const now = new Date();
        endDate = now;
        startDate = new Date(now.getTime() - (shiftHours * 60 * 60 * 1000));
    }

    const durationMs = endDate.getTime() - startDate.getTime();

    const previousStartDate = new Date(startDate.getTime() - durationMs);
    const previousEndDate = new Date(endDate.getTime() - durationMs);

    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    
    let granularity = 'hour';

    if (durationDays > 60){
        granularity = 'month';
    } else if (durationDays > 2){
        granularity = 'day';
    }

    return { startDate, endDate, previousEndDate, previousStartDate, durationMs, granularity };
};

const calculateTrend = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return (((current - previous) / previous) * 100).toFixed(1);
};

export const getDashboardOverview = async (req, res) => {
    try {
        const venueId = req.user.venueId;
        const { startDate: queryStart, endDate: queryEnd } = req.query;

        const venue = await Venue.findByPk(venueId, { attributes: ['shift_duration_hours'] });
        const shiftHours = venue?.shift_duration_hours || 14;

        const { startDate, endDate, previousStartDate, previousEndDate, durationMs, granularity } = calculateDynamicDataRanges(queryStart, queryEnd, shiftHours);

        // ⚡ THE FIX: Define what constitutes a "Valid" order to prevent ghost orders from inflating stats
        const validPaymentCondition = {
            [Op.or]: [
                { payment_status: 'PAID' },
                { payment_method: 'CASH' }
            ]
        };

        // ⚡ THE FIX: Apply the valid payment condition to ALL historical queries (Revenue, Trends, etc.)
        const currentWhere = {
            venue_id: venueId,
            status: { [Op.notIn]: ['CANCELLED'] },
            createdAt: { [Op.between]: [startDate, endDate] },
            ...validPaymentCondition
        };

        const previousWhere = {
            venue_id: venueId,
            status: { [Op.notIn]: ["CANCELLED"]}, 
            createdAt: { [Op.between]: [previousStartDate, previousEndDate]},
            ...validPaymentCondition
        };

        const [
            currentOrders, 
            prevOrders,
            currentSalesTrendRaw,
            previousSalesTrendRaw,
            topItems,
            liveActiveOrders,
            fulfillmentData,
            categoryBreakdown
        ] = await Promise.all([
            Order.findAll({ 
                where: currentWhere, 
                attributes: ['total_amount', 'payment_method', 'createdAt'],
                raw: true 
            }),
            
            Order.findAll({
                where: previousWhere,
                attributes: ['total_amount'],
                raw: true
            }),
            
            Order.findAll({
                where: currentWhere,
                attributes: [
                    [fn('DATE_TRUNC', granularity, col('createdAt')),'timeLabel'],
                    [fn('SUM',col('total_amount')),'revenue'],
                    [fn('COUNT',col('order_id')),'orders']
                ],
                group: [fn("DATE_TRUNC", granularity, col('createdAt'))],
                order: [[fn("DATE_TRUNC", granularity, col('createdAt')), 'ASC']], 
                raw: true
            }),
            
            Order.findAll({
                where: previousWhere,
                attributes: [
                    [fn('DATE_TRUNC', granularity, col('createdAt')),'timeLabel'],
                    [fn('SUM',col('total_amount')),'revenue'],
                    [fn('COUNT',col('order_id')),'orders']
                ],
                group: [fn("DATE_TRUNC", granularity, col('createdAt'))],
                order: [[fn("DATE_TRUNC", granularity, col('createdAt')), 'ASC']],
                raw: true
            }),

            OrderItem.findAll({
                include: [
                    { model: Order, attributes: [], where: currentWhere },
                    { model: MenuItem, attributes: [] }
                ],
                attributes: [
                    [col('MenuItem.name'), 'name'], 
                    [fn('SUM', col('OrderItem.quantity')), 'total_sold'],
                    [fn('SUM', literal('"OrderItem"."quantity" * "OrderItem"."price_at_time"')), 'total_revenue']
                ],
                group: [col('MenuItem.item_id'), col('MenuItem.name')], 
                order: [[fn('SUM', col('OrderItem.quantity')), 'DESC']],
                limit: 5,
                raw: true
            }),
            
            // ⚡ THE FIX: Apply the valid payment condition to the Live Pulse count so it matches the kitchen exactly!
            Order.count({
                where: {
                    venue_id: venueId,
                    status: { [Op.in]: ['PENDING', 'PREPARING', 'READY'] },
                    ...validPaymentCondition
                }
            }),
            
            Order.findOne({
                where: {
                    ...currentWhere, status: 'COMPLETED' 
                },
                attributes: [
                    [fn('AVG', literal('EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 60')), 'avg_minutes']
                ],
                raw: true
            }),
            
            OrderItem.findAll({
                include: [
                    { model: Order, attributes: [], where: currentWhere },
                    {
                        model: MenuItem,
                        attributes: [],
                        include: [{ model: MenuCategory, attributes: [] }]
                    }
                ],
                attributes: [
                    [col('MenuItem.MenuCategory.name'), 'category'],
                    [fn('SUM', col('OrderItem.quantity')), 'total_sold'],
                    [fn('SUM', literal('"OrderItem"."quantity" * "OrderItem"."price_at_time"')), 'revenue'] 
                ],
                group: [col('MenuItem.category_id'), col('MenuItem.MenuCategory.name')],
                order: [[fn('SUM', literal('"OrderItem"."quantity" * "OrderItem"."price_at_time"')), 'DESC']],
                raw: true
            })
        ]);

        const totalRevenue = currentOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
        const totalOrders = currentOrders.length;
        const aov = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

        const prevRevenue = prevOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
        const prevTotalOrders = prevOrders.length;
        const prevAov = prevTotalOrders > 0 ? (prevRevenue / prevTotalOrders) : 0;

        const paymentBreakdownMap = {};
        currentOrders.forEach(order => {
            const method = order.payment_method || 'OTHER';
            paymentBreakdownMap[method] = (paymentBreakdownMap[method] || 0) + 1;
        });
        
        const paymentBreakdown = Object.keys(paymentBreakdownMap).map(key => ({
            name: key, value: paymentBreakdownMap[key]
        }));

        const unifiedTrendsMap = {};

        currentSalesTrendRaw.forEach(row =>{
            const timeKey = new Date(row.timeLabel).toISOString();
            unifiedTrendsMap[timeKey]={
                timeLabel: timeKey,
                currentRevenue: parseFloat(row.revenue || 0),
                currentOrders: parseInt(row.orders || 0, 10),
                previousRevenue: 0,
                previousOrders: 0
            };
        });

        previousSalesTrendRaw.forEach(row =>{
            const originalTime = new Date(row.timeLabel);
            const shiftedTime = new Date(originalTime.getTime() + durationMs);
            const timeKey = shiftedTime.toISOString();

            if (!unifiedTrendsMap[timeKey]){
                unifiedTrendsMap[timeKey]={
                    timeLabel: timeKey,
                    currentRevenue: 0,
                    currentOrders:0,
                    previousRevenue: 0,
                    previousOrders: 0
                };
            }
            unifiedTrendsMap[timeKey].previousRevenue = parseFloat(row.revenue || 0);
            unifiedTrendsMap[timeKey].previousOrders = parseInt(row.orders || 0, 10);
        });

        const salesTrends = Object.values(unifiedTrendsMap).sort((a,b) => new Date(a.timeLabel) - new Date(b.timeLabel));

        res.status(200).json({
            granularity, 
            kpis: {
                revenue: { value: totalRevenue, trend: calculateTrend(totalRevenue, prevRevenue) },
                orders: { value: totalOrders, trend: calculateTrend(totalOrders, prevTotalOrders) },
                aov: { value: Number(aov), trend: calculateTrend(aov, prevAov) } 
            },
            livePulse: {
                activeOrders: liveActiveOrders,
                averageFulfillmentTime: fulfillmentData?.avg_minutes ? parseFloat(fulfillmentData.avg_minutes).toFixed(1) : '0.0'
            },
            salesTrends,
            paymentBreakdown,
            topItems,
            categoryBreakdown
        });

    } catch(error) {
        console.error("Dashboard Overview Error:", error);
        res.status(500).json({ message: 'Failed to load dashboard data.' });
    }
}