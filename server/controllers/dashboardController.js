import { Op, fn, col, literal } from 'sequelize';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import MenuItem from '../models/MenuItem.js';

// Helper to calculate date ranges (Fixed syntax and logic)
const getDataRanges = (range) => {
    const now = new Date();
    const currentStart = new Date(now);
    const prevStart = new Date(now);
    const prevEnd = new Date(now);

    if (range === 'week') {
        currentStart.setDate(now.getDate() - 7);
        prevStart.setDate(now.getDate() - 14);
        prevEnd.setDate(now.getDate() - 7); // Fixed missing parentheses
    } else if (range === 'month') {
        currentStart.setDate(now.getDate() - 30);
        prevStart.setDate(now.getDate() - 60);
        prevEnd.setDate(now.getDate() - 30); // Fixed missing parentheses
    } else {
        // Default to 'today' vs 'yesterday'
        currentStart.setHours(0, 0, 0, 0); // Start of today
        
        prevStart.setDate(now.getDate() - 1);
        prevStart.setHours(0, 0, 0, 0); // Start of yesterday
        
        prevEnd.setDate(now.getDate() - 1);
        prevEnd.setHours(23, 59, 59, 999); // End of yesterday
    }
    
    return { currentStart, prevStart, prevEnd, now };
};

// Calculate percentage change
const calculateTrend = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return (((current - previous) / previous) * 100).toFixed(1);
};

export const getDashboardOverview = async (req, res) => {
    try {
        const venueId = req.user.venueId;
        const { range = 'today' } = req.query;
        const { currentStart, prevStart, prevEnd, now } = getDataRanges(range);

        // Common where clause for current period active orders
        const currentWhere = {
            venue_id: venueId,
            status: {
                [Op.notIn]: ['CANCELLED']
            },
            createdAt: {
                [Op.between]: [currentStart, now]
            }
        };

        // 1. Fetch Current & Previous Period KPIs (Parallelized)
        const [currentOrders, prevOrders] = await Promise.all([
            Order.findAll({ 
                where: currentWhere, 
                attributes: ['total_amount', 'payment_method', 'createdAt'],
                raw: true // Optimization: Returns plain JSON objects instead of heavy Sequelize instances
            }),
            Order.findAll({
                where: {
                    venue_id: venueId,
                    status: { [Op.notIn]: ['CANCELLED'] },
                    createdAt: { [Op.between]: [prevStart, prevEnd] }
                },
                attributes: ['total_amount'],
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

        // 2. Process Sales Trends (Time-series)
        const salesTrendsMap = {};
        currentOrders.forEach(order => {
            const date = new Date(order.createdAt);
            const timeKey = range === 'today' 
                ? `${date.getHours()}:00` 
                : date.toISOString().split('T')[0];

            if (!salesTrendsMap[timeKey]) {
                salesTrendsMap[timeKey] = { time: timeKey, revenue: 0, orders: 0 };
            }
            salesTrendsMap[timeKey].revenue += Number(order.total_amount);
            salesTrendsMap[timeKey].orders += 1;
        });
        
        const salesTrends = Object.values(salesTrendsMap).sort((a, b) => a.time.localeCompare(b.time));

        // 3. Process Payment Breakdown
        const paymentBreakdownMap = {};
        currentOrders.forEach(order => {
            const method = order.payment_method || 'OTHER';
            paymentBreakdownMap[method] = (paymentBreakdownMap[method] || 0) + 1;
        });
        
        const paymentBreakdown = Object.keys(paymentBreakdownMap).map(key => ({
            name: key, value: paymentBreakdownMap[key]
        }));

        // 4. Top 5 Menu Items (Join with OrderItem)
        const topItems = await OrderItem.findAll({
            include: [{
                model: Order,
                attributes: [],
                where: currentWhere // Multi-tenant security injected here
            },
            {
                model: MenuItem,
                attributes: []
            }
        ],
            attributes: [
                [col('MenuItem.name'),'name'],
                [fn('SUM', col('quantity')), 'total_sold'],
                [fn('SUM', literal('quantity * price')), 'total_revenue']
            ],
            group: ['MenuItem.item_id','MenuItem.name'],
            order: [[fn('SUM', col('quantity')), 'DESC']],
            limit: 5,
            raw: true
        });

        // Send unified JSON response
        res.status(200).json({
            kpis: {
                revenue: { value: totalRevenue, trend: calculateTrend(totalRevenue, prevRevenue) }, // Fixed typo 'venue' -> 'value'
                orders: { value: totalOrders, trend: calculateTrend(totalOrders, prevTotalOrders) },
                aov: { value: Number(aov), trend: calculateTrend(aov, prevAov) } // Cast aov to Number for consistency
            },
            salesTrends,
            paymentBreakdown,
            topItems
        });

    } catch(error) {
        console.error("Dashboard Overview Error:", error);
        res.status(500).json({ message: 'Failed to load dashboard data.' });
    }
}