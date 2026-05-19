import React, { useState, useEffect } from "react";
import { toast } from 'sonner';
import { Store, CreditCard, Sliders, Save, Loader2, Power, ImagePlus, Wifi, Building, ShieldCheck, Smartphone, Landmark } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettingsStore } from '../../store/useSettingsStore'; 

// ⚡ IMPORT THE CUSTOM HOOKS AND TYPES
import { 
    useFetchSettings, useUpdateSettings, useUploadLogo, useOnboardSubaccount,
    VenueSettingsFormData, getImageUrl 
} from '../../hooks/useSettings';

// 🛡️ 1. ENTERPRISE FIX: Official Paystack Kenyan Bank Codes
const KENYAN_BANKS = [
    { name: "KCB", code: "011" },
    { name: "Equity Bank", code: "068" },
    { name: "Co-operative Bank", code: "012" },
    { name: "Absa Bank", code: "003" },
    { name: "Standard Chartered Bank", code: "002" },
    { name: "NCBA", code: "071" },
    { name: "Diamond Trust Bank", code: "063" },
    { name: "I&M Bank", code: "009" },
    { name: "Stanbic Bank", code: "043" },
    { name: "Family Bank", code: "070" }
];

export default function Settings() {
    const { user } = useAuth();
    const venueId = user?.venueId;
    
    // ⚡ ZUSTAND: Preserve tab state across route unmounts
    const { activeTab, setActiveTab } = useSettingsStore();

    // Local Form State
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [formData, setFormData] = useState<VenueSettingsFormData>({
        name: '', location: '', contact_email: '', phone_number: '',
        tax_rate: 0, is_accepting_orders: true, allow_cash_payments: true,
        wifi_ssid: '', wifi_password: '', shift_duration_hours: 14
    });

    // ⚡ 2. ENTERPRISE FIX: Default to actual bank codes
    const [payoutChannel, setPayoutChannel] = useState<'MPESA' | 'BANK'>('MPESA');
    const [mpesaType, setMpesaType] = useState<'TILL' | 'PAYBILL'>('TILL');
    const [payoutForm, setPayoutForm] = useState({ 
        bank_code: KENYAN_BANKS[0].code, 
        account_number: '', 
        paybill_account: '' 
    });

    // ============================================================================
    // ⚡ TANSTACK QUERY: Abstracted Custom Hooks
    // ============================================================================
    const { data: venueSettings, isLoading } = useFetchSettings(venueId);
    
    const saveSettingsMutation = useUpdateSettings(venueId);
    const uploadLogoMutation = useUploadLogo(venueId);
    const onboardSubaccountMutation = useOnboardSubaccount(venueId);

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLogoPreview(URL.createObjectURL(file));
        
        uploadLogoMutation.mutate(file, {
            onSuccess: (data) => setFormData(prev => ({ ...prev, logo_url: data.logo_url })),
            onError: () => {
                toast.error("Failed to upload logo.");
                setLogoPreview(venueSettings?.logo_url ? getImageUrl(venueSettings.logo_url) : null);
            }
        });
    };

    // ⚡ 3. ENTERPRISE FIX: The Precise Subaccount Router
    const handleSubaccountOnboard = (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalSettlementBank = '';
        let finalAccountNumber = payoutForm.account_number;

        if (payoutChannel === 'MPESA') {
            // Paystack requires exact strict codes for Mobile Money Payouts
            finalSettlementBank = mpesaType === 'TILL' ? 'MPTILL' : 'MPPAYBILL'; 
            
            if (payoutForm.account_number.length < 5) return toast.error("Business number must be at least 5 digits.");
            
            if (mpesaType === 'PAYBILL' && payoutForm.paybill_account) {
                finalAccountNumber = `${payoutForm.account_number}-${payoutForm.paybill_account}`;
            }
        } else {
            // We pass the numerical code (e.g. "068"), NOT the string ("Equity Bank")
            finalSettlementBank = payoutForm.bank_code;
            if (payoutForm.account_number.length < 8) return toast.error("Please enter a valid bank account number.");
        }
        
        onboardSubaccountMutation.mutate({
            settlement_bank: finalSettlementBank,
            account_number: finalAccountNumber
        }, {
            onSuccess: () => {
                setPayoutForm({ bank_code: KENYAN_BANKS[0].code, account_number: '', paybill_account: '' });
            }
        });
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
                        <CreditCard size={20} /> Billing & Payouts
                    </button>
                </aside>

                {/* Right Content Area */}
                <main className="flex-1">
                    
                    {/* TAB 1 & 2: Wrapped in standard Form */}
                    {(activeTab === 'profile' || activeTab === 'operations') && (
                        <form onSubmit={(e) => { e.preventDefault(); saveSettingsMutation.mutate(formData); }} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 md:p-8">

                            {/* TAB 1: VENUE PROFILE */}
                            {activeTab === 'profile' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4">Basic Information</h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex items-center gap-5 md:gap-6 pb-6 border-b border-slate-100 md:col-span-2">
                                            <div className="relative group w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                                                {logoPreview ? (
                                                    <img src={logoPreview} alt="Venue" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                ) : <Store size={32} className="text-slate-300" />}

                                                <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer backdrop-blur-sm">
                                                    {uploadLogoMutation.isPending ? <Loader2 size={24} className="animate-spin" /> : <ImagePlus size={24} />}
                                                    <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Change</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadLogoMutation.isPending} />
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-700">Network Name (SSID)</label>
                                                <input type="text" name="wifi_ssid" value={formData.wifi_ssid} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-700">Network Password</label>
                                                <input type="text" name="wifi_password" value={formData.wifi_password} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner transition-all" />
                                            </div>
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
                                                <input type="checkbox" name="is_accepting_orders" checked={formData.is_accepting_orders === true || formData.is_accepting_orders === 'true'} onChange={handleChange} className="sr-only peer" />
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
                                                    <input type="number" step="0.01" name="tax_rate" value={formData.tax_rate} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner" />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                                </div>
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <label className="flex items-start sm:items-center gap-3 p-5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                                    <input type="checkbox" name="allow_cash_payments" checked={formData.allow_cash_payments === true || formData.allow_cash_payments === 'true'} onChange={handleChange} className="w-5 h-5 mt-1 sm:mt-0 text-indigo-600 rounded focus:ring-indigo-500 shrink-0" />
                                                    <div>
                                                        <span className="font-bold text-slate-900 block">Allow "Pay Waiter" (Cash/Card Terminal)</span>
                                                        <span className="text-sm text-slate-500">Customers can bypass digital payments and request a waiter to collect payment manually.</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                                <button type="submit" disabled={saveSettingsMutation.isPending} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70 shadow-lg shadow-indigo-200">
                                    {saveSettingsMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                    Save Profile & Operations
                                </button>
                            </div>
                        </form>
                    )}

                    {/* TAB 3: BILLING & PAYOUTS (Enterprise Financial Routing) */}
                    {activeTab === 'billing' && (
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 md:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 mb-6">Financial Payouts</h2>
                            
                            {venueSettings?.is_financially_onboarded ? (
                                <div className="bg-emerald-50 border border-emerald-200 p-6 md:p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-sm">
                                        <ShieldCheck size={32} />
                                    </div>
                                    <h3 className="text-xl font-black text-emerald-900">Payments Online</h3>
                                    <p className="text-emerald-700 text-sm max-w-md leading-relaxed">
                                        Your venue is actively receiving digital payments. Funds are securely routed via Paystack directly to your chosen settlement account.
                                    </p>
                                    
                                    <div className="w-full max-w-xs bg-white border border-emerald-100 rounded-xl p-4 mt-4 flex justify-between items-center shadow-sm">
                                        <div className="flex flex-col text-left">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settlement Code</span>
                                            <span className="font-black text-slate-800">{venueSettings.settlement_bank}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Masked Account</span>
                                            <span className="font-mono font-bold text-slate-600 block pt-0.5">**** {venueSettings.account_number_last_4}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl flex items-start gap-4">
                                        <Building className="text-indigo-600 shrink-0 mt-1" size={24} />
                                        <div>
                                            <h4 className="font-bold text-indigo-900">Activate Digital Payments</h4>
                                            <p className="text-sm text-indigo-700 mt-1 leading-relaxed">
                                                Provide your business settlement details below to enable M-Pesa and Card processing.
                                            </p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubaccountOnboard} className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-slate-700">Settlement Channel</label>
                                            <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                                                <button 
                                                    type="button" 
                                                    onClick={() => setPayoutChannel('MPESA')}
                                                    className={`flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${payoutChannel === 'MPESA' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    <Smartphone size={18} /> Mobile Money
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setPayoutChannel('BANK')}
                                                    className={`flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${payoutChannel === 'BANK' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    <Landmark size={18} /> Bank Transfer
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-5 animate-in fade-in">
                                            
                                            {payoutChannel === 'BANK' && (
                                                <>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-bold text-slate-700">Select Kenyan Bank</label>
                                                        <select 
                                                            value={payoutForm.bank_code}
                                                            onChange={(e) => setPayoutForm({ ...payoutForm, bank_code: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner font-bold text-slate-800"
                                                        >
                                                            {KENYAN_BANKS.map(bank => (
                                                                <option key={bank.code} value={bank.code}>{bank.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-bold text-slate-700">Account Number</label>
                                                        <input 
                                                            type="text" 
                                                            required
                                                            placeholder="e.g. 01234567890"
                                                            value={payoutForm.account_number}
                                                            onChange={(e) => setPayoutForm({ ...payoutForm, account_number: e.target.value.replace(/\D/g, '') })}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner font-mono text-lg tracking-widest"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {payoutChannel === 'MPESA' && (
                                                <>
                                                    <div className="space-y-3 mb-4">
                                                        <label className="text-sm font-bold text-slate-700">M-Pesa Business Type</label>
                                                        <div className="flex gap-4">
                                                            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                                                                <input type="radio" checked={mpesaType === 'TILL'} onChange={() => setMpesaType('TILL')} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                                                                Till Number (Buy Goods)
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                                                                <input type="radio" checked={mpesaType === 'PAYBILL'} onChange={() => setMpesaType('PAYBILL')} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                                                                Paybill
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-sm font-bold text-slate-700">Business Number ({mpesaType})</label>
                                                        <input 
                                                            type="text" 
                                                            required
                                                            placeholder={mpesaType === 'TILL' ? "e.g. 123456" : "e.g. 522522"}
                                                            value={payoutForm.account_number}
                                                            onChange={(e) => setPayoutForm({ ...payoutForm, account_number: e.target.value.replace(/\D/g, '') })}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner font-mono text-lg tracking-widest"
                                                        />
                                                    </div>

                                                    {mpesaType === 'PAYBILL' && (
                                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                            <label className="text-sm font-bold text-slate-700">Paybill Account Number (Optional)</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="e.g. YOUR_BUSINESS_NAME"
                                                                value={payoutForm.paybill_account}
                                                                onChange={(e) => setPayoutForm({ ...payoutForm, paybill_account: e.target.value.toUpperCase() })}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner font-mono text-lg tracking-widest"
                                                            />
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        <button 
                                            type="submit"
                                            disabled={onboardSubaccountMutation.isPending || !payoutForm.account_number}
                                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white rounded-2xl font-black transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                        >
                                            {onboardSubaccountMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                                            Securely Connect Payout Account
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
}