import React from 'react';
import { QrCode, UtensilsCrossed} from 'lucide-react';

const ScanPage: React.FC = () =>{
    return (
        <div className="min-h-[100dvh] bg-slate-900 flex flex-col relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-96 bg-indigo-600/20 blur-3xl rounded-full -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 blur-3xl rounded-full translate-y-1/3 translate-x-1/3"></div>

            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10">
                
                {/* Bouncing QR Icon */}
                <div className="relative mb-8 animate-in zoom-in duration-700">
                    <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-50 rounded-full animate-pulse"></div>
                    <div className="w-28 h-28 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center relative rotate-3 transform hover:rotate-6 transition-transform">
                        <QrCode size={56} className="text-slate-900" />
                    </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
                    Ready to order?
                </h1>
                
                <p className="text-slate-300 font-medium text-lg max-w-sm mb-10 leading-relaxed">
                    To view the menu and place an order, please scan the QR code located on your table.
                </p>

                {/* Instructions Card */}
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-6 w-full max-w-sm text-left space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black shrink-0">1</div>
                        <p className="text-slate-200 text-sm font-medium mt-1">Open your phone's camera app.</p>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black shrink-0">2</div>
                        <p className="text-slate-200 text-sm font-medium mt-1">Point it at the Smart Table QR code on your table.</p>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black shrink-0">3</div>
                        <p className="text-slate-200 text-sm font-medium mt-1">Tap the link that appears to start ordering!</p>
                    </div>
                </div>

            </main>

            {/* Footer Branding */}
            <footer className="py-8 flex flex-col items-center justify-center text-slate-500 relative z-10">
                <UtensilsCrossed size={24} className="mb-2 opacity-50" />
                <span className="text-[10px] font-black uppercase tracking-widest">Powered by</span>
                <span className="text-sm font-black tracking-tight text-slate-400">Smart Table</span>
            </footer>
        </div>
    );
};
export default ScanPage;