import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Mail, Lock, Loader2, ChefHat } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '' });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const loadingToast = toast.loading("Authenticating...");

        try {
            const response = await axios.post('/api/auth/login', formData);
            
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('role', response.data.user.role);
            localStorage.setItem('venueId', response.data.user.venue_id);

            toast.success(`Welcome back, ${response.data.user.name.split(' ')[0]}!`, { id: loadingToast });
            
            // Route based on role
            if (response.data.user.role === 'manager' || response.data.user.role === 'kitchen') {
                navigate(`/kitchen/${response.data.user.venue_id}`);
            } else {
                navigate(`/`); // Waiters go to the floor view (To be built!)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Invalid credentials.", { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 relative overflow-hidden">
            
            {/* Soft background glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#52B520]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-full max-w-md animate-fadeIn z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white shadow-xl shadow-gray-200/50 mb-6 border border-gray-100">
                        <ChefHat className="w-10 h-10 text-brand-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Staff Login</h1>
                    <p className="text-gray-500 mt-2">Enter your credentials to access the system.</p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute top-3.5 left-4 text-gray-400 w-5 h-5" />
                                <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="staff@restaurant.com"
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all outline-none font-medium" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute top-3.5 left-4 text-gray-400 w-5 h-5" />
                                <input type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all outline-none font-medium" />
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading}
                            className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all mt-8
                                ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-primary hover:bg-brand-primary/90 hover:-translate-y-0.5 shadow-lg shadow-brand-primary/30'}`}>
                            {isLoading ? <Loader2 className="animate-spin" size={24}/> : 'Sign In'}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                        Want to deploy SmartTable at your venue? <br/>
                        <Link to="/register-venue" className="font-bold text-gray-900 hover:text-brand-primary transition-colors">Register your business</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;