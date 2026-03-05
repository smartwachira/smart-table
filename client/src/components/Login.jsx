import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [loginType, setLoginType] = useState('STAFF'); 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [venueId, setVenueId] = useState('');
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();

    const handlePinPress = (num) => { if (pin.length < 4) setPin(prev => prev + num); };
    const handleBackspace = () => setPin(prev => prev.slice(0, -1));

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setIsLoading(true);
        
        const endpoint = loginType === 'MANAGER' ? '/api/auth/login/manager' : '/api/auth/login/staff';
        const payload = loginType === 'MANAGER' ? { email, password } : { venue_id: venueId, username, pin };

        try {
            const res = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            
            localStorage.setItem('token', data.token);
            navigate(loginType === 'MANAGER' ? '/dashboard' : '/kitchen');
        } catch (err) {
            setError(err.message);
            setPin('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden font-sans">
            {/* Ambient Lighting */}
            <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[180px] pointer-events-none" />
            
            <div className="relative z-10 w-full max-w-md p-8 sm:p-10 rounded-[2.5rem] bg-white/[0.02] backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]">
                
                {/* iOS-Style Segmented Control */}
                <div className="flex bg-white/5 rounded-2xl p-1.5 mb-10 border border-white/5">
                    <button onClick={() => setLoginType('STAFF')} className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${loginType === 'STAFF' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-gray-500 hover:text-gray-300'}`}>
                        Terminal
                    </button>
                    <button onClick={() => setLoginType('MANAGER')} className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${loginType === 'MANAGER' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-gray-500 hover:text-gray-300'}`}>
                        Dashboard
                    </button>
                </div>

                {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-in fade-in slide-in-from-top-2">{error}</div>}

                {/* MANAGER LOGIN */}
                {loginType === 'MANAGER' && (
                    <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <input type="email" placeholder="Admin Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all duration-300" />
                        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all duration-300" />
                        <button type="submit" disabled={isLoading} className="w-full mt-4 bg-white text-black font-semibold text-sm py-4 rounded-xl transition-all duration-300 hover:bg-gray-200 active:scale-[0.98] disabled:opacity-70">
                            Authenticate
                        </button>
                    </form>
                )}

                {/* STAFF KDS LOGIN */}
                {loginType === 'STAFF' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex gap-4">
                            <input type="text" placeholder="Venue ID" value={venueId} onChange={(e) => setVenueId(e.target.value)} className="w-1/3 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-center text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-all" />
                            <input type="text" placeholder="Staff Username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-2/3 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-center text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-all" />
                        </div>
                        
                        {/* Elegant 4-Digit PIN Indicator */}
                        <div className="flex justify-center gap-6 my-8">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className={`h-3 w-3 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-amber-400 scale-125 shadow-[0_0_12px_rgba(251,191,36,0.8)]' : 'bg-white/10 border border-white/20'}`} />
                            ))}
                        </div>

                        {/* Premium Tactile Numpad */}
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button key={num} type="button" onClick={() => handlePinPress(num.toString())} className="aspect-[4/3] rounded-2xl bg-white/5 border border-white/5 text-2xl font-light text-white hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all duration-200 backdrop-blur-md">
                                    {num}
                                </button>
                            ))}
                            <button type="button" onClick={handleBackspace} className="aspect-[4/3] rounded-2xl bg-white/5 border border-white/5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-200">
                                DEL
                            </button>
                            <button type="button" onClick={() => handlePinPress('0')} className="aspect-[4/3] rounded-2xl bg-white/5 border border-white/5 text-2xl font-light text-white hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all duration-200 backdrop-blur-md">
                                0
                            </button>
                            <button type="button" onClick={() => pin.length === 4 ? handleLogin() : null} className={`aspect-[4/3] rounded-2xl text-sm font-semibold transition-all duration-300 active:scale-95 ${pin.length === 4 ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-400' : 'bg-white/5 border border-white/5 text-gray-600 cursor-not-allowed'}`}>
                                GO
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}