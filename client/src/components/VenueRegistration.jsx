import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Store, MapPin, User, Mail, Lock, Loader2, ArrowRight, ChefHat, BarChart3, Zap } from 'lucide-react';

const VenueRegistration = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        venueName: '', location: '', managerName: '', managerEmail: '', managerPassword: ''
    });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const loadingToast = toast.loading("Setting up your restaurant...");

        try {
            const response = await axios.post('/api/auth/register/venue', formData);
            
            // Save Master Manager credentials
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('role', response.data.user.role);
            localStorage.setItem('venueId', response.data.user.venue_id);

            toast.success("Welcome to SmartTable!", { id: loadingToast });
            navigate(`/kitchen/${response.data.user.venue_id}`); // Route to their new dashboard
        } catch (error) {
            toast.error(error.response?.data?.message || "Registration failed.", { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white">
            
            {/* Left Side: Branding & Pitch (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-5/12 bg-gray-900 relative overflow-hidden flex-col justify-between p-12 text-white">
                {/* Decorative Gradients */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-primary/40 to-gray-900 z-0"></div>
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#52B520]/30 rounded-full blur-3xl z-0"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                            <ChefHat className="text-brand-primary w-8 h-8" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">SmartTable <span className="text-brand-primary">OS</span></span>
                    </div>

                    <h1 className="text-5xl font-bold leading-tight mb-6">
                        The modern operating system for your restaurant.
                    </h1>
                    <p className="text-lg text-gray-300 mb-12 max-w-md">
                        Join hundreds of venues streamlining their kitchen, empowering their staff, and delighting their guests with instant QR ordering.
                    </p>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4 text-gray-300">
                            <div className="p-2 bg-white/5 rounded-lg"><Zap className="text-[#52B520]" size={20}/></div>
                            <span>Real-time Kitchen Display System (KDS)</span>
                        </div>
                        <div className="flex items-center gap-4 text-gray-300">
                            <div className="p-2 bg-white/5 rounded-lg"><BarChart3 className="text-[#52B520]" size={20}/></div>
                            <span>Integrated M-Pesa automated payments</span>
                        </div>
                    </div>
                </div>
                
                <div className="relative z-10 text-sm text-gray-400">
                    © {new Date().getFullYear()} SmartTable Technologies.
                </div>
            </div>

            {/* Right Side: Registration Form */}
            <div className="w-full lg:w-7/12 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-gray-50 relative">
                <div className="w-full max-w-md animate-fadeIn">
                    
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Create your venue</h2>
                        <p className="text-gray-500">Get started with a master manager account.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* VENUE DETAILS */}
                        <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">1. Venue Details</h3>
                            <div className="relative">
                                <Store className="absolute top-3.5 left-3.5 text-gray-400 w-5 h-5" />
                                <input type="text" name="venueName" required onChange={handleChange} placeholder="Restaurant Name (e.g. The Grand Hotel)"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all outline-none" />
                            </div>
                            <div className="relative">
                                <MapPin className="absolute top-3.5 left-3.5 text-gray-400 w-5 h-5" />
                                <input type="text" name="location" required onChange={handleChange} placeholder="Location (e.g. Westlands, Nairobi)"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all outline-none" />
                            </div>
                        </div>

                        {/* MANAGER DETAILS */}
                        <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">2. Manager Account</h3>
                            <div className="relative">
                                <User className="absolute top-3.5 left-3.5 text-gray-400 w-5 h-5" />
                                <input type="text" name="managerName" required onChange={handleChange} placeholder="Your Full Name"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all outline-none" />
                            </div>
                            <div className="relative">
                                <Mail className="absolute top-3.5 left-3.5 text-gray-400 w-5 h-5" />
                                <input type="email" name="managerEmail" required onChange={handleChange} placeholder="manager@restaurant.com"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all outline-none" />
                            </div>
                            <div className="relative">
                                <Lock className="absolute top-3.5 left-3.5 text-gray-400 w-5 h-5" />
                                <input type="password" name="managerPassword" required onChange={handleChange} placeholder="Create a strong password"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all outline-none" />
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading}
                            className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg
                                ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800 hover:-translate-y-0.5 shadow-gray-900/20'}`}>
                            {isLoading ? <><Loader2 className="animate-spin" size={20}/> Provisioning System...</> : <>Complete Setup <ArrowRight size={20}/></>}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-gray-500">
                        Already registered your venue? <Link to="/login" className="font-bold text-brand-primary hover:underline">Sign in here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VenueRegistration;