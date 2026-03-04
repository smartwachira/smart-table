import {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from  'axios';
import toast from  'react-hot-toast';
import { ChefHat, Mail, Lock, User, Loader2, ShieldCheck, Store} from 'lucide-react';

const AuthPortal = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role:'kitchen',// Default role for signup
        venueId: ''
    });

    const handleChange = (e)=>{
        setFormData({...formData, [e.target.name]: e.target.value});
    };

    const handleSubmit = async (e)=>{
        e.preventDefault();
        setIsLoading(true);
        toast.loading(isLogin ? "Authenticating..." : "Creating account...",{id: 'auth'});

        try {
            const endpoint = isLogin 
                ? '/api/auth/login' 
                : '/api/auth/register';
            const payload = isLogin
                ? { email: formData.email, password: formData.password}
                : formData;

            const response = await axios(endpoint, payload);

            //Save credentials to localStorage
            localStorage.setItem('token',response.data.token);
            localStorage.setItem('role',response.data.user.role);
            localStorage.setItem('venueId', response.data.user.venue_id);

            toast.success(isLogin 
                ? 'Welcome back!'
                : "Account created successfully!",
                {id: 'auth'}
            );

            // Route based on role
            if (response.data.user.role === 'manager' || response.data.user.role === 'kitchen'){
                navigate(`/kitchen/${response.data.user.venue_id}`);
            } else {
                navigate('/');
            }
            
        } catch (error){
            console.error("Auth Error:", error);
            const errorMessage = error.response?.data?.message || "Authentication failed. Please try again.";
            toast.error(errorMessage, {id: 'auth'});
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 relative overflow-hidden animate-fadeIn">
            {/* Background Decorative Elements */}
            <div className='absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#52B520]/20 rounded-full blur-3xl'></div>
            <div className='absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl'></div>

            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8 relative z-10">
                {/* Header Section  */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-primary/10 mb-4">
                        <ChefHat className="w-8 h-8 text-brand-primary"></ChefHat>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isLogin  
                            ? 'Staff Portal' 
                            : 'Register Staff'
                        }
                    </h1>
                    <p className="text-gray-500 text-sm mt-2">
                        {isLogin 
                            ? 'Enter your credentials to access the KDS.' 
                            : 'Create a new account for your kitchen team.'
                        }
                    </p>
                </div>

                {/* Form Section */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Conditionally render field for Sign Up */}
                    {!isLogin && (
                        <div className="animate-fadeIn">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400"></User>
                                </div>
                                <input 
                                    type="text"
                                    name='name'
                                    required={!isLogin}
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder='Chef Gordon'
                                    className='block w-full pl-10 pr-3 border border-gray-200 rounded-xl focus:ring-brand-primary transition-all bg-white/50'
                                />
                            </div>
                        </div>
                    )}

                    {/* Email Field (Used in both) */}
                    <div>
                        <label  className="block text-sm font-medium text-gray mb-1">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className='h-5 w-5 text-gray-400'></Mail>
                            </div>
                            <input 
                                type="email"
                                required
                                value={formData.email} 
                                onChange={handleChange}
                                name='email'
                                placeholder='chef@restaurant.com'
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-brand-primary focus:border-brand-primary transition-all bg-white/50" 
                            />
                            
                        </div>
                    </div>

                    {/* Password Field (Used in both)  */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400"></Lock>
                            </div>
                            <input 
                                type="text"
                                name='password'
                                required
                                value={formData.password} 
                                onChange={handleChange}
                                placeholder='••••••••'
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-brand-primary focus:border-brand-primary transition-all bg-white/50" />
                        </div>
                    </div>

                    {/* Conditionally render Role & Venue for Sign Up */}
                    {!isLogin && (
                        <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                            <div>
                                <label  className="block text-sm font-medium text-grey-700 mb-1">Role</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <ShieldCheck className='h-5 w-5 text-gray-400'/>
                                    </div>
                                    <select 
                                        name="role" 
                                        value={formData.role}
                                        onChange={handleChange}
                                        className='block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-brand-primary focus:border-brand-primary apperance-none bg-white/50'
                                    >
                                        <option value="kitchen">Kitchen Staff</option>
                                        <option value="manager">Manager</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Venue ID</label>
                                <div className='relative'>
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Store className="h-5 w-5 text-gray-400"></Store>
                                    </div>
                                    <input 
                                        type="text"
                                        name='venueId'
                                        required={!isLogin}
                                        value={formData.venueId}
                                        onChange={handleChange}
                                        placeholder='UUUID...'
                                        className='block w-full pl-10 pr-3 border border-gray-200 rounded-xl focus:ring-brand-primary focus:border-brand-primary transition-all bg-white/50 text-xs'
                                    />

                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type='submit'
                        disabled={isLoading}
                        className={`w-full mt-6 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg
                            ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-primary hover:bg-brand-primary/90 hover:-translate-y-0.5 shadow-brand-primary/30'}`}
                    >
                        {isLoading 
                            ? <><Loader2 className="animate-spin"  size={20}></Loader2> Processing...</> 
                            : (isLogin 
                                ? "Sign in" 
                                : 'Create Account'
                            )
                        }
                    </button>


                </form>

                {/* Toggle Login/Signup */}
                <div className="mt-8 text-center border-t border-gray-100 pt-6">
                    <p className="text-sm text-gray-600">
                        {isLogin 
                            ? "Don't have staff account?"
                            : 'Already have an account?'
                        }
                        <button
                            type='button'
                            onClick={()=>setIsLogin(!isLogin)} 
                            className='ml-2 font-bold text-brand-primary hover:underline transition-all'
                            
                        >
                            {isLogin 
                                ? 'Register here' 
                                : 'Sign in instead'
                            }
                        </button>
                    </p>

                </div>
            
            </div>
        </div>
    );
};

export default AuthPortal;