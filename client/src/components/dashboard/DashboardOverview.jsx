import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { 
    TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
    CreditCard, Activity, QrCode, PlusCircle, Clock, Flame,
    Calendar, ChevronDown, Download, AlertTriangle, CheckCircle2, AlertCircle
} from 'lucide-react';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const formatCurrency = (val) => new Intl.NumberFormat('en-KE', { 
    style: 'currency', 
    currency: 'KES', 
    minimumFractionDigits: 0 
}).format(val || 0);

const formatTimeLabel = (isoString, granularity) => {
    if (!isoString) return '';
    const safeString = String(isoString).replace(' ', 'T');
    const date = new Date(safeString);
    
    if (isNaN(date.getTime())) return String(isoString).split('T')[0];

    const timeZone = 'Africa/Nairobi';

    if (granularity === 'hour'){
        return `${date.toLocaleTimeString('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false })}, ${date.toLocaleDateString('en-US',{ timeZone, weekday: 'short' })}`;
    } else if (granularity === 'day'){
        return `${date.toLocaleDateString('en-US', { timeZone, month: 'short', day: 'numeric' })}, ${date.toLocaleDateString('en-US', { timeZone, weekday: 'short' })}`;
    } else if (granularity === 'month'){
        return date.toLocaleDateString('en-US', { timeZone, month: 'short', year: 'numeric' });
    } else {
        return `${date.toLocaleDateString('en-US', { timeZone, month: 'short', year: 'numeric' })} ${date.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })}`;
    }
};

const generateCSV = (data, dateRangeLabel) => {
    if (!data) return;
    const { kpis, livePulse, salesTrends, categoryBreakdown, topItems } = data;

    let csv = `Smart Table Analytical Report - ${dateRangeLabel}\n\n`;

    csv += "--- EXECUTIVE SUMMARY ---\n";
    csv += 'Metric,Value,Trend\n';
    csv += `Gross Revenue,${kpis.revenue?.value || 0},${kpis.revenue?.trend || 0}%\n`;
    csv += `Total Orders,${kpis.orders?.value || 0},${kpis.orders?.trend || 0}%\n`;
    csv += `Avg Order Value,${kpis.aov?.value || 0},${kpis.aov?.trend || 0}%\n`;
    csv += `Live Active Orders,${livePulse?.activeOrders || 0},N/A\n`;
    csv += `Avg Kitchen Time (min),${livePulse?.averageFulfillmentTime || 0},N/A\n\n`;

    csv += "--- SALES TRENDS ---\n";
    csv += "Timestamp,Current Revenue,Previous Revenue,Current Orders,Previous Orders\n";
    (salesTrends || []).forEach(row => {
        csv += `${row.timeLabel},${row.currentRevenue},${row.previousRevenue},${row.currentOrders},${row.previousOrders}\n`;
    });
    csv += "\n";

    csv += "--- CATEGORY PERFORMANCE ---\n";
    csv += "Category,Units Sold,Revenue\n";
    (categoryBreakdown || []).forEach(row => {
        csv += `${row.category},${row.total_sold},${row.revenue}\n`;
    });
    csv += "\n";

    csv += "--- TOP PERFORMING ITEMS ---\n";
    csv += "Item Name,Units Sold,Revenue\n";
    (topItems || []).forEach(row =>{
        const safeName = row.name ? `"${row.name.replace(/"/g, '""')}"` : '"Unknown"';
        csv += `${safeName},${row.total_sold},${row.total_revenue}\n`;
    });

    const blob = new Blob([csv],{ type: 'text/csv;charset=utf-8;'});
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute("download", `SmartTable_Report_${dateRangeLabel.replace(/\s+/g,'_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const StatCard = ({ title, value, trend, icon: Icon, LinkTo }) => {
    const isPositive = Number(trend) >= 0;
    const CardContent = (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col transition-all hover:shadow-md h-full hover:border-indigo-200 group">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon size={20} className="sm:w-6 sm:h-6" />
                </div>
                {trend !== undefined && (
                    <span className={`flex items-center gap-1 text-xs sm:text-sm font-bold px-2.5 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(trend || 0)}%
                    </span>
                )}
            </div>
            <h3 className="text-slate-500 font-bold text-xs sm:text-sm uppercase tracking-wider line-clamp-1">{title}</h3>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 truncate">{value}</p>
        </div>
    );

    return LinkTo ? <Link to={LinkTo} className="block">{CardContent}</Link> : CardContent;
};

const ComparativeTooltip = ({ active, payload, label, granularity }) => {
    if (active && payload && payload.length) {
        const current = payload.find(p => p.dataKey === 'currentRevenue')?.value || 0;
        const previous = payload.find(p => p.dataKey === 'previousRevenue')?.value || 0;
        const diff = current - previous;
        const isPositive = diff >= 0;

        return (
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-xl border border-slate-100 min-w-[160px] sm:min-w-[200px] text-xs sm:text-sm">
                <p className="font-bold text-slate-500 mb-2 pb-2 border-b border-slate-100">
                    {formatTimeLabel(label, granularity)}
                </p>
                <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 font-bold text-indigo-600">
                            <div className="w-2 h-2 rounded-full bg-indigo-600"></div> Current
                        </span>
                        <span className="font-black text-slate-900">{formatCurrency(current)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 font-bold text-slate-400">
                            <div className="w-2 h-2 rounded-full bg-slate-300"></div> Previous
                        </span>
                        <span className="font-bold text-slate-500">{formatCurrency(previous)}</span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-slate-50 flex justify-between items-center font-bold">
                        <span className="text-slate-400">Difference</span>
                        <span className={isPositive ? 'text-emerald-500': 'text-red-500'}>
                            {isPositive ? '+' : ''}{formatCurrency(diff)}
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const SkeletonLoader = () => (
    <div className="space-y-4 sm:space-y-6 animate-pulse p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex justify-between h-8 sm:h-10 bg-slate-200 rounded-xl w-1/2 md:w-1/4"></div>
        <div className="h-24 sm:h-28 bg-slate-800 rounded-2xl sm:rounded-3xl w-full"></div> 
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 sm:h-40 bg-slate-200 rounded-2xl"></div>)}
        </div>
        <div className="h-64 sm:h-96 bg-slate-200 rounded-2xl sm:rounded-3xl w-full"></div>
    </div>
);

// ⚡ The 'Cold Start' Onboarding Component
const OnboardingChecklist = () => (
    <div className="bg-white border border-indigo-100 rounded-[1.5rem] sm:rounded-3xl p-6 sm:p-10 shadow-lg shadow-indigo-50/50 max-w-4xl mx-auto mt-4 sm:mt-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity size={32} className="sm:w-10 sm:h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Welcome to Smart Table!</h2>
            <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">Your dashboard is empty because you haven't received any orders yet. Let's get your venue set up and ready for customers.</p>
        </div>

        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><CheckCircle2 size={20} /></div>
                    <div>
                        <h4 className="font-bold text-slate-900">1. Create your Menu</h4>
                        <p className="text-sm text-slate-500 mt-1">Add categories (Drinks, Mains) and items so customers can order.</p>
                    </div>
                </div>
                <Link to="/dashboard/menu" className="w-full sm:w-auto bg-white border border-slate-200 text-indigo-600 font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-center text-sm">Go to Menu</Link>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><AlertCircle size={20} /></div>
                    <div>
                        <h4 className="font-bold text-slate-900">2. Generate QR Codes</h4>
                        <p className="text-sm text-slate-500 mt-1">Create and print QR codes for your tables to enable Smart Ordering.</p>
                    </div>
                </div>
                <Link to="/dashboard/qr" className="w-full sm:w-auto bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 text-center text-sm">Setup QR Codes</Link>
            </div>
        </div>
    </div>
);

export default function DashboardOverview() {
    const [dateRange, setDateRange] = useState({ label: 'Today', preset: 'today', start: '', end: '' });
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const datePickerRef = useRef(null);

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
                setIsDatePickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ⚡ Network Resilience: AbortController integrated
    const fetchDashboardData = useCallback(async (isSilent = false, signal) => {
        ///const token = localStorage.getItem('auth_token');
        if (!isSilent) setIsLoading(true);
        setErrorMsg(null);
        
        try {
            const now = new Date();
            let startDateStr = new Date();
            let endDateStr = new Date(now);

            if (dateRange.preset === 'custom') {
                const startObj = new Date(dateRange.start);
                startObj.setHours(0,0,0,0);
                startDateStr = startObj;

                const endObj = new Date(dateRange.end);
                endObj.setHours(23,59,59,999);
                endDateStr = endObj; 
            } else {
                switch (dateRange.preset) {
                    case 'yesterday':
                        startDateStr.setDate(now.getDate() - 1);
                        startDateStr.setHours(0,0,0,0);
                        endDateStr = new Date(startDateStr);
                        endDateStr.setHours(23,59,59,999);
                        break;
                    case '7days':
                        startDateStr.setDate(now.getDate() - 7);
                        break;
                    case 'thisMonth':
                        startDateStr = new Date(now.getFullYear(), now.getMonth(), 1);
                        break;
                    case 'lastMonth':
                        startDateStr = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        endDateStr = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                        break;
                    case 'ytd':
                        startDateStr = new Date(now.getFullYear(), 0, 1);
                        break;
                    default: 
                        startDateStr.setHours(0,0,0,0);
                }
            }
            
            const res = await axios.get(`/api/dashboard/overview`, {
                params: { startDate: startDateStr.toISOString(), endDate: endDateStr.toISOString() },
                signal // ⚡ Pass the abort signal to Axios
            });

            if (typeof res.data === 'string' && res.data.includes('<!DOCTYPE html>')) {
                throw new Error("Received HTML instead of JSON. The backend route is not mounted.");
            }

            setData(res.data);
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log('Request canceled due to race condition prevention.');
            } else {
                setErrorMsg(error.response?.data?.message || error.message || "Failed to fetch dashboard data.");
            }
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        // ⚡ Create the AbortController for this render cycle
        const controller = new AbortController();
        
        fetchDashboardData(false, controller.signal);
        
        const interval = setInterval(() => fetchDashboardData(true, controller.signal), 60000);
        
        // ⚡ Cleanup: Abort any pending requests when the component unmounts or dateRange changes
        return () => {
            clearInterval(interval);
            controller.abort();
        };
    }, [fetchDashboardData]);

    const applyCustomDate = () => {
        if (!customStart || !customEnd) return;
        if (new Date(customStart) > new Date(customEnd)) {
            alert("Start date cannot be after end date.");
            return;
        }
        setDateRange({ label: `${customStart} to ${customEnd}`, preset: 'custom', start: customStart, end: customEnd });
        setIsDatePickerOpen(false);
    };

    if (isLoading && !data) return <SkeletonLoader />;

    if (errorMsg || !data || !data.kpis) {
        return (
            <div className="p-4 sm:p-8 flex flex-col items-center justify-center text-center mt-12 animate-in fade-in">
                <Activity size={40} className="text-red-400 mb-4 sm:w-12 sm:h-12" />
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Connection Error</h2>
                <p className="text-sm sm:text-base text-slate-500 max-w-md">{errorMsg || "Failed to load dashboard structure."}</p>
            </div>
        );
    }

    const { granularity, kpis, livePulse, salesTrends, paymentBreakdown, topItems, categoryBreakdown } = data;
    const hasOrders = kpis.orders?.value > 0;
    
    // ⚡ 'Cold Start' Detection Logic
    // If there is no lifetime revenue, we assume it's a brand new account needing onboarding
    const isColdStart = !hasOrders && (data.kpis.revenue?.value === 0);

    const sanitizedCategoryBreakdown = (categoryBreakdown || []).map(item => ({
        category: item.category || 'Uncategorized',
        revenue: Number(item.revenue || 0) 
    }));

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 bg-slate-50 min-h-screen animate-in fade-in duration-500">
            
            {/* Header & Filters */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4 mb-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Track your venue's real-time performance.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
                    {hasOrders && (
                        <button onClick={() => generateCSV(data, dateRange.label)} className="flex justify-center items-center gap-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl px-4 py-3 sm:py-2.5 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm w-full sm:w-auto text-sm sm:text-base">
                            <Download size={18} /> Export
                        </button>
                    )}

                    {/* Custom Date Range Picker */}
                    <div className="relative w-full sm:w-56" ref={datePickerRef}>
                        <button 
                            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                            className="w-full flex items-center justify-between bg-white border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-3 sm:py-2.5 shadow-sm hover:border-indigo-300 transition-colors text-sm sm:text-base"
                        >
                            <span className="flex items-center gap-2 truncate"><Calendar size={18} className="text-indigo-500 shrink-0" /> <span className="truncate">{dateRange.label}</span></span>
                            <ChevronDown size={18} className={`text-slate-400 transition-transform shrink-0 ${isDatePickerOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDatePickerOpen && (
                            <div className="absolute top-full left-0 sm:left-auto right-0 mt-2 w-full sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                <div className="p-2 border-b border-slate-100 grid grid-cols-2 gap-1">
                                    {[
                                        { label: 'Today', preset: 'today' }, { label: 'Yesterday', preset: 'yesterday' },
                                        { label: 'Last 7 Days', preset: '7days' }, { label: 'This Month', preset: 'thisMonth' },
                                        { label: 'Last Month', preset: 'lastMonth' }, { label: 'Year to Date', preset: 'ytd' }
                                    ].map(item => (
                                        <button 
                                            key={item.preset}
                                            onClick={() => { setDateRange({ label: item.label, preset: item.preset }); setIsDatePickerOpen(false); }}
                                            className={`text-left px-3 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${dateRange.preset === item.preset ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="p-4 space-y-3 bg-slate-50/50">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Range</p>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg p-2.5 sm:p-2 outline-none focus:border-indigo-500 bg-white" />
                                        <span className="text-slate-400 font-bold text-xs text-center hidden sm:block">TO</span>
                                        <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg p-2.5 sm:p-2 outline-none focus:border-indigo-500 bg-white" />
                                    </div>
                                    <button 
                                        onClick={applyCustomDate}
                                        disabled={!customStart || !customEnd}
                                        className="w-full bg-indigo-600 text-white font-bold py-3 sm:py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                    >
                                        Apply Custom Dates
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* LIVE PULSE BANNER */}
            <div className="bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5 sm:gap-6 relative overflow-hidden border border-slate-800">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="relative z-10">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-black flex items-center gap-2 sm:gap-3 tracking-tight">
                        <span className="relative flex h-3 w-3 sm:h-4 sm:w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 sm:h-4 sm:w-4 bg-emerald-500"></span></span>
                        Live Pulse
                    </h2>
                    <p className="text-slate-400 font-medium mt-1 text-xs sm:text-sm md:text-base">Real-time floor & kitchen metrics</p>
                </div>
                <div className="flex items-center justify-start gap-6 sm:gap-8 md:gap-12 w-full md:w-auto relative z-10 divide-x divide-slate-700/50">
                    <div className="pr-2 sm:pr-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400 mb-1"><Flame size={14} className="text-amber-500 sm:w-4 sm:h-4" /><span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Active Orders</span></div>
                        <p className="text-3xl sm:text-4xl md:text-5xl font-black text-white">{livePulse?.activeOrders || 0}</p>
                    </div>
                    <div className="pl-6 sm:pl-8 md:pl-12">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400 mb-1"><Clock size={14} className="text-indigo-400 sm:w-4 sm:h-4" /><span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Avg Kitchen Time</span></div>
                        <p className="text-3xl sm:text-4xl md:text-5xl font-black text-white">{livePulse?.averageFulfillmentTime || 0} <span className="text-lg sm:text-xl md:text-2xl text-slate-500 font-bold">min</span></p>
                    </div>
                </div>
            </div>

            {/* ⚡ Actionable 'Smart Alerts' */}
            {livePulse?.averageFulfillmentTime > 20 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start sm:items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="text-red-500 shrink-0"><AlertTriangle size={20} /></div>
                    <div>
                        <h4 className="font-bold text-red-800 text-sm sm:text-base">High Kitchen Latency</h4>
                        <p className="text-xs sm:text-sm text-red-600 mt-0.5">Average ticket fulfillment is taking longer than 20 minutes. Check the <Link to="/dashboard/orders" className="font-bold underline hover:text-red-800">Live Orders screen</Link> to assist the kitchen.</p>
                    </div>
                </div>
            )}

            {isColdStart ? (
                <OnboardingChecklist />
            ) : !hasOrders ? (
                /* Quiet Day Empty State */
                <div className="bg-white border border-slate-200 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-12 text-center shadow-sm max-w-3xl mx-auto mt-4 sm:mt-8 animate-in fade-in">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6"><Activity size={32} className="text-indigo-300 sm:w-12 sm:h-12" /></div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">No orders found for this period</h2>
                    <p className="text-slate-500 mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-lg px-2">It looks like things are quiet. Try selecting a different date range or ensure your venue is open for business!</p>
                </div>
            ) : (
                <>
                    {/* KPI Grid - Wrapped in React Router Links */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard title="Gross Revenue" value={formatCurrency(kpis.revenue?.value)} trend={kpis.revenue?.trend} icon={DollarSign} LinkTo="/dashboard/orders" />
                        <StatCard title="Total Orders" value={kpis.orders?.value || 0} trend={kpis.orders?.trend} icon={ShoppingBag} LinkTo="/dashboard/orders" />
                        <StatCard title="Avg Order Value" value={formatCurrency(kpis.aov?.value)} trend={kpis.aov?.trend} icon={CreditCard} />
                        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center transition-all hover:border-indigo-200 group">
                             <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform"><QrCode size={20} className="sm:w-6 sm:h-6" /></div>
                             <h3 className="text-slate-500 font-bold text-xs sm:text-sm uppercase tracking-wider mb-1">Floor Plan</h3>
                             <Link to="/dashboard/qr" className="text-indigo-600 font-bold hover:underline text-xs sm:text-sm">Manage Tables &rarr;</Link>
                        </div>
                    </div>

                    {/* Comparative Line Chart */}
                    <div className="bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-3xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Revenue Trend</h3>
                            <div className="flex flex-wrap gap-3 sm:gap-4">
                                <span className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-slate-600">
                                    <div className="w-2.5 h-1 sm:w-3 rounded-full bg-indigo-600"></div> Current
                                </span>
                                <span className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-slate-400">
                                    <div className="w-2.5 h-1 sm:w-3 rounded-full bg-slate-300"></div> Previous
                                </span>
                            </div>
                        </div>

                        <div className="h-[250px] sm:h-[300px] md:h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={salesTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="timeLabel" 
                                        stroke="#94a3b8" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        dy={10} 
                                        tickFormatter={(val) => formatTimeLabel(val, granularity)}
                                        minTickGap={30}
                                        interval="preserveStartEnd" 
                                    />
                                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `KSh ${val}`} />
                                    <RechartsTooltip content={<ComparativeTooltip granularity={granularity} />} />
                                    <Line type="monotone" dataKey="previousRevenue" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={false} />
                                    <Line type="monotone" dataKey="currentRevenue" stroke="#4f46e5" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bottom Row Charts */}
                    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                        {/* Doughnut Chart */}
                        <div className="bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:w-1/3">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 mb-2 tracking-tight">Gateways</h3>
                            <div className="flex-1 w-full relative h-[200px] sm:h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={paymentBreakdown || []} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                            {(paymentBreakdown || []).map((entry, index)=> <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none',boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}></RechartsTooltip>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-2 sm:mt-4">
                                {(paymentBreakdown || []).map((entry, index) => (
                                    <div key={entry.name} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-slate-600">
                                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        {entry.name} <span className="text-slate-400">({entry.value})</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Category Breakdown Bar Chart */}
                        <div className="bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-3xl border border-slate-200 shadow-sm flex-1">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 mb-4 sm:mb-6 tracking-tight">Sales by Category</h3>
                            <div className="h-[250px] sm:h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sanitizedCategoryBreakdown} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `KSh ${val}`} />
                                        <YAxis dataKey="category" type="category" stroke="#64748b" fontSize={10} sm:fontSize={12} fontWeight="bold" tickLine={false} axisLine={false} width={80} />
                                        <RechartsTooltip 
                                            cursor={{fill: '#f8fafc'}}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => [formatCurrency(value), 'Revenue']}
                                        />
                                        <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} sm:barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Top Items Table */}
                    <div className="bg-white rounded-[1.5rem] sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Top Performing Items</h3>
                            {/* ⚡ Actionable Routing: Send them to the menu editor */}
                            <Link to="/dashboard/menu" className="text-indigo-600 font-bold hover:underline text-xs sm:text-sm">Manage Menu &rarr;</Link>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar flex-1 max-h-[300px]">
                            <table className="w-full text-left min-w-[450px] sm:min-w-[500px]">
                                <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
                                    <tr>
                                        <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Item Name</th>
                                        <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Units Sold</th>
                                        <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(topItems || []).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-3 sm:p-4 font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[150px] sm:max-w-[200px]">{item.name}</td>
                                            <td className="p-3 sm:p-4 text-slate-500 font-medium text-center">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-xs sm:text-sm">{item.total_sold}</span>
                                            </td>
                                            <td className="p-3 sm:p-4 text-indigo-600 font-black text-xs sm:text-sm text-right">{formatCurrency(item.total_revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}