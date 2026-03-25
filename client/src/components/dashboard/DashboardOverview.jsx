import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
    TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
    CreditCard, Activity, QrCode, PlusCircle, Clock, Flame
} from 'lucide-react';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// 1. Formatters moved outside so they aren't recreated on every render
const formatCurrency = (val) => new Intl.NumberFormat('en-KE', { 
    style: 'currency', 
    currency: 'KES', 
    minimumFractionDigits: 0 
}).format(val);

// 2. Extracted Components
const StatCard = ({ title, value, trend, icon: Icon }) => {
    const isPositive = Number(trend) >= 0;
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col transition-all hover:shadow-md">
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
        <div className="flex justify-between h-10 bg-slate-200 rounded-xl w-1/4"></div>
        <div className="h-28 bg-slate-800 rounded-2xl w-full"></div> 
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-200 rounded-2xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-80 bg-slate-200 rounded-2xl"></div>
            <div className="h-80 bg-slate-200 rounded-2xl"></div>
        </div>
    </div>
);

export default function DashboardOverview() {
    
    const [timeRange, setTimeRange] = useState('today');
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        const token = localStorage.getItem('token');
        setIsLoading(true);
        try {
            // ⚡ FIX: Removed the invalid venueId config entirely. The backend JWT handles it securely.
            const res = await axios.get(`/api/dashboard/overview?range=${timeRange}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setIsLoading(false);
        }
    }, [timeRange]); // ⚡ FIX: Dependency array is perfectly clean now

    useEffect(() => {
        fetchDashboardData();
        // Refresh live pulse data every 60 seconds
        const interval = setInterval(fetchDashboardData, 60000);
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    if (isLoading && !data) return <SkeletonLoader />;
    if (!data) return <div className='p-8 text-center text-slate-500 font-bold'>Failed to load data.</div>;

    const { kpis, livePulse, salesTrends, paymentBreakdown, topItems, categoryBreakdown } = data;
    const hasOrders = kpis.orders.value > 0;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen animate-in fade-in duration-500">
            
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
                    <p className="text-slate-500 font-medium mt-1">Track your venue's real-time performance.</p>
                </div>
                <select 
                    value={timeRange} 
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                >
                    <option value="today">Today</option>
                    <option value="week">Past 7 Days</option>
                    <option value="month">Past 30 Days</option>
                </select>
            </div>

            {/* THE LIVE PULSE BANNER */}
            <div className="bg-slate-900 rounded-[2rem] p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden border border-slate-800">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                
                <div className="relative z-10">
                    <h2 className="text-xl md:text-2xl font-black flex items-center gap-3 tracking-tight">
                        <span className="relative flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                        </span>
                        Live Pulse
                    </h2>
                    <p className="text-slate-400 font-medium mt-1 text-sm md:text-base">Real-time floor & kitchen metrics</p>
                </div>
                
                <div className="flex items-center gap-8 md:gap-12 w-full md:w-auto relative z-10 divide-x divide-slate-700">
                    <div className="pr-2 md:pr-0">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Flame size={16} className="text-amber-500" />
                            <span className="text-xs font-bold uppercase tracking-wider">Active Orders</span>
                        </div>
                        <p className="text-4xl md:text-5xl font-black text-white">{livePulse?.activeOrders || 0}</p>
                    </div>
                    <div className="pl-8 md:pl-12">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Clock size={16} className="text-indigo-400" />
                            <span className="text-xs font-bold uppercase tracking-wider">Avg Kitchen Time</span>
                        </div>
                        <p className="text-4xl md:text-5xl font-black text-white">
                            {/* ⚡ FIX: Corrected the spelling typo here so the minutes show up! */}
                            {livePulse?.averageFulfillmentTime || 0} <span className="text-xl md:text-2xl text-slate-500 font-bold">min</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* EMPTY STATE */}
            {!hasOrders ? (
                <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center shadow-sm max-w-3xl mx-auto mt-8">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Activity size={48} className="text-indigo-300" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">No orders found for this period</h2>
                    <p className="text-slate-500 mb-8 max-w-md mx-auto text-lg">It looks like things are quiet. Make sure your tables have QR codes and your menu is fully stocked!</p>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link to="/dashboard/qr" className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                            <QrCode size={20} /> Generate QR Codes
                        </Link>
                        <Link to="/dashboard/menu" className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-6 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95">
                            <PlusCircle size={20} /> Add Menu Items
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    {/* KPI Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard title="Gross Revenue" value={formatCurrency(kpis.revenue.value)} trend={kpis.revenue.trend} icon={DollarSign} />
                        <StatCard title="Total Orders" value={kpis.orders.value} trend={kpis.orders.trend} icon={ShoppingBag} />
                        <StatCard title="Avg Order Value" value={formatCurrency(kpis.aov.value)} trend={kpis.aov.trend} icon={CreditCard} />
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 mb-6 tracking-tight">Revenue Trend</h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={salesTrends}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `KSh ${val}`} dx={-10} />
                                        <RechartsTooltip 
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => [formatCurrency(value), 'Revenue']}
                                        />
                                        <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={4} dot={false} activeDot={{ r: 8, strokeWidth: 0, fill: '#4f46e5' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                            <h3 className="text-lg font-black text-slate-900 mb-2 tracking-tight">Payment Gateways</h3>
                            <div className="flex-1 w-full relative min-h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={paymentBreakdown} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {paymentBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap justify-center gap-4 mt-2">
                                {paymentBreakdown.map((entry, index) => (
                                    <div key={entry.name} className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        {entry.name} <span className="text-slate-400">({entry.value})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Charts Row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 mb-6 tracking-tight">Sales by Category</h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryBreakdown} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `KSh ${val}`} />
                                        <YAxis dataKey="category" type="category" stroke="#64748b" fontSize={12} fontWeight="bold" tickLine={false} axisLine={false} width={80} />
                                        <RechartsTooltip 
                                            cursor={{fill: '#f8fafc'}}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => [formatCurrency(value), 'Revenue']}
                                        />
                                        <Bar dataKey="revenue" fill="#10b981" radius={[0, 8, 8, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Top Performing Items</h3>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50">
                                        <tr>
                                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Item Name</th>
                                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Units Sold</th>
                                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {topItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 font-bold text-slate-900">{item.name}</td>
                                                <td className="p-4 text-slate-500 font-medium">
                                                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-sm">{item.total_sold}</span>
                                                </td>
                                                <td className="p-4 text-indigo-600 font-black text-right">{formatCurrency(item.total_revenue)}</td>
                                            </tr>
                                        ))}
                                        {topItems.length === 0 && (
                                            <tr><td colSpan="3" className="p-8 text-center text-slate-500 font-medium">No item data available.</td></tr>
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