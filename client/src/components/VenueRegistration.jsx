import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function VenueRegistration() {
    const [formData, setFormData] = useState({ venueName: '', location: '', managerName: '', managerEmail: '', managerPassword: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:5000/api/auth/register/venue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            
            localStorage.setItem('token', data.token);
            navigate('/dashboard'); 
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden selection:bg-amber-500/30 font-sans">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-600/20 blur-[150px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-lg p-10 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-extralight tracking-tight text-white mb-2">
                        Smart<span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Table</span>
                    </h1>
                    <p className="text-sm text-gray-400 tracking-wide uppercase">Elite Venue Configuration</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center backdrop-blur-md">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <input name="venueName" placeholder="Venue Name" onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all duration-300" />
                            <input name="location" placeholder="City / Locale" onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all duration-300" />
                        </div>
                        
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-6" />
                        
                        <input name="managerName" placeholder="Master Owner Name" onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all duration-300" />
                        <input name="managerEmail" type="email" placeholder="Business Email" onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all duration-300" />
                        <input name="managerPassword" type="password" placeholder="Secure Password" onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all duration-300" />
                    </div>

                    <button type="submit" disabled={isLoading} className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-semibold rounded-xl text-black bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-black transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] disabled:opacity-70">
                        {isLoading ? 'Initializing...' : 'Deploy Workspace'}
                    </button>
                </form>
            </div>
        </div>
    );
}