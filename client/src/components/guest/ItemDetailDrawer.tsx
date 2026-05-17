import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, UtensilsCrossed, ShoppingBag } from 'lucide-react';

// ⚡ BUG FIX: Correctly imported from the new custom hook location!
import { MenuItemType } from '../../hooks/useMenu'; 

import { useCustomerCartStore } from '../../store/useCustomerCartStore';
import { toast } from 'sonner';

interface ItemDetailDrawerProps {
    item: MenuItemType | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ItemDetailDrawer({ item, isOpen, onClose }: ItemDetailDrawerProps) {
    const { cart, updateQuantity } = useCustomerCartStore();
    const [localQty, setLocalQty] = useState(1);

    useEffect(() => {
        if (isOpen && item) {
            const existingQty = cart[item.item_id]?.quantity || 1;
            setLocalQty(existingQty);
        }
    }, [isOpen, item, cart]);

    if (!isOpen || !item) return null;

    const formattedPrice = Number(item.price).toLocaleString('en-KE', { 
        style: 'currency', currency: 'KES', minimumFractionDigits: 0 
    });
    
    const lineTotal = (Number(item.price) * localQty).toLocaleString('en-KE', { 
        style: 'currency', currency: 'KES', minimumFractionDigits: 0 
    });

    const handleAddToCart = () => {
        const currentCartQty = cart[item.item_id]?.quantity || 0;
        const diff = localQty - currentCartQty;
        
        if (diff !== 0) {
            updateQuantity({
                item_id: item.item_id,
                name: item.name,
                price: Number(item.price),
                image_url: item.image_url
            }, diff);
        }
        toast.success(`Added ${localQty}x ${item.name} to tab`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
                onClick={onClose} 
            />
            
            {/* ⚡ Responsive Container: Max height 90% of screen, dynamic flex layout */}
            <div className="relative w-full max-w-md mx-auto bg-white max-h-[90dvh] flex flex-col rounded-t-[2rem] shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
                
                <div className="absolute top-4 right-4 z-20">
                    <button onClick={onClose} className="w-10 h-10 bg-black/40 backdrop-blur-md text-white hover:bg-black/60 rounded-full flex items-center justify-center transition-colors shadow-lg active:scale-95">
                        <X size={20} />
                    </button>
                </div>

                {/* ⚡ Responsive Image: Max 35% of the viewport height */}
                <div className="w-full shrink-0 bg-slate-100 relative" style={{ maxHeight: '35vh', height: '250px' }}>
                    {item.image_url ? (
                        <img 
                            src={item.image_url.startsWith('http') ? item.image_url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${item.image_url}`} 
                            alt={item.name} 
                            className="w-full h-full object-cover" 
                            onError={(e:any)=>{e.target.style.display='none'}} 
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <UtensilsCrossed size={48} />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-80" />
                </div>

                {/* Text Content (Scrollable if necessary) */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 custom-scrollbar">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight tracking-tight">{item.name}</h2>
                    <p className="text-xl font-black text-indigo-600">{formattedPrice}</p>
                    
                    {item.description && (
                        <p className="text-sm md:text-base text-slate-600 font-medium leading-relaxed mt-3">
                            {item.description}
                        </p>
                    )}
                </div>

                {/* Fixed Bottom Action Bar */}
                <div className="px-4 py-4 md:p-6 bg-white border-t border-slate-100 space-y-3 pb-8 md:pb-6 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center justify-center gap-4 bg-slate-50 p-2 rounded-[1.5rem] border border-slate-200 mx-auto max-w-[250px]">
                        <button onClick={() => setLocalQty(Math.max(1, localQty - 1))} className="w-12 h-12 bg-white text-slate-700 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-transform border border-slate-100">
                            <Minus size={20} />
                        </button>
                        <span className="text-2xl font-black text-slate-900 w-12 text-center">{localQty}</span>
                        <button onClick={() => setLocalQty(localQty + 1)} className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-transform">
                            <Plus size={20} />
                        </button>
                    </div>
                    
                    <button 
                        onClick={handleAddToCart} 
                        className="w-full h-14 md:h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.5rem] font-black text-base md:text-lg flex items-center justify-between px-6 shadow-xl active:scale-[0.98] transition-transform"
                    >
                        <span className="flex items-center gap-2"><ShoppingBag size={20}/> Add to Tab</span>
                        <span className="bg-white/20 px-3 py-1 rounded-xl backdrop-blur-sm text-sm">{lineTotal}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}