import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { 
    X, CreditCard, Smartphone, Loader2, ChevronRight, CheckCircle2, Calculator 
} from 'lucide-react';
import api from '../../utils/axiosConfig';

// ============================================================================
// ⚡ UTILITIES & VALIDATION
// ============================================================================
const validateKenyanPhone = (phoneNumber: string) => {
    const regex = /^(?:254|\+254|0)?([17]\d{8})$/;
    return regex.test(phoneNumber.trim());
};

interface SmartPaymentEngineProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    orderIds: string[];
    venueId: string;
    onSuccessCallback: () => void;
}

type PaymentTrack = 'CARD' | 'MPESA' | 'AIRTEL' | null;

export default function SmartPaymentEngine({ isOpen, onClose, amount, orderIds, venueId, onSuccessCallback }: SmartPaymentEngineProps) {
    const [activeTrack, setActiveTrack] = useState<PaymentTrack>(null);
    const [phone, setPhone] = useState('');
    
    // ⚡ SPRINT 24: SPLIT BILLING STATE
    const [splitAmount, setSplitAmount] = useState<number>(amount);

    const [isProcessing, setIsProcessing] = useState(false);
    const [paystackAccessCode, setPaystackAccessCode] = useState<string>('');
    const [activeTransactionPhase, setActiveTransactionPhase] = useState<'IDLE' | 'AWAITING_PROMPT' | 'SUCCESS'>('IDLE');

    const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync split amount when modal opens or total amount changes
    useEffect(() => {
        setSplitAmount(amount);
    }, [amount, isOpen]);

    // ============================================================================
    // ⚡ PRE-LOAD PAYSTACK SDK
    // ============================================================================
    useEffect(() => {
        const scriptId = 'paystack-v2-script';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://js.paystack.co/v2/inline.js';
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

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
                successTimeoutRef.current = setTimeout(() => {
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
            if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
            socket.disconnect();
        };
    }, [isOpen, venueId, orderIds]);

    // ============================================================================
    // ⚡ DECOUPLED PAYSTACK LAUNCHER
    // ============================================================================
    useEffect(() => {
        if (!paystackAccessCode) return;

        const launchPaystack = () => {
            const popup = new (window as any).PaystackPop();
            popup.resumeTransaction(paystackAccessCode, {
                onSuccess: () => {
                    setPaystackAccessCode('');
                    setActiveTransactionPhase('SUCCESS');
                },
                onCancel: () => {
                    setPaystackAccessCode('');
                    setIsProcessing(false);
                    setActiveTrack(null);
                    toast.info("Payment window closed.");
                },
                onError: (err: any) => {
                    console.error("Paystack SDK Error:", err);
                    setPaystackAccessCode('');
                    setIsProcessing(false);
                    setActiveTrack(null);
                    toast.error("Gateway error. Please try again.");
                }
            });
        };

        if ((window as any).PaystackPop) launchPaystack();
        else {
            const script = document.getElementById('paystack-v2-script');
            if (script) script.onload = launchPaystack;
        }
    }, [paystackAccessCode]);

    // ============================================================================
    // ⚡ UNIFIED API EXECUTOR (WITH SPLIT AMOUNT)
    // ============================================================================
    const handleInitiatePayment = async (method: 'CARD' | 'MPESA' | 'AIRTEL') => {
        if (splitAmount <= 0 || splitAmount > amount) {
            return toast.error(`Please enter a valid amount up to ${amount.toLocaleString()} KES.`);
        }

        if (method === 'MPESA' && !validateKenyanPhone(phone)) {
            return toast.error("Please enter a valid M-Pesa phone number (e.g., 07XX... or 01XX...)");
        }
        
        setIsProcessing(true);
        try {
            const isGuest = !!localStorage.getItem('guest_token');
            const endpoint = isGuest ? '/api/orders/tabs/guest-checkout' : '/api/orders/tabs/init-payment';

            const payload = {
                orderIds,
                settlement_method: method === 'MPESA' ? 'M-PESA' : method,
                phone: method === 'MPESA' ? phone : undefined,
                amount_to_pay: splitAmount // ⚡ THE MAGIC VARIABLE
            };

            const { data } = await api.post(endpoint, payload);

            if (data.access_code) {
                setPaystackAccessCode(data.access_code);
            } else {
                setActiveTransactionPhase('AWAITING_PROMPT');
                toast.success(`M-Pesa prompt dispatched!`);
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
        <div className="fixed inset-0 z-[9000] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300" onClick={!isProcessing ? handleClose : undefined}></div>
            
            <div className="relative w-full md:max-w-md bg-white rounded-t-[2rem] md:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
                
                {!isProcessing && (
                    <button onClick={handleClose} className="absolute top-4 right-4 w-10 h-10 bg-slate-100 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 transition-colors shrink-0 z-10">
                        <X size={20}/>
                    </button>
                )}

                <div className="text-center mb-6 mt-2 shrink-0">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Complete Payment</h3>
                    <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
                        Remaining Balance: <span className="text-slate-900 text-lg">{amount.toLocaleString()} KES</span>
                    </p>
                </div>

                <div className="space-y-4 relative flex-1 overflow-y-auto custom-scrollbar pr-1 pb-2">
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
                            <p className="text-slate-500 text-sm text-center mt-2 px-6 font-medium">Enter your M-Pesa PIN on the prompt sent to your device.</p>
                        </div>
                    )}

                    {/* ⚡ THE TENDER SPLITTER CALCULATOR */}
                    {activeTrack === null && (
                        <div className="mb-6 space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex justify-between items-end px-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Amount to Pay</label>
                                {splitAmount < amount && <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Partial Payment</span>}
                            </div>
                            <div className="relative group">
                                <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                <input 
                                    type="number" 
                                    value={splitAmount || ''}
                                    onChange={(e) => setSplitAmount(Number(e.target.value))}
                                    max={amount}
                                    disabled={isProcessing}
                                    className="w-full bg-white border-2 border-slate-200 rounded-xl pl-12 pr-12 py-3 text-2xl font-black text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all disabled:opacity-50"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">KES</div>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button onClick={() => setSplitAmount(amount)} disabled={isProcessing} className="flex-1 py-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50">Full Balance</button>
                                <button onClick={() => setSplitAmount(Math.round(amount / 2))} disabled={isProcessing} className="flex-1 py-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50">Split 50%</button>
                            </div>
                        </div>
                    )}

                    {/* ⚡ OPTION 1: M-PESA */}
                    {(activeTrack === null || activeTrack === 'MPESA') && (
                        <div className={`overflow-hidden transition-all duration-500 border ${activeTrack === 'MPESA' ? 'border-emerald-200 bg-emerald-50/50 rounded-3xl p-5' : 'border-slate-200 hover:border-emerald-200 bg-white hover:bg-emerald-50/30 rounded-2xl p-4 cursor-pointer group'}`}
                             onClick={() => !activeTrack && setActiveTrack('MPESA')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition-colors ${activeTrack === 'MPESA' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                                        <Smartphone size={24} />
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-black text-lg leading-tight text-slate-900">M-Pesa</span>
                                        <span className="text-xs text-emerald-600/70 font-bold uppercase tracking-wider">Fast STK Push</span>
                                    </div>
                                </div>
                                {!activeTrack && <ChevronRight size={24} className="text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all"/>}
                            </div>

                            {activeTrack === 'MPESA' && (
                                <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <input 
                                        type="tel" 
                                        placeholder="Mobile (07XX... / 01XX...)" 
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                        disabled={isProcessing}
                                        className="w-full text-center text-2xl tracking-widest font-black py-4 bg-white border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all disabled:opacity-50"
                                    />
                                    <button 
                                        onClick={() => handleInitiatePayment('MPESA')}
                                        disabled={isProcessing || !validateKenyanPhone(phone)}
                                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? <Loader2 size={24} className="animate-spin" /> : `Pay ${splitAmount.toLocaleString()} KES`}
                                    </button>
                                    {!isProcessing && (
                                        <button onClick={() => setActiveTrack(null)} className="w-full py-2 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">
                                            Go back
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ⚡ OPTION 2: AIRTEL MONEY */}
                    {(activeTrack === null || activeTrack === 'AIRTEL') && (
                        <button 
                            onClick={() => {
                                setActiveTrack('AIRTEL');
                                handleInitiatePayment('AIRTEL');
                            }}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 border border-red-100 text-red-900 rounded-2xl transition-all group disabled:opacity-50"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                    {isProcessing && activeTrack === 'AIRTEL' ? <Loader2 size={24} className="animate-spin text-red-600" /> : <Smartphone size={24} className="text-red-600"/>}
                                </div>
                                <div className="text-left">
                                    <span className="block font-black text-lg leading-tight">Airtel Money</span>
                                    <span className="text-xs text-red-600/70 font-bold uppercase tracking-wider">Secure Gateway</span>
                                </div>
                            </div>
                            {!isProcessing && <ChevronRight size={24} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>}
                        </button>
                    )}

                    {/* ⚡ OPTION 3: BANK CARD */}
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
                </div>
            </div>
        </div>
    );
}