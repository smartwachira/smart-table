import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
    Search, Calendar, ChevronDown, Receipt, 
    CheckCircle2, Ban, Clock, User, Banknote 
} from 'lucide-react';
import { useOrderHistoryStore } from '../../store/useOrderHistoryStore'; 

// ⚡ IMPORT THE NEW CUSTOM HOOK AND TYPES
import { useOrderHistory, HistoryOrderData } from '../../hooks/useOrderHistory';

const formatCurrency = (val?: number | string) => new Intl.NumberFormat('en-KE', { 
    style: 'currency', currency: 'KES', minimumFractionDigits: 0 
}).format(Number(val) || 0);

const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('en-US', { 
        timeZone: 'Africa/Nairobi', 
        month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true 
    });
};

export default function OrderHistory() {
    const navigate = useNavigate();
    
    // ⚡ ZUSTAND: Immune to Sidebar unmounting
    const { 
        preset, label, customStart, customEnd, searchQuery, 
        setDateFilter, setSearchQuery 
    } = useOrderHistoryStore();

    // Local UI State
    const [selectedOrder, setSelectedOrder] = useState<HistoryOrderData | null>(null);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
    const [localCustomStart, setLocalCustomStart] = useState<string>(customStart);
    const [localCustomEnd, setLocalCustomEnd] = useState<string>(customEnd);
    const datePickerRef = useRef<HTMLDivElement>(null);

    // ============================================================================
    // ⚡ TANSTACK QUERY: Abstracted Custom Hook
    // ============================================================================
    const { data: orders = [], isLoading } = useOrderHistory(preset, customStart, customEnd);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (datePickerRef.current && !datePickerRef.current.contains(target) && target.tagName !== 'INPUT') {
                setIsDatePickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applyCustomDate = () => {
        if (!localCustomStart || !localCustomEnd) return;
        if (new Date(localCustomStart) > new Date(localCustomEnd)) {
            toast.error("Start date cannot be after end date."); return;
        }
        setDateFilter('custom', `${localCustomStart} to ${localCustomEnd}`, localCustomStart, localCustomEnd);
        setIsDatePickerOpen(false);
    };

    // Deep Search Filtering
    const filteredOrders = orders.filter(order => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase().trim();
        
        const shortId = order.order_id ? order.order_id.slice(0, 4).toLowerCase() : '';
        const customer = order.customer_name ? order.customer_name.toLowerCase() : '';
        const table = order.table_number ? order.table_number.toLowerCase() : '';
        
        return shortId.includes(query) || customer.includes(query) || table.includes(query);
    });

    const StatusBadge: React.FC<{ status: HistoryOrderData['status'] }> = ({ status }) => {
        const styles: Record<HistoryOrderData['status'], string> = {
            COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            CANCELLED: 'bg-red-100 text-red-800 border-red-200 line-through',
            PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
            PREPARING: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            READY: 'bg-blue-100 text-blue-800 border-blue-200',
        };
        return (
            <span className={`px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-lg border ${styles[status] || styles.PENDING}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen animate-in fade-in duration-500">
            
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Order History</h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Audit past transactions, receipts, and cancellations.</p>
                </div>

                <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search ID, name, or table..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        />
                    </div>

                    {/* Temporal Date Picker */}
                    <div className="relative w-full sm:w-56" ref={datePickerRef}>
                        <button 
                            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                            className="w-full flex items-center justify-between bg-white border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-2.5 shadow-sm hover:border-indigo-300 transition-colors text-sm"
                        >
                            <span className="flex items-center gap-2 truncate">
                                <Calendar size={18} className="text-indigo-500 shrink-0" /> 
                                <span className="truncate">{label}</span>
                            </span>
                            <ChevronDown size={18} className={`text-slate-400 shrink-0 ${isDatePickerOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDatePickerOpen && (
                            <div className="absolute top-full right-0 mt-2 w-full sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                <div className="p-2 border-b border-slate-100 grid grid-cols-2 gap-1">
                                    {[
                                        { label: 'Today', preset: 'today' }, { label: 'Yesterday', preset: 'yesterday' },
                                        { label: 'Last 7 Days', preset: '7days' }, { label: 'This Month', preset: 'thisMonth' },
                                        { label: 'Last Month', preset: 'lastMonth' }, { label: 'Year to Date', preset: 'ytd' }
                                    ].map(item => (
                                        <button 
                                            key={item.preset}
                                            onClick={() => { setDateFilter(item.preset, item.label); setIsDatePickerOpen(false); }}
                                            className={`text-left px-3 py-2 rounded-xl text-sm font-bold transition-colors ${preset === item.preset ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="p-4 space-y-3 bg-slate-50">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Range</p>
                                    <div className="flex gap-2">
                                        <input type="date" value={localCustomStart} onChange={(e) => setLocalCustomStart(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none" />
                                        <input type="date" value={localCustomEnd} onChange={(e) => setLocalCustomEnd(e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none" />
                                    </div>
                                    <button onClick={applyCustomDate} disabled={!localCustomStart || !localCustomEnd} className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg text-sm disabled:opacity-50">Apply Custom Dates</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Date & Time</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Order ID</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Customer & Table</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Payment</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Status</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading && orders.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-500 font-bold">Loading history...</td></tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr><td colSpan={7} className="p-12 text-center text-slate-500 font-bold">No orders found for this period.</td></tr>
                            ) : (
                                filteredOrders.map(order => (
                                    <tr key={order.order_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-sm font-medium text-slate-600">{formatDateTime(order.createdAt)}</td>
                                        <td className="p-4 text-sm font-black text-slate-900">#{order.order_id?.slice(0, 4).toUpperCase()}</td>
                                        <td className="p-4">
                                            <p className="text-sm font-bold text-slate-900">{order.customer_name || 'Guest'}</p>
                                            <p className="text-xs font-bold text-slate-500">{order.table_number}</p>
                                        </td>
                                        <td className="p-4 text-sm font-black text-indigo-600">{formatCurrency(order.total_amount)}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-lg border ${order.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                {order.payment_method}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center"><StatusBadge status={order.status} /></td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => setSelectedOrder(order)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                <Receipt size={14} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Receipt Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}></div>
                    <div className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
                        
                        {/* Receipt Header */}
                        <div className="bg-slate-50 p-6 border-b border-slate-200 text-center">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Order Receipt</h2>
                            <p className="text-slate-500 font-medium text-sm mt-1">{formatDateTime(selectedOrder.createdAt)}</p>
                            <p className="text-slate-400 font-bold text-xs mt-1">ID: {selectedOrder.order_id}</p>
                        </div>

                        {/* Receipt Details */}
                        <div className="p-6 space-y-6">
                            <div className="flex justify-between items-start border-b border-dashed border-slate-300 pb-4">
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Customer</p>
                                    <p className="font-bold text-slate-900 flex items-center gap-1.5"><User size={14}/> {selectedOrder.customer_name || 'Guest'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Location</p>
                                    <p className="font-bold text-slate-900">{selectedOrder.table_number}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Items</p>
                                {selectedOrder.OrderItems?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start text-sm">
                                        <div className="flex gap-2">
                                            <span className="font-black text-slate-400">{item.quantity}x</span>
                                            <div>
                                                <p className="font-bold text-slate-800">{item.MenuItem?.name || item.name}</p>
                                                {item.notes && <p className="text-xs text-slate-500 font-medium">Note: {item.notes}</p>}
                                            </div>
                                        </div>
                                        <span className="font-bold text-slate-700">{formatCurrency(item.price_at_time * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-200">
                                <div className="flex justify-between text-sm font-bold text-slate-600">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(selectedOrder.total_amount)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                    <span className="font-black text-slate-900">Total Paid</span>
                                    <span className="text-xl font-black text-indigo-600">{formatCurrency(selectedOrder.total_amount)}</span>
                                </div>
                            </div>

                            {/* Audit Trail Info */}
                            {selectedOrder.payment_method === 'CASH' && selectedOrder.CashCollector && (
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100">
                                    <Banknote size={14} /> Cash collected by {selectedOrder.CashCollector.name}
                                </div>
                            )}

                            {selectedOrder.status === 'CANCELLED' && (
                                <div className="flex items-start gap-2 text-xs font-bold text-red-700 bg-red-50 p-3 rounded-xl border border-red-100">
                                    <Ban size={14} className="shrink-0 mt-0.5" /> 
                                    <span>{selectedOrder.notes || 'Order cancelled without reason.'}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <button 
                                onClick={() => setSelectedOrder(null)}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Close Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}