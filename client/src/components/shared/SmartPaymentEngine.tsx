import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { 
    X, CreditCard, Smartphone, Loader2, ChevronRight, CheckCircle2 
} from 'lucide-react';

// ============================================================================
// ⚡ ENCAPSULATED PAYSTACK LAUNCHER
// ============================================================================
const NativePaystackLauncher = ({ accessCode, onSuccess, onClose }: { accessCode: string, onSuccess: Function, onClose: Function }) => {
    useEffect(() => {
        const scriptId = 'paystack-v2-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://js.paystack.co/v2/inline.js';
            script.async = true;
            document.body.appendChild(script);
        }

        const launchPaystack = () => {
            const popup = new (window as any).PaystackPop();
            popup.resumeTransaction(accessCode, {
                onSuccess: (response: any) => onSuccess(response),
                onCancel: () => onClose(),
                onError: (error: any) => { console.error("Paystack SDK Error:", error); onClose(); }
            });
        };

        if ((window as any).PaystackPop) launchPaystack();
        else script.onload = launchPaystack;

        return () => {
            if (script && document.body.contains(script)) document.body.removeChild(script);
            const paystackIframe = document.querySelector('iframe[name="paystack-checkout-iframe"]');
            if (paystackIframe && paystackIframe.parentNode) paystackIframe.parentNode.removeChild(paystackIframe);
        };
    }, [accessCode, onSuccess, onClose]);
    return null;
};

// ============================================================================
// ⚡ STRICT PROPS SIGNATURE
// ============================================================================
interface SmartPaymentEngineProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    orderIds: string[];
    venueId: string;
    onSuccessCallback: () => void;
}

type PaymentTrack = 'CARD' | 'MOBILE_MONEY' | null;

export default function SmartPaymentEngine({ isOpen, onClose, amount, orderIds, venueId, onSuccessCallback }: SmartPaymentEngineProps) {
    // UI Bifurcation State
    const [activeTrack, setActiveTrack] = useState<PaymentTrack>(null);
    const [phone, setPhone] = useState('');
    // ⚡ KENYA MARKET: Strictly M-Pesa and Airtel
    const [mobileProvider, setMobileProvider] = useState<'mpesa' | 'airtel'>('mpesa');
    
    // Encapsulated Gateway State
    const [isProcessing, setIsProcessing] = useState(false);
    const [paystackAccessCode, setPaystackAccessCode] = useState<string>('');
    const [activeTransactionPhase, setActiveTransactionPhase] = useState<'IDLE' | 'AWAITING_PROMPT' | 'SUCCESS'>('IDLE');

    // ============================================================================
    // ⚡ ENCAPSULATED SOCKET LISTENER
    // ============================================================================
    useEffect(() => {
        if (!isOpen || !venueId) return;

        const token = localStorage.getItem('auth_token') || localStorage.getItem('guest_token');
        const socket: Socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            auth: token ? { token } : {}
        });

        orderIds.forEach(id => socket.emit('join_order_room', id));

        socket.on('payment:completed', (data) => {
            if (data.bulk || orderIds.includes(data.orderId)) {
                setActiveTransactionPhase('SUCCESS');
                setTimeout(() => {
                    onSuccessCallback();
                    handleClose();
                }, 2000);
            }
        });

        socket.on('payment:failed', (data) => {
            if (orderIds.includes(data.orderId)) {
                toast.error(`Transaction Failed: ${data.reason}`);
                setIsProcessing(false);
                setActiveTransactionPhase('IDLE');
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [isOpen, venueId, orderIds]);

    // ============================================================================
    // ⚡ UNIFIED API EXECUTOR
    // ============================================================================
    const handleInitiatePayment = async (method: 'CARD' | 'MOBILE_MONEY') => {
        if (method === 'MOBILE_MONEY' && phone.length < 9) return toast.error("Valid Kenyan phone number required.");
        
        setIsProcessing(true);
        try {
            const isGuest = !!localStorage.getItem('guest_token');
            const token = isGuest ? localStorage.getItem('guest_token') : localStorage.getItem('auth_token');
            const headers = isGuest ? { 'x-guest-id': token } : { Authorization: `Bearer ${token}` };
            
            const endpoint = isGuest ? '/api/orders/tabs/guest-checkout' : '/api/orders/tabs/init-payment';

            // ⚡ THE FIX: Explicitly route the provider while maintaining backend compatibility
            const payload = {
                orderIds,
                // Backend currently expects 'M-PESA' as the master string for the Mobile Money block
                settlement_method: method === 'MOBILE_MONEY' ? 'M-PESA' : 'CARD',
                phone: method === 'MOBILE_MONEY' ? phone : undefined,
                // Paystack uses this provider field to determine if it sends an M-Pesa STK or Airtel USSD Push
                provider: method === 'MOBILE_MONEY' ? mobileProvider : undefined 
            };

            const { data } = await axios.post(endpoint, payload, { headers });

            if (method === 'CARD') {
                setPaystackAccessCode(data.access_code);
            } else if (method === 'MOBILE_MONEY') {
                setActiveTransactionPhase('AWAITING_PROMPT');
                // Dynamically announce the correct Telco network
                const networkName = mobileProvider === 'airtel' ? 'Airtel Money' : 'M-Pesa';
                toast.success(`${networkName} prompt dispatched!`);
            }
        } catch (error: any) {
            console.error("Payment Engine Error:", error);
            toast.error(error.response?.data?.message || "Failed to initialize payment gateway.");
            setIsProcessing(false);
        }
    };
    const handleClose = () => {
        setActiveTrack(null);
        setPhone('');
        setPaystackAccessCode('');
        setIsProcessing(false);
        setActiveTransactionPhase('IDLE');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300" onClick={!isProcessing ? handleClose : undefined}></div>
            
            <div className="relative w-full md:max-w-md bg-white rounded-t-[2rem] md:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 overflow-hidden">
                
                {/* Header */}
                {!isProcessing && (
                    <button onClick={handleClose} className="absolute top-4 right-4 w-10 h-10 bg-slate-100 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 transition-colors">
                        <X size={20}/>
                    </button>
                )}

                <div className="text-center mb-6 mt-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Complete Payment</h3>
                    <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
                        Total Due: <span className="text-slate-900 text-lg">{amount.toLocaleString()} KES</span>
                    </p>
                </div>

                {/* ============================================================================ */}
                {/* ⚡ UI BIFURCATION: PROGRESSIVE DISCLOSURE */}
                {/* ============================================================================ */}
                <div className="space-y-4 relative">
                    
                    {/* OVERLAYS */}
                    {activeTransactionPhase === 'SUCCESS' && (
                        <div className="absolute inset-0 z-20 bg-white flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                            <CheckCircle2 size={64} className="text-emerald-500 mb-4" />
                            <h3 className="text-2xl font-black text-slate-900">Payment Secured</h3>
                            <p className="text-slate-500 font-medium">Closing transaction...</p>
                        </div>
                    )}

                    {activeTransactionPhase === 'AWAITING_PROMPT' && (
                        <div className="absolute inset-0 z-20 bg-white flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 relative">
                                <Loader2 size={32} className="text-emerald-600 animate-spin absolute" />
                                <Smartphone size={20} className="text-emerald-600 animate-pulse" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Check your phone</h3>
                            <p className="text-slate-500 text-sm text-center mt-2 px-6 font-medium">Enter your PIN on the prompt sent to your device.</p>
                        </div>
                    )}

                    {/* TRACK A: BANK CARD */}
                    {(activeTrack === null || activeTrack === 'CARD') && (
                        <button 
                            onClick={() => {
                                setActiveTrack('CARD');
                                handleInitiatePayment('CARD');
                            }}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-900 rounded-2xl transition-all group disabled:opacity-50"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                    {isProcessing && activeTrack === 'CARD' ? <Loader2 size={24} className="animate-spin text-indigo-600" /> : <CreditCard size={24} className="text-indigo-600"/>}
                                </div>
                                <div className="text-left">
                                    <span className="block font-black text-lg leading-tight">Bank Card</span>
                                    <span className="text-xs text-indigo-600/70 font-bold uppercase tracking-wider">Secure Gateway</span>
                                </div>
                            </div>
                            {!isProcessing && <ChevronRight size={24} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>}
                        </button>
                    )}

                    {/* TRACK B: MOBILE MONEY (KENYA FOCUS) */}
                    {(activeTrack === null || activeTrack === 'MOBILE_MONEY') && (
                        <div className={`overflow-hidden transition-all duration-500 border ${activeTrack === 'MOBILE_MONEY' ? 'border-emerald-200 bg-emerald-50/50 rounded-3xl p-5' : 'border-slate-200 hover:border-emerald-200 bg-white hover:bg-emerald-50/30 rounded-2xl p-4 cursor-pointer group'}`}
                             onClick={() => !activeTrack && setActiveTrack('MOBILE_MONEY')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition-colors ${activeTrack === 'MOBILE_MONEY' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                                        <Smartphone size={24} />
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-black text-lg leading-tight text-slate-900">Mobile Money</span>
                                        <span className="text-xs text-emerald-600/70 font-bold uppercase tracking-wider">M-Pesa • Airtel</span>
                                    </div>
                                </div>
                                {!activeTrack && <ChevronRight size={24} className="text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all"/>}
                            </div>

                            {/* Expanded Progressive Disclosure Form */}
                            {activeTrack === 'MOBILE_MONEY' && (
                                <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex gap-2">
                                        <button onClick={() => setMobileProvider('mpesa')} className={`flex-1 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase border-2 transition-all ${mobileProvider === 'mpesa' ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200'}`}>M-Pesa</button>
                                        <button onClick={() => setMobileProvider('airtel')} className={`flex-1 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase border-2 transition-all ${mobileProvider === 'airtel' ? 'border-red-500 bg-red-500 text-white shadow-md shadow-red-500/20' : 'border-slate-200 bg-white text-slate-500 hover:border-red-200'}`}>Airtel Money</button>
                                    </div>

                                    <input 
                                        type="tel" 
                                        placeholder="Mobile (07XX... / 01XX...)" 
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                        disabled={isProcessing}
                                        className="w-full text-center text-2xl tracking-widest font-black py-4 bg-white border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all disabled:opacity-50"
                                    />
                                    
                                    <button 
                                        onClick={() => handleInitiatePayment('MOBILE_MONEY')}
                                        disabled={isProcessing || phone.length < 9}
                                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? <Loader2 size={24} className="animate-spin" /> : 'Send Prompt to Phone'}
                                    </button>

                                    {!isProcessing && (
                                        <button onClick={() => setActiveTrack(null)} className="w-full py-2 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">
                                            Choose a different method
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ⚡ PAYSTACK NATIVE LAUNCHER */}
            {paystackAccessCode && (
                <NativePaystackLauncher 
                    accessCode={paystackAccessCode}
                    onSuccess={() => { setPaystackAccessCode(''); setIsProcessing(true); setActiveTransactionPhase('SUCCESS'); }}
                    onClose={() => { setPaystackAccessCode(''); setIsProcessing(false); setActiveTrack(null); }}
                />
            )}
        </div>
    );
}