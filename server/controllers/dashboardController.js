import { Op, fn, col, literal} from 'sequelize';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js'

// Helper to calculate date ranges
const getDataRanges = (range)=>{
    const now = new Data();
    const currentStart = new Date();
    const prevStart = new Data();
    const prevEnd = new Date();

    if (range === 'week'){
        currentStart.setDate(now.getDate() - 7);
        prevStart.setDate(now.getDate() - 14);
        prevEnd.setDate(now.getDate() - 7);
    } else if (range === 'month'){
        currentStart.setDate(now.getDate() - 30);
        prevStart.setDate(now.getDate() - 60);
        prevEnd.setDate(now.getDate - 30);
    } else {
        // Default to 'today'
        currentStart.setHours(0,0,0,0);
        prevStart.setDate(now.getDate() - 1);
        prevStart.setHours(0,0,0,0);
        prevEnd.setHours(0,0,0,0)
    }
    return { currentStart,prevStart,prevEnd,now};
};

// Calculate percentage change
const calculateTrend = (current, previous)=>{
    if (previous === 0) return current > 0 ? 100 : 0;
    return (((current - previous) / previous) * 100).toFixed(1);
}

export const getDashboardOverview = async (req,res)=>{
    try {

        const venueId = req.user.venueId;
        const { range = 'today'} = req.query;
        const { currentStart, prevStart,prevEnd,now} = getDataRanges(range);

        // Common where clause for current period active orders
        const  currentWhere = {
            venue_id: venueId,
            status: {
                [Op.notIn]:['CANCELLED']
            },
            created_at: {
                [Op.between]: [currentStart, now]
            }
        };

        // 1. Fetch Current & Previous Period KPIs (Parallelized for performance)
        const [currentOrders, prevOrders] = await Promise.all([
            Order.findAll({ where: currentWhere, attributes: ['total_amount','payment_method','created_at']}),
            Order.findAll({
                where: {
                    venue_id: venueId,
                    status: {
                        [Op.notIn]:['CANCELLED']
                    },
                    created_at: {
                        [Op.between]: [prevStart, prevEnd]
                    }
                },
                attributes: ['total_amount']
            })
        ]);

        //Calculate KPIs
        const totalRevenue = currentOrders.reduce((sum,order)=> sum + Number(order.total_amount),0);
        const totalOrders = currentOrders.length;
        const  aov = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

        const prevRevenue = prevOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
        const prevTotalOrders = prevOrders.length;
        const prevAov = prevTotalOrders > 0 ? (prevRevenue / prevTotalOrders) : 0;

        // 2. Process Sales Trends (Time-series)
        const salesTrendsMap = {};
        currentOrders.forEach(order => {
            const date = new Date(order.created_at);
            // Group by hour for 'today', otherwise by day (YYYY-MM-DD)
            const timeKey = range === 'today' 
                ? `${date.getHours()}:00` 
                : date.toISOString().split('T')[0];

            if (!salesTrendsMap[timeKey]){
                salesTrendsMap[timeKey] = { time: timeKey, revenue: 0,orders:0}
            }
            salesTrendsMap[timeKey].revenue += Number(order.total_amount);
            salesTrendsMap[timeKey].orders += 1;

        });
        const salesTrends = Object.values(salesTrendsMap).sort((a,b)=> a.time.localeCompare(b.time));

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
                where: currentWhere
            }],
            attributes: [
                'name',
                [fn('SUM',col('quantity')), 'total_sold'],
                [fn('SUM', literal('quantity * price')),'total_revenue']
            ],
            group: ['OrderItem.name'],
            order: [[fn('SUM', col('quantity')),'DESC']],
            limit: 5,
            raw: true
        });

        // Send unified JSON response
        res.status(200).json({
            kpis: {
                revenue: {value: totalRevenue, trend: calculateTrend(totalRevenue, prevRevenue)},
                orders: { value: totalOrders, trend: calculateTrend(totalOrders,prevTotalOrders)},
                aov: { value: aov, trend:calculateTrend(aov,prevAov)}
            },
            salesTrends,
            paymentBreakdown,
            topItems
        });


    } catch(error){
        console.error("Dashboard Overview Error:",error);
        res.status(500).json({ message: 'Failed to load dashboard data.'});
    }
}