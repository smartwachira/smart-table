import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, Building2, User, ArrowRight, Loader2, KeyRound, AlertCircle } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [loginType, setLoginType] = useState('STAFF'); // 'STAFF' | 'MANAGER'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const storedVenueId = localStorage.getItem('terminal_venue_id');
    
    const navigate = useNavigate();
    const {login} = useAuth();

    const handlePinPress = (num) => { if (pin.length < 4) setPin(prev => prev + num); };
    const handleBackspace = () => setPin(prev => prev.slice(0, -1));

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        
        const endpoint = loginType === 'MANAGER' ? '/api/auth/login/manager' : '/api/auth/login/staff';
        const payload = loginType === 'MANAGER' ? { email, password } : { venue_id: localStorage.getItem('terminal_venue_id'), username, pin };

        try {
            const res = await axios.post(`http://localhost:5000${endpoint}`, payload);
            login(res.data.token);

            //PROVISION THE DEVICE: If a manager logs in, bond this device to their venue
            if (loginType === 'MANAGER' && res.data.user?.venue_id){
                localStorage.setItem('terminal_venue_id',res.data.user.venue_id);
            }

            toast.success('Authentication Verified', {
                description: `Routing to ${loginType === 'MANAGER' ? 'Dashboard' : 'Terminal'}...`,
                icon: <KeyRound className="text-amber-500" />
            });

            setTimeout(() => {
                navigate(loginType === 'MANAGER' ? '/dashboard' : '/kitchen');
            }, 1000);

        } catch (err) {
            toast.error('Access Denied', {
                description: err.response?.data?.message || 'Invalid credentials provided.',
            });
            if (loginType === 'STAFF') setPin(''); // Instantly reset PIN on failure for fast retry
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-black text-gray-100 font-sans selection:bg-amber-500/30">
            <Toaster theme="dark" position="bottom-right" toastOptions={{ className: 'bg-white/5 backdrop-blur-xl border border-white/10 text-white' }} />

            {/* LEFT PANE: Ambient Brand Context */}
            <div className="relative hidden lg:flex w-1/2 flex-col justify-between p-12 overflow-hidden border-r border-white/5 bg-black">
                <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[150px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
                
                <div className="relative z-10">
                    <h1 className="text-3xl font-extralight tracking-tight text-white flex items-center gap-3">
                        Smart<span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Table</span>
                    </h1>
                </div>

                <div className="relative z-10 max-w-md space-y-4">
                    <h2 className="text-4xl font-medium leading-tight">
                        {loginType === 'MANAGER' ? 'Command your operations.' : 'Precision at scale.'}
                    </h2>
                    <p className="text-lg text-gray-400 font-light leading-relaxed">
                        {loginType === 'MANAGER' 
                            ? 'Access your multi-tenant dashboard to analyze performance, engineer menus, and provision your staff.'
                            : 'Enter your operational pin to access the high-speed Kitchen Display System and floor layouts.'}
                    </p>
                </div>
            </div>

            {/* RIGHT PANE: Interactive Login Module */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 relative">
                <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    
                    {/* iOS-Style Segmented Control */}
                    <div className="flex bg-white/5 rounded-2xl p-1.5 border border-white/5 shadow-inner">
                        <button onClick={() => { setLoginType('STAFF'); setPin(''); }} className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${loginType === 'STAFF' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-gray-500 hover:text-gray-300'}`}>
                            Terminal (KDS)
                        </button>
                        <button onClick={() => setLoginType('MANAGER')} className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${loginType === 'MANAGER' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-gray-500 hover:text-gray-300'}`}>
                            Dashboard
                        </button>
                    </div>

                    <div className="space-y-2 text-center lg:text-left">
                        <h2 className="text-3xl font-semibold tracking-tight text-white">Authenticate</h2>
                        <p className="text-sm text-gray-400">Secure access to your assigned environment.</p>
                    </div>

                    {/* MANAGEMENT LOGIN FORM */}
                    {loginType === 'MANAGER' && (
                        <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="relative group">
                                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                                <input type="email" placeholder="Admin Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all duration-300" />
                            </div>
                            <div className="relative group">
                                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all duration-300" />
                            </div>
                            
                            <button type="submit" disabled={isLoading} className="group w-full flex items-center justify-center gap-3 mt-8 bg-white text-black font-semibold text-sm py-4 rounded-xl transition-all duration-300 hover:bg-gray-200 active:scale-[0.98] disabled:opacity-70">
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Access Workspace <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                            </button>
                        </form>
                    )}

                    {/* KDS STAFF TACTILE LOGIN */}
                    {loginType === 'STAFF' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                            {!storedVenueId ? (
                                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-amber-500 text-sm flex items-start gap-3">
                                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                    <p><strong>Device Not Provisioned:</strong> A manager must log in on the Dashboard tab first to authorize this terminal for your venue.</p>
                                </div>
                                ) : (
                                <div className="relative group w-2/3">
                                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Staff Username" 
                                        value={username} 
                                        onChange={(e) => setUsername(e.target.value)} 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-all" />
                                </div>
                                )
                            }
                           
                            
                            {/* Visual PIN Dots */}
                            <div className="flex justify-center gap-6 my-8">
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className={`h-3 w-3 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-amber-400 scale-125 shadow-[0_0_12px_rgba(251,191,36,0.8)]' : 'bg-white/10 border border-white/20'}`} />
                                ))}
                            </div>

                            {/* Luxury Tactile Numpad */}
                            <div className="grid grid-cols-3 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button key={num} type="button" onClick={() => handlePinPress(num.toString())} className="aspect-[4/3] rounded-2xl bg-white/5 border border-white/5 text-2xl font-light text-white hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all duration-200 backdrop-blur-md">
                                        {num}
                                    </button>
                                ))}
                                <button type="button" onClick={handleBackspace} className="aspect-[4/3] rounded-2xl bg-white/5 border border-white/5 text-sm font-medium text-gray-400 hover:text-white hover:bg-red-500/20 active:scale-95 transition-all duration-200">
                                    DEL
                                </button>
                                <button type="button" onClick={() => handlePinPress('0')} className="aspect-[4/3] rounded-2xl bg-white/5 border border-white/5 text-2xl font-light text-white hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all duration-200 backdrop-blur-md">
                                    0
                                </button>
                                <button type="button" onClick={() => pin.length === 4 ? handleLogin() : null} disabled={isLoading} className={`flex items-center justify-center aspect-[4/3] rounded-2xl text-sm font-semibold transition-all duration-300 active:scale-95 ${pin.length === 4 ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-400' : 'bg-white/5 border border-white/5 text-gray-600 cursor-not-allowed'}`}>
                                    {isLoading ? <Loader2 size={20} className="animate-spin text-black" /> : 'GO'}
                                </button>
                            </div>
                        </div>
                    )}

                    {!isLoading && loginType === 'MANAGER' && (
                        <p className="text-center text-xs text-gray-500 mt-6 animate-in fade-in">
                            New to Smart Table? <a href="/register" className="text-amber-500 hover:text-amber-400 transition-colors">Provision a venue</a>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}