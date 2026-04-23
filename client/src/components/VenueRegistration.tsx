import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import { Building2, MapPin, User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';

// 🛡️ Explicit interface for the API response
interface RegistrationResponse {
    token: string;
    message?: string;
    user?: any;
}

export default function VenueRegistration() {
    // 🛡️ Strictly type the form data object
    const [formData, setFormData] = useState({
        venueName: '', 
        location: '', 
        managerName: '', 
        managerEmail: '', 
        managerPassword: ''
    });
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const navigate = useNavigate();

    // 🛡️ Type the input change event
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // 🛡️ Type the string parameter and ensure it returns a number
    const getPasswordStrength = (pass: string): number => {
        let score = 0;
        if (pass.length > 7) score++;
        if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;
        return score;
    };
    
    const strength = getPasswordStrength(formData.managerPassword);

    // 🛡️ Type the form submission event
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const res = await axios.post<RegistrationResponse>('/api/auth/register/venue', formData);
            
            localStorage.setItem('auth_token', res.data.token);
            
            // Premium Toast Notification
            toast.success('Workspace Deployed', {
                description: `Welcome to Smart Table, ${formData.managerName}.`,
                icon: <CheckCircle2 className="text-amber-500" />
            });

            // Delay navigation slightly so the toast is seen
            setTimeout(() => navigate('/dashboard'), 1500);
            
        } catch (err) {
            // 🛡️ Safely cast the error to extract the backend message
            const axiosError = err as AxiosError<{ message: string }>;
            toast.error('Deployment Failed', {
                description: axiosError.response?.data?.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-black text-gray-100 font-sans selection:bg-amber-500/30">
            {/* Initialize Premium Toaster */}
            <Toaster theme="dark" position="bottom-right" toastOptions={{ className: 'bg-white/5 backdrop-blur-xl border border-white/10 text-white' }} />

            {/* LEFT PANE: Brand & Authority (Hidden on mobile, visible on lg screens) */}
            <div className="relative hidden lg:flex w-1/2 flex-col justify-between p-12 overflow-hidden border-r border-white/5">
                {/* Ambient Glows */}
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-amber-600/10 blur-[150px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-zinc-600/10 blur-[150px] pointer-events-none" />
                
                <div className="relative z-10">
                    <h1 className="text-3xl font-extralight tracking-tight text-white flex items-center gap-3">
                        Smart<span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Table</span>
                    </h1>
                </div>

                <div className="relative z-10 max-w-md space-y-6">
                    <h2 className="text-4xl font-medium leading-tight">Elite hospitality,<br/>engineered for scale.</h2>
                    <p className="text-lg text-gray-400 font-light leading-relaxed">
                        Deploy your multi-tenant workspace in seconds. Uncompromising security, lightning-fast KDS operations, and pure architectural elegance.
                    </p>
                    
                    {/* Social Proof / Features */}
                    <div className="space-y-4 pt-8 border-t border-white/10">
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                            <CheckCircle2 size={18} className="text-amber-500" /> Zero-trust multi-tenant isolation
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                            <CheckCircle2 size={18} className="text-amber-500" /> End-to-end encrypted staff PINs
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                            <CheckCircle2 size={18} className="text-amber-500" /> Millisecond real-time KDS syncing
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT PANE: Interactive Form Area */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 relative">
                <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    
                    <div className="space-y-2">
                        <h2 className="text-3xl font-semibold tracking-tight text-white">Initialize Venue</h2>
                        <p className="text-sm text-gray-400">Enter your business details to provision your instance.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Venue Section */}
                        <div className="space-y-4">
                            <div className="relative group">
                                <Building2 size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                                <input name="venueName" placeholder="Venue Name" onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all duration-300" />
                            </div>
                            <div className="relative group">
                                <MapPin size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                                <input name="location" placeholder="City / Locale" onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all duration-300" />
                            </div>
                        </div>

                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-6" />

                        {/* Manager Section */}
                        <div className="space-y-4">
                            <div className="relative group">
                                <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                                <input name="managerName" placeholder="Master Owner Name" onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all duration-300" />
                            </div>
                            <div className="relative group">
                                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                                <input name="managerEmail" type="email" placeholder="Business Email" onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all duration-300" />
                            </div>
                            
                            {/* Password with visibility toggle and strength indicator */}
                            <div className="space-y-3">
                                <div className="relative group">
                                    <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                                    <input name="managerPassword" type={showPassword ? "text" : "password"} placeholder="Secure Password" onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all duration-300" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                
                                {/* Password Strength Bars */}
                                {formData.managerPassword && (
                                    <div className="flex gap-2 h-1.5 w-full px-1">
                                        <div className={`flex-1 rounded-full transition-all duration-500 ${strength >= 1 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-white/10'}`} />
                                        <div className={`flex-1 rounded-full transition-all duration-500 ${strength >= 2 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-white/10'}`} />
                                        <div className={`flex-1 rounded-full transition-all duration-500 ${strength >= 3 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-white/10'}`} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="group relative w-full flex items-center justify-center gap-3 py-4 px-4 text-sm font-semibold rounded-xl text-black bg-amber-500 hover:bg-amber-400 focus:outline-none transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] disabled:opacity-70 disabled:cursor-not-allowed">
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Provisioning...
                                </>
                            ) : (
                                <>
                                    Deploy Workspace
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                    
                    <p className="text-center text-xs text-gray-500">
                        Already have an operational instance? <a href="/login" className="text-amber-500 hover:text-amber-400 transition-colors">Access Dashboard</a>
                    </p>
                </div>
            </div>
        </div>
    );
}