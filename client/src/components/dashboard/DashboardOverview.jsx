import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, CreditCard, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

// 1. Formatters moved outside so they aren't recreated on every render
const formatCurrency = (val) => new Intl.NumberFormat('en-KE', { 
    style: 'currency', 
    currency: 'KES', 
    minimumFractionDigits: 0 
}).format(val);

// 2. Extracted Components: Prevents complete DOM unmounting on re-renders
const StatCard = ({ title, value, trend, icon: Icon }) => {
    const isPositive = Number(trend) >= 0;
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Icon size={24} />
                </div>
                <span className={`flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {Math.abs(trend)}%
                </span>
            </div>
            <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider">{title}</h3>
            <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
        </div>
    );
};

const SkeletonLoader = () => (
    <div className="space-y-6 animate-pulse p-8 max-w-7xl mx-auto">
        <div className="flex justify-between h-10 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className='h-32 bg-slate-200 rounded-2xl'></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-80 bg-slate-200 rounded-2xl"></div>
            <div className="h-80 bg-slate-200 rounded-2xl"></div>
        </div>
    </div>
);

export default function DashboardOverview() {
    const { user } = useAuth();
    const [timeRange, setTimeRange] = useState('today');
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        const token = localStorage.getItem('token');
        setIsLoading(true);
        try {
            // Cleaned up Axios config: Removed invalid 'venueId' key
            const res = await axios.get(`/api/dashboard/overview?range=${timeRange}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setIsLoading(false);
        }
    }, [timeRange]); // Removed user.venueId from dependency array since we don't need it for the fetch

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    if (isLoading && !data) return <SkeletonLoader />;
    if (!data) return <div className='p-8 text-center text-slate-500 font-bold'>Failed to load data.</div>;

    const { kpis, salesTrends, paymentBreakdown, topItems } = data;
    const hasOrders = kpis.orders.value > 0;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
                    <p className="text-slate-500 font-medium mt-1">Track your venue's real-time performance.</p>
                </div>
                <select 
                    value={timeRange} 
                    onChange={(e) => setTimeRange(e.target.value)} 
                    className="bg-white border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                >
                    <option value="today">Today</option>
                    <option value="week">Past 7 Days</option>
                    <option value="month">Past 30 Days</option>
                </select>
            </div>

            {!hasOrders ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    {/* Fixed Tailwind class typos here */}
                    <Activity size={48} className="mx-auto text-slate-300 mb-4" />
                    <h2 className="text-xl font-bold text-slate-900">No orders found for this period.</h2>
                    <p className="text-slate-500">Sales data will appear here once customers start ordering.</p>
                </div>
            ) : (
                <>
                    {/* KPI Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard title="Gross Revenue" value={formatCurrency(kpis.revenue.value)} trend={kpis.revenue.trend} icon={DollarSign} />
                        <StatCard title="Total Orders" value={kpis.orders.value} trend={kpis.orders.trend} icon={ShoppingBag} />
                        <StatCard title="Avg Order Value" value={formatCurrency(kpis.aov.value)} trend={kpis.aov.trend} icon={CreditCard} />
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Line Chart: Sales Trends */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue Trend</h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={salesTrends}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `KSh ${val}`} />
                                        <RechartsTooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => [formatCurrency(value), 'Revenue']}
                                        />
                                        <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Doughnut Chart: Payment Methods */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Payment Methods</h3>
                            <div className="flex-1 w-full relative min-h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" data={paymentBreakdown}>
                                            {paymentBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Custom Legend */}
                            <div className="flex flex-wrap justify-center gap-4 mt-2">
                                {paymentBreakdown.map((entry, index) => (
                                    // Added missing 'key' prop here
                                    <div key={entry.name} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        {entry.name} ({entry.value})
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Data Table: Top Menu Items */}
                        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900">Top Performing Items</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity Sold</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue Generated</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {topItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 font-bold text-slate-900">{item.name}</td>
                                                <td className="p-4 text-slate-600 font-medium">{item.total_sold} units</td>
                                                <td className="p-4 text-indigo-600 font-bold">{formatCurrency(item.total_revenue)}</td>
                                            </tr>
                                        ))}
                                        {topItems.length === 0 && (
                                            <tr><td colSpan="3" className="p-8 text-center text-slate-500">No item data available.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}