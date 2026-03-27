import { Op, fn, col, literal } from 'sequelize';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import MenuItem from '../models/MenuItem.js';
import MenuCategory from '../models/MenuCategory.js';

// ⚡ ENTERPRISE UPGRADE: Dynamic Temporal Calculator
const calculateDynamicDataRanges = (startDateQuery,endDateQuery) => {
    let startDate, endDate

    // 1. Parse or Default to 'Today'
    if (startDateQuery,endDateQuery){
        startDate = startDateQuery;
        endDate = endDateQuery
    } else {
        const now = new Date();
        startDate = new Date(now);
        startDate.setHours(0,0,0,0); //Start of today
        endDate = now; //Right now
    }

    // 2. Calculate Exact Duration for True 1:1 Comparative Analysis
    const durationMs = endDate.getTime() - startDate.getTime();

    // Previous period is the exact identical duration immediately preceding the start date
    const previousStartDate = new Date(startDate.getTime() - durationMs);
    const previousEndDate = new Date(startDateDate.getTime());

    // 3. Determine Granularity for PostgreSQL DATE_TRUNC
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    let granuality = 'hour';

    if (durationDays > 60){
        granuality = 'month';
    } else if (durationDays > 2){
        granuality = 'day'
    }

    
    
    return { startDate, endDate,previousEndDate,previousStartDate,durationMs,granuality};
};

// Calculate percentage change
const calculateTrend = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return (((current - previous) / previous) * 100).toFixed(1);
};

export const getDashboardOverview = async (req, res) => {
    try {
        const venueId = req.user.venueId;
        const { startDate: queryStart, endDate: queryEnd } = req.query;
        const { startDate, endDate, previousStartDate,previousEndDate,durationMs,granuality } = calculateDynamicDataRanges(queryStart,queryEnd);

        // Common where clause for current period active orders (SECURE)
        const currentWhere = {
            venue_id: venueId,
            status: { [Op.notIn]: ['CANCELLED'] },
            createdAt: { [Op.between]: [startDate, endDate] }
        };

        const previousWhere = {
            venue_id: venueId,
            status: { [Op.notIn]: ["CANCELED"]},
            createdAt: { [Op.between]: [previousStartDate,previousEndDate]}
        };

        // ⚡ ENTERPRISE UPGRADE: All queries executed in parallel
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
            // 1. Fetch Current Orders
            Order.findAll({ 
                where: currentWhere, 
                attributes: ['total_amount', 'payment_method', 'createdAt'],
                raw: true 
            }),
            
            // 2. Fetch Previous Period Orders
            Order.findAll({
                where: previousWhere,
                attributes: ['total_amount'],
                raw: true
            }),
            
            // 3. ⚡ PostgreSQL Native Aggregation: Current Period Trend
            Order.findAll({
                where: currentWhere,
                attributes: [
                    [fn('DATE_TRUNC',granuality, col('createdAt')),'timeLabel'],
                    [fn('SUM',col('total_amount')),'revenue'],
                    [fn('COUNT',col('order_id')),'orders']
                ],
                group: [fn("DATE_TRUNC",granuality,col('createdAt'))],
                order: [fn("DATE_TRUNC",granuality,col('createdAt'))],
                raw: true
            })
            ,
            // 4. ⚡ PostgreSQL Native Aggregation: Previous Period Trend
            Order.findAll({
                where: previousWhere,
                attributes: [
                    [fn('DATE_TRUNC',granuality, col('createdAt')),'timeLabel'],
                    [fn('SUM',col('total_amount')),'revenue'],
                    [fn('COUNT',col('order_id')),'orders']
                ],
                group: [fn("DATE_TRUNC",granuality,col('createdAt'))],
                order: [fn("DATE_TRUNC",granuality,col('createdAt'))],
                raw: true
            }),
            // 5. Top 5 Menu Items
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
                
                // ⚡ THE FIX: Wrap grouping targets in col() to bypass Sequelize's auto-scoping
                group: [col('MenuItem.item_id'), col('MenuItem.name')], 
                // ⚡ THE FIX: Explicitly qualify the order target
                order: [[fn('SUM', col('OrderItem.quantity')), 'DESC']],
                limit: 5,
                raw: true
            }),
            
            // 6. Live Pulse Metrics
            Order.count({
                where: {
                    venue_id: venueId,
                    status: { [Op.in]: ['PENDING', 'PREPARING', 'READY'] },
                    createdAt: { [Op.gte]: new Date(new Date().setHours(0,0,0,0)) }
                }
            }),
            
            // 7. Kitchen Fulfillment Metric
            Order.findOne({
                where: {
                    ...currentWhere, status: 'COMPLETED' 
                },
                attributes: [
                    [fn('AVG', literal('EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 60')), 'avg_minutes']
                ],
                raw: true
            }),
            
            // 8. Sales by Category (Menu Engineering)
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
                
                // ⚡ THE FIX: Apply col() wrapping here as well (Using category_id from your schema)
                group: [col('MenuItem.category_id'), col('MenuItem.MenuCategory.name')],
                order: [[fn('SUM', literal('"OrderItem"."quantity" * "OrderItem"."price_at_time"')), 'DESC']],
                raw: true
            })
        ]);

        // Calculate KPIs
        const totalRevenue = currentOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
        const totalOrders = currentOrders.length;
        const aov = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

        const prevRevenue = prevOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
        const prevTotalOrders = prevOrders.length;
        const prevAov = prevTotalOrders > 0 ? (prevRevenue / prevTotalOrders) : 0;

        // Process Time-series & Breakdown (In-memory)
        const salesTrendsMap = {};
        const paymentBreakdownMap = {};
        
        currentOrders.forEach(order => {
            // Time Trends
            const date = new Date(order.createdAt);
            const timeKey = range === 'today' 
                ? `${date.getHours()}:00` 
                : date.toISOString().split('T')[0];

            if (!salesTrendsMap[timeKey]) {
                salesTrendsMap[timeKey] = { time: timeKey, revenue: 0, orders: 0 };
            }
            salesTrendsMap[timeKey].revenue += Number(order.total_amount);
            salesTrendsMap[timeKey].orders += 1;

            // Payments
            const method = order.payment_method || 'OTHER';
            paymentBreakdownMap[method] = (paymentBreakdownMap[method] || 0) + 1;
        });
        
        const salesTrends = Object.values(salesTrendsMap).sort((a, b) => a.time.localeCompare(b.time));
        const paymentBreakdown = Object.keys(paymentBreakdownMap).map(key => ({
            name: key, value: paymentBreakdownMap[key]
        }));

        // Send unified JSON response
        res.status(200).json({
            kpis: {
                revenue: { value: totalRevenue, trend: calculateTrend(totalRevenue, prevRevenue) },
                orders: { value: totalOrders, trend: calculateTrend(totalOrders, prevTotalOrders) },
                aov: { value: Number(aov), trend: calculateTrend(aov, prevAov) } 
            },
            livePulse: {
                activeOrders: liveActiveOrders,
                averageFulfillmentTime: fulfillmentData?.avg_minutes
                    ? parseFloat(fulfillmentData.avg_minutes).toFixed(1)
                    : '0.0'
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