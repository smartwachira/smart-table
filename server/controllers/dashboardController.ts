import { Request, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import MenuItem from '../models/MenuItem.js';
import MenuCategory from '../models/MenuCategory.js';
import Venue from '../models/Venue.js';

// 🛡️ Explicitly define the expected query parameters
interface DashboardQuery {
    startDate?: string;
    endDate?: string;
}

const calculateDynamicDataRanges = (startDateQuery?: string, endDateQuery?: string, shiftHours: number = 14) => {
    let startDate: Date, endDate: Date;

    if (startDateQuery && endDateQuery) {
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
    if (durationDays > 60) {
        granularity = 'month';
    } else if (durationDays > 2) {
        granularity = 'day';
    }

    return { startDate, endDate, previousEndDate, previousStartDate, durationMs, granularity };
};

const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { percentage: current > 0 ? "100.0" : "0.0", isPositive: current >= 0 };
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    return { percentage: Math.abs(percentage).toFixed(1), isPositive: percentage >= 0 };
};

export const getDashboardOverview = async (req: Request<{}, {}, {}, DashboardQuery>, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId;
        const { startDate: qStart, endDate: qEnd } = req.query;

        const { startDate, endDate, previousStartDate, previousEndDate, granularity } = calculateDynamicDataRanges(qStart, qEnd, 14);

        const currentPeriodFilter = { venue_id: venueId, createdAt: { [Op.between]: [startDate, endDate] } };
        const previousPeriodFilter = { venue_id: venueId, createdAt: { [Op.between]: [previousStartDate, previousEndDate] } };
        const completedFilter = { status: 'COMPLETED' };
        const paidFilter = { payment_status: 'PAID' };

        // KPI 1: Revenue
        const currentRevenueResult = await Order.sum('total_amount', { where: { ...currentPeriodFilter, ...completedFilter, ...paidFilter } });
        const previousRevenueResult = await Order.sum('total_amount', { where: { ...previousPeriodFilter, ...completedFilter, ...paidFilter } });
        
        const totalRevenue = Number(currentRevenueResult) || 0;
        const prevRevenue = Number(previousRevenueResult) || 0;

        // KPI 2: Total Orders
        const totalOrders = Number(await Order.count({ where: { ...currentPeriodFilter, ...completedFilter } })) || 0;
        const prevTotalOrders = Number(await Order.count({ where: { ...previousPeriodFilter, ...completedFilter } })) || 0;

        // KPI 3: Average Order Value (AOV)
        const aov = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
        const prevAov = prevTotalOrders > 0 ? (prevRevenue / prevTotalOrders) : 0;

        // KPI 4: Live Kitchen Pulse (⚡ UPDATED LOGIC)
        const liveActiveOrders = Number(await Order.count({
            where: { 
                venue_id: venueId, 
                status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] }, // Condition C
                [Op.or]: [
                    { payment_method: { [Op.ne]: 'CASH' }, payment_status: 'PAID' }, // ⚡ Global Channel Support!
                    { payment_method: 'CASH' }
                ]
            }
        })) || 0;

        // Postgres specific time extract mapping
        const fulfillmentData = await Order.findOne({
            where: { ...currentPeriodFilter, ...completedFilter },
            attributes: [[literal(`AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 60)`), 'avg_minutes']],
            raw: true
        }) as any;
        const avgFulfillment = fulfillmentData?.avg_minutes ? parseFloat(fulfillmentData.avg_minutes).toFixed(1) : '0.0';

        // Chart 2: Top Selling Items
        const topItems = await OrderItem.findAll({
            attributes: [
                'item_id', 
                [fn('SUM', col('quantity')), 'total_sold'], 
                [fn('SUM', literal('quantity * price_at_time')), 'total_revenue'],
                [col('MenuItem.name'), 'name'], 
                [col('MenuItem.image_url'), 'image_url']
            ],
            include: [
                { model: Order, attributes: [], where: { ...currentPeriodFilter, ...completedFilter } },
                { model: MenuItem, attributes: [] }
            ],
            group: ['OrderItem.item_id', 'MenuItem.item_id', 'MenuItem.name', 'MenuItem.image_url'],
            order: [[literal('total_sold'), 'DESC']],
            limit: 5,
            raw: true
        });

        // Chart 3: Category Breakdown
        const categoryBreakdown = await OrderItem.findAll({
            attributes: [
                [col('MenuItem.MenuCategory.name'), 'category'],
                [fn('SUM', col('quantity')), 'total_sold'],
                [fn('SUM', literal('quantity * price_at_time')), 'revenue']
            ],
            include: [
                { model: Order, attributes: [], where: { ...currentPeriodFilter, ...completedFilter } },
                { model: MenuItem, attributes: [], include: [{ model: MenuCategory, attributes: [] }] }
            ],
            group: ['MenuItem.MenuCategory.category_id', 'MenuItem.MenuCategory.name'],
            order: [[literal('total_sold'), 'DESC']],
            raw: true
        });

        // Chart 4: Payment Methods
        const paymentBreakdown = await Order.findAll({
            where: { ...currentPeriodFilter, ...completedFilter, ...paidFilter },
            attributes: [
                [col('payment_method'), 'name'], 
                [fn('COUNT', col('order_id')), 'value']
            ],
            group: ['payment_method'],
            raw: true 
        });

        // Live Trends Construction
        let timeFormatString = "YYYY-MM-DD HH:00:00"; 
        if (granularity === 'day') timeFormatString = "YYYY-MM-DD";
        if (granularity === 'month') timeFormatString = "YYYY-MM";

        const currentTrends = await Order.findAll({
            where: { ...currentPeriodFilter, ...completedFilter },
            attributes: [
                [fn('to_char', col('createdAt'), timeFormatString), 'time_label'],
                [fn('SUM', col('total_amount')), 'revenue'],
                [fn('COUNT', col('order_id')), 'orders']
            ],
            group: ['time_label'],
            order: [[literal('time_label'), 'ASC']],
            raw: true 
        });

        const previousTrends = await Order.findAll({
            where: { ...previousPeriodFilter, ...completedFilter },
            attributes: [
                [fn('to_char', col('createdAt'), timeFormatString), 'time_label'],
                [fn('SUM', col('total_amount')), 'revenue'],
                [fn('COUNT', col('order_id')), 'orders']
            ],
            group: ['time_label'],
            order: [[literal('time_label'), 'ASC']],
            raw: true 
        });

        const unifiedTrendsMap: Record<string, any> = {};
        
        currentTrends.forEach((row: any) => {
            unifiedTrendsMap[row.time_label] = {
                timeLabel: row.time_label,
                currentRevenue: parseFloat(row.revenue || 0),
                currentOrders: parseInt(row.orders || 0, 10),
                previousRevenue: 0,
                previousOrders: 0
            };
        });

        previousTrends.forEach((row: any) => {
            let timeKey = row.time_label;
            
            const prevDateObj = new Date(row.time_label);
            const shiftedDateObj = new Date(prevDateObj.getTime() + (startDate.getTime() - previousStartDate.getTime()));
            
            if (granularity === 'day') timeKey = shiftedDateObj.toISOString().split('T')[0];
            else if (granularity === 'hour') timeKey = shiftedDateObj.toISOString().substring(0, 13) + ":00:00";
            else timeKey = shiftedDateObj.toISOString().substring(0, 7);

            if (!unifiedTrendsMap[timeKey]) {
                unifiedTrendsMap[timeKey] = {
                    timeLabel: timeKey,
                    currentRevenue: 0,
                    currentOrders: 0,
                    previousRevenue: 0,
                    previousOrders: 0
                };
            }
            unifiedTrendsMap[timeKey].previousRevenue = parseFloat(row.revenue || 0);
            unifiedTrendsMap[timeKey].previousOrders = parseInt(row.orders || 0, 10);
        });

        const salesTrends = Object.values(unifiedTrendsMap).sort((a, b) => new Date(a.timeLabel).getTime() - new Date(b.timeLabel).getTime());

        res.status(200).json({
            granularity, 
            kpis: {
                revenue: { value: totalRevenue, trend: calculateTrend(totalRevenue, prevRevenue) },
                orders: { value: totalOrders, trend: calculateTrend(totalOrders, prevTotalOrders) },
                aov: { value: Number(aov.toFixed(2)), trend: calculateTrend(aov, prevAov) } 
            },
            livePulse: {
                activeOrders: liveActiveOrders,
                averageFulfillmentTime: avgFulfillment
            },
            salesTrends,
            paymentBreakdown,
            topItems,
            categoryBreakdown
        });

    } catch (error) {
        console.error("Dashboard Overview Error:", error);
        res.status(500).json({ message: "Failed to load dashboard data." });
    }
};