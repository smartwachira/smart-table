import React, { useCallback,useState, useEffect} from "react";
import axios from 'axios';
import { toast } from 'sonner'
import { Store, CreditCard,Sliders,Save,Loader2,Power,ImagePlus} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';




export default function Settings(){
    const [activeTab, setActiveTab] = useState('profile');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false)


    const token = localStorage.getItem('auth_token');
    const {user} = useAuth();

    //Form State
    const [formData, setFormData] = useState({
        name: '',
        location:'',
        contact_email:'',
        phone_number: '',
        tax_rate: 0,
        is_accepting_orders: true,
        allow_cash_payments: true
    });

    const fetchSettings = useCallback(async ()=>{
        try{
            const res= await axios.get('/api/settings/venue',{
                headers: {Authorization: `Bearer ${token}`},
                venueId: user.venueId
            });
            setFormData(res.data);
            setLogoPreview(res.data.logo_url);
        } catch (error){
            toast.error("Failed to load venue settings.");
            console.error("Error loading venue settings",error)
        } finally{
            setIsLoading(false)
        }
    },[token,user.venueId])

    useEffect(()=>{
        fetchSettings()
    },[fetchSettings]);

    const handleChange = (e) =>{
        const {name, value,type,checked} = e.target;
        setFormData(prev=>({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e)=>{
        e.preventDefault();
        setIsSaving(true);
        try {
            await axios.put('/api/settings/venue',formData,{
                headers: {Authorization: `Bearer ${token}`},
                venueId: user.venueId
            });
            toast.success("Settings saved successfully!")
        } catch (error){
            toast.error(error.response?.data?.message || "Failed to save settings.")
        } finally{
            setIsSaving(false)
        }
    };

    // 3. Add this upload handler function:
    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show instant local preview
        setLogoPreview(URL.createObjectURL(file));
        setIsUploadingLogo(true);

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await axios.post('/api/settings/venue/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Logo uploaded successfully!");
            // Update form data so it saves correctly if they hit the main "Save" button later
            setFormData(prev => ({ ...prev, logo_url: res.data.logo_url }));
        } catch (error) {
            console.error("Error uploading logo.",error)
            toast.error("Failed to upload logo.");
            setLogoPreview(formData.logo_url); // Revert on failure
        } finally {
            setIsUploadingLogo(false);
        }
    };

    if (isLoading){
        return <div className="p-8 flex items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mr-2">Loading settings...</Loader2>
        </div>
    }

    return(
        <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Venue Settings</h1>
                <p className="text-slate-500 font-medium mt-1">Manage your restaurant's profile,operations and billing.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Left Sidebar Navigation */}
                <aside className="w-full md:w-64 shrink-0 space-y-2">
                    <button
                        onClick={()=> setActiveTab('profile')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'profile'?'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Store size={20}/> Venue Profile
                    </button>

                    <button
                        onClick={()=>setActiveTab('operations')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'operations' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Sliders size={20}/> Operations
                    </button>
                    <button
                        onClick={()=> setActiveTab('billing')}
                        className={`w-full flex items-center gap-3 py-3 rounded-2xl font-bold transition-all ${activeTab === 'billing' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <CreditCard size={20}/> Billing & Plan
                    </button>
                </aside>

                {/* Right Content Area */}
                <main className="flex-1">
                    <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">

                        {/* TAB 1:VENUE PROFILE */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h2 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4">Basic Information</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                                        <div className="relative group">
                                            {logoPreview ? (
                                                <img 
                                                    src={`http://localhost:5000${logoPreview}`} 
                                                    alt="Venue Logo"
                                                    className="w-full h-full object-cover"
                                                    onError={(e)=>{ e.target.onerror = null; e.target.src = logoPreview; }}
                                                />
                                            ) : (
                                                <Store size={32} className="text-slate-300"/>
                                            )}

                                            {/* Hover Overlay */}
                                            <label  className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer backdrop-blur-sm">
                                                {isUploadingLogo ? <Loader2 size={24} className="animate-spin"/> : <ImagePlus size={24}/>}
                                                <span className="text-[10px] font-bold uppercase tracking-wider mt-1 border-b border-white/50">Change</span>
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleLogoUpload}
                                                    disabled={isUploadingLogo}
                                                />
                                            </label>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg text-slate-900">Brand Logo</h3>
                                            <p className="text-sm text-slate-500">This will appear at the top of your digital menu.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label  className="text-sm font-bold text-slate-700">Venue Name</label>
                                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Contact Email (Read Only)</label>
                                        <input type="email" value={formData.contact_email} disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed" />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label  className="text-sm font-bold text-slate-700">Physical Location</label>
                                        <input type="text" name="location" value={formData.location} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                                    </div>
                                    <div className="space-y-2">
                                        <label  className="text-sm font-bold text-slate-700">Phone Number</label>
                                        <input type="tel" name="phone_number" value={formData.phone_number || ''} onChange={handleChange} placeholder="+254..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: OPERATIONS */}
                        {activeTab === 'operations' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 mb-6">Store Status</h2>
                                    <label  className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${formData.is_accepting_orders ? 'bg-emerald-100 text-emerald-600':'bg-red-100 text-red-600'}`}>
                                                <Power size={24}/>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">Accepting Digital Orders</h4>
                                                <p className="text-sm text-slate-500 mt-0 5">Toggle off to temporarily disable QR menus (e.g., closing time).</p>
                                            </div>
                                        </div>
                                        <div className="relative inline-flex items-center cursor-pointer">
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
                                            <label  className="text-sm font-bold text-slate-700">Tax Rate / VAT (%)</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    name="tax_rate" 
                                                    value={formData.tax_rate} 
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <label  className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        name="allow_cash_payments" 
                                                        checked={formData.allow_cash_payments === true || formData.allow_cash_payments === 'true' } 
                                                        onChange={handleChange} 
                                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" 
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
                            </div>
                        )}

                        {/* TAB 3:BILLING PLACEHOLDER */}
                        {activeTab === 'billing' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-12">
                                <CreditCard className="mx-auto text-slate-300 mb-4"></CreditCard>
                                <h2 className="text-xl font-black text-slate-900">Subscription & Billing</h2>
                                <p className="text-slate-500 max-w-sm mx-auto">You are currently on the <span className="font-bold text-indigo-600">Smart Table Early Access</span> plan. Billing management will be available before full release.</p>
                            </div>
                        )}

                        {/* Save Button Footer */}
                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-70"
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>}
                                Save Changes
                            </button>
                        </div>

                    </form>
                </main>
            </div>
        </div>

        
    )



}