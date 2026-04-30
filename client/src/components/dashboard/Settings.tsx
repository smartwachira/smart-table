import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';
import { Store, CreditCard, Sliders, Save, Loader2, Power, ImagePlus, Wifi } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettingsStore } from '../../store/useSettingsStore'; // ⚡ Global UI State

// 🛡️ Explicit Interfaces
export interface VenueSettingsFormData {
    name: string;
    location: string;
    contact_email: string;
    phone_number: string;
    tax_rate: number | string;
    is_accepting_orders: boolean | string;
    allow_cash_payments: boolean | string;
    wifi_ssid: string;
    wifi_password?: string;
    shift_duration_hours?: number | string;
    logo_url?: string;
}

// ⚡ HELPER: Bulletproof Image Pathing for the Venue Logo
const getImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path; 
    const sanitizedPath = path.replace(/\\/g, '/');
    const cleanPath = sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`;
    return `http://localhost:5000${cleanPath}`;
};

export default function Settings() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const token = localStorage.getItem('auth_token');
    
    const config = { 
        headers: { Authorization: `Bearer ${token}` } 
    };

    // ⚡ ZUSTAND: Preserve tab state across route unmounts
    const { activeTab, setActiveTab } = useSettingsStore();

    // Local Form State
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [formData, setFormData] = useState<VenueSettingsFormData>({
        name: '', location: '', contact_email: '', phone_number: '',
        tax_rate: 0, is_accepting_orders: true, allow_cash_payments: true,
        wifi_ssid: '', wifi_password: '', shift_duration_hours: 14
    });

    // ============================================================================
    // ⚡ TANSTACK QUERY: Server State Caching
    // ============================================================================
    const { data: venueSettings, isLoading } = useQuery({
        queryKey: ['venueSettings', user?.venueId],
        queryFn: async () => {
            const res = await axios.get<VenueSettingsFormData>('/api/settings/venue', config);
            return res.data;
        },
        enabled: !!user?.venueId && !!token
    });

    // Synchronize cached server data into local form state for editing
    useEffect(() => {
        if (venueSettings) {
            setFormData({
                ...venueSettings,
                wifi_ssid: venueSettings.wifi_ssid || '',
                wifi_password: venueSettings.wifi_password || ''
            });
            setLogoPreview(venueSettings.logo_url ? getImageUrl(venueSettings.logo_url) : null);
        }
    }, [venueSettings]);

    // ============================================================================
    // ⚡ TANSTACK MUTATIONS
    // ============================================================================
    const saveSettingsMutation = useMutation({
        mutationFn: async (updatedData: VenueSettingsFormData) => {
            return axios.put('/api/settings/venue', updatedData, config);
        },
        onSuccess: () => {
            toast.success("Settings saved successfully!");
            queryClient.invalidateQueries({ queryKey: ['venueSettings', user?.venueId] });
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || "Failed to save settings.");
        }
    });

    const uploadLogoMutation = useMutation({
        mutationFn: async (file: File) => {
            const uploadData = new FormData();
            uploadData.append('image', file);
            const res = await axios.post<{ logo_url: string }>('/api/settings/venue/logo', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success("Logo uploaded successfully!");
            setFormData(prev => ({ ...prev, logo_url: data.logo_url }));
            queryClient.invalidateQueries({ queryKey: ['venueSettings', user?.venueId] });
        },
        onError: () => {
            toast.error("Failed to upload logo.");
            setLogoPreview(venueSettings?.logo_url ? getImageUrl(venueSettings.logo_url) : null); // Revert on failure
        }
    });

    // ============================================================================
    // HANDLERS
    // ============================================================================
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Instant local preview for premium UX
        setLogoPreview(URL.createObjectURL(file));
        uploadLogoMutation.mutate(file);
    };

    if (isLoading && !venueSettings) {
        return (
            <div className="p-8 flex items-center justify-center text-slate-400 min-h-[50vh]">
                <Loader2 className="animate-spin mr-2" size={24} />
                <span className="font-bold">Loading settings...</span>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500 pb-24">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Venue Settings</h1>
                <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Manage your restaurant's profile, operations and billing.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                
                {/* Left Sidebar Navigation */}
                <aside className="w-full md:w-64 shrink-0 flex overflow-x-auto md:flex-col gap-2 custom-scrollbar pb-2 md:pb-0">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Store size={20} /> Venue Profile
                    </button>

                    <button
                        onClick={() => setActiveTab('operations')}
                        className={`shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'operations' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Sliders size={20} /> Operations
                    </button>
                    
                    <button
                        onClick={() => setActiveTab('billing')}
                        className={`shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'billing' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <CreditCard size={20} /> Billing & Plan
                    </button>
                </aside>

                {/* Right Content Area */}
                <main className="flex-1">
                    <form onSubmit={(e) => { e.preventDefault(); saveSettingsMutation.mutate(formData); }} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 md:p-8">

                        {/* TAB 1: VENUE PROFILE */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h2 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4">Basic Information</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-center gap-5 md:gap-6 pb-6 border-b border-slate-100 md:col-span-2">
                                        <div className="relative group w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                                            {logoPreview ? (
                                                <img 
                                                    src={logoPreview} 
                                                    alt="Venue Logo"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { 
                                                        const target = e.target as HTMLImageElement;
                                                        target.onerror = null; 
                                                        target.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <Store size={32} className="text-slate-300" />
                                            )}

                                            {/* Hover Overlay */}
                                            <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer backdrop-blur-sm">
                                                {uploadLogoMutation.isPending ? <Loader2 size={24} className="animate-spin" /> : <ImagePlus size={24} />}
                                                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Change</span>
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleLogoUpload}
                                                    disabled={uploadLogoMutation.isPending}
                                                />
                                            </label>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg text-slate-900">Brand Logo</h3>
                                            <p className="text-sm text-slate-500 mt-1 max-w-xs">This logo will appear on your digital menu and in the center of your generated QR codes.</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Venue Name</label>
                                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Contact Email <span className="font-normal text-slate-400">(Read Only)</span></label>
                                        <input type="email" value={formData.contact_email} disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed shadow-inner" />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-slate-700">Physical Location</label>
                                        <input type="text" name="location" value={formData.location} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Phone Number</label>
                                        <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} placeholder="+254..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: OPERATIONS */}
                        {activeTab === 'operations' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                                
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 mb-6 flex items-center gap-2">
                                        <Wifi size={20} className="text-indigo-500" /> Customer WiFi
                                    </h2>
                                    <p className="text-sm text-slate-500 mb-6">
                                        Configure your guest network credentials here. If provided, your generated QR table tents will automatically include a "Scan for WiFi" module.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Network Name (SSID)</label>
                                            <input 
                                                type="text" 
                                                name="wifi_ssid" 
                                                value={formData.wifi_ssid} 
                                                onChange={handleChange} 
                                                placeholder="e.g., Venue_Guest_WiFi"
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Network Password</label>
                                            <input 
                                                type="text" 
                                                name="wifi_password" 
                                                value={formData.wifi_password} 
                                                onChange={handleChange} 
                                                placeholder="Leave blank if open network"
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 mb-6">Shift Management</h2>
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <label className="text-sm font-bold text-slate-700 block mb-3">Shift Duration (Rolling Window)</label>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="range" 
                                                name="shift_duration_hours" 
                                                min="4" max="24" 
                                                value={formData.shift_duration_hours || 14} 
                                                onChange={handleChange} 
                                                className="flex-1 accent-indigo-600"
                                            />
                                            <span className="font-black text-indigo-600 bg-indigo-100 px-4 py-2 rounded-xl text-center min-w-[80px] border border-indigo-200 shadow-sm">
                                                {formData.shift_duration_hours || 14} hrs
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-3 font-medium">
                                            This controls how far back your Dashboard stats and Live Orders history will look. (Set this to cover your longest possible operational shift).
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 mb-6">Store Status</h2>
                                    <label className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${formData.is_accepting_orders ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                <Power size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">Accepting Digital Orders</h4>
                                                <p className="text-sm text-slate-500 mt-0.5">Toggle off to temporarily disable QR menus (e.g., closing time).</p>
                                            </div>
                                        </div>
                                        <div className="relative inline-flex items-center cursor-pointer self-end sm:self-auto shrink-0">
                                            <input 
                                                type="checkbox" 
                                                name="is_accepting_orders" 
                                                checked={formData.is_accepting_orders === true || formData.is_accepting_orders === 'true'} 
                                                onChange={handleChange} 
                                                className="sr-only peer" 
                                            />
                                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                                        </div>
                                    </label>
                                </div>

                                <div>
                                    <h2 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 mb-6">Payment & Taxes</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Tax Rate / VAT (%)</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    name="tax_rate" 
                                                    value={formData.tax_rate} 
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                            </div>
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="flex items-start sm:items-center gap-3 p-5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    name="allow_cash_payments" 
                                                    checked={formData.allow_cash_payments === true || formData.allow_cash_payments === 'true'} 
                                                    onChange={handleChange} 
                                                    className="w-5 h-5 mt-1 sm:mt-0 text-indigo-600 rounded focus:ring-indigo-500 shrink-0" 
                                                />
                                                <div>
                                                    <span className="font-bold text-slate-900 block">Allow "Pay Waiter" (Cash/Card Terminal)</span>
                                                    <span className="text-sm text-slate-500">Customers can bypass M-Pesa and request a waiter to collect payment.</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: BILLING */}
                        {activeTab === 'billing' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-16">
                                <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CreditCard size={32} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900">Subscription & Billing</h2>
                                <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
                                    You are currently on the <span className="font-bold text-indigo-600">Smart Table Early Access</span> plan. Billing management will be available before full release.
                                </p>
                            </div>
                        )}

                        {/* Save Button Footer */}
                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={saveSettingsMutation.isPending}
                                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70 shadow-lg shadow-indigo-200"
                            >
                                {saveSettingsMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                Save Changes
                            </button>
                        </div>

                    </form>
                </main>
            </div>
        </div>
    );
}