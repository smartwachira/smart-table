import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, ShoppingBag, Plus, Minus, Info, UtensilsCrossed, AlertCircle, Moon, Smartphone, Receipt } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';

import api from '../../utils/axiosConfig'; // ⚡ Global Interceptor
import { useCustomerCartStore } from '../../store/useCustomerCartStore';
import { useCustomerStore } from '../../store/useCustomerStore'; 
import FloatingCart from './FloatingCart'; 
import MyOrdersDrawer from './MyOrdersDrawer';

// 🛡️ Strict TypeScript Interfaces
interface GuestJwtPayload {
    role: string;
    venueId: string;
    tableName: string;
    orderMode: 'KIOSK' | 'TAB';
    exp: number;
}

export interface MenuCategoryType {
    category_id: string;
    name: string;
    venue_id: string;
}

export interface MenuItemType {
    item_id: string;
    name: string;
    price: string | number;
    description?: string;
    image_url?: string;
    is_available: boolean;
    category_id: string;
    MenuCategory?: MenuCategoryType;
}

interface MenuResponse {
    categories: MenuCategoryType[];
    items: MenuItemType[];
    venue: any; 
}

export default function Menu() {
  const navigate = useNavigate();
  const { cart, updateQuantity, setIsCartOpen, venueConfig, setVenueConfig, getCartTotals } = useCustomerCartStore();
  const cartTotals = getCartTotals();
  
  const { activeCategory, searchQuery, setActiveCategory, setSearchQuery } = useCustomerStore();

  const [venueId, setVenueId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [isOrdersDrawerOpen, setIsOrdersDrawerOpen] = useState(false);

  // Secure Session validation
  useEffect(() => {
    const token = localStorage.getItem('guest_token');
    if (!token) {
        navigate('/scan', { replace: true });
        return;
    }
    try {
        const decoded = jwtDecode<GuestJwtPayload>(token);
        if (decoded.role === 'GUEST') {
            setVenueId(decoded.venueId);
            setTableNumber(decoded.tableName);
        } else {
            navigate('/scan', { replace: true });
        }
    } catch (e) {
        navigate('/scan', { replace: true });
    }
  }, [navigate]);

  // ============================================================================
  // ⚡ TANSTACK QUERY: Server State Caching (Cleaned up via Interceptor)
  // ============================================================================
  const { data: menuData, isLoading, error } = useQuery({
      queryKey: ['publicMenu', venueId],
      queryFn: async () => {
          if (!venueId) throw new Error("No venue ID");
          // ⚡ The api interceptor automatically injects Bearer + x-guest-id
          const res = await api.get<MenuResponse>(`/api/menu/public`); 
          return res.data;
      },
      enabled: !!venueId,
      staleTime: 1000 * 60 * 5, 
      retry: 1
  });

  useEffect(() => {
      if (menuData?.venue && !venueConfig) {
          setVenueConfig(menuData.venue);
      }
  }, [menuData, venueConfig, setVenueConfig]);

  const categories = menuData?.categories || [];
  const items = menuData?.items || [];

  const filteredItems = items.filter(item => {
    const matchesCat = activeCategory === 'all' || item.category_id === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch && item.is_available;
  });

  // Error Handling UI
  if (error) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-red-500 mb-4 w-12 h-12" />
        <h2 className="text-xl font-black text-slate-900 mb-2">Connection Lost</h2>
        <p className="text-slate-600 font-medium max-w-sm">Failed to load the menu. Your session may have expired.</p>
        <button onClick={() => navigate('/scan')} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-full font-bold shadow-md active:scale-95 transition-transform">
            Scan New QR Code
        </button>
      </div>
    );
  }

  // Loading UI
  if (isLoading || !venueId) return <MenuSkeleton />;

  // Venue Closed UI
  if (menuData?.venue && !menuData.venue.is_accepting_orders) {
      return (
          <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
              <div className="w-24 h-24 bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl border-4 border-slate-800/50">
                  <Moon size={40} className="text-indigo-400" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">{menuData.venue.name} is Closed</h2>
              <p className="text-slate-400 max-w-xs font-medium">We are not accepting digital orders right now. Please check back later or speak to a waiter.</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32">

      <FloatingCart tableNumber={tableNumber} />
      <MyOrdersDrawer 
    isOpen={isOrdersDrawerOpen} 
    onClose={() => setIsOrdersDrawerOpen(false)} 
    venueId={venueId} 
/>

      <header className="bg-white px-4 md:px-8 pt-8 pb-6 md:pb-8 rounded-b-[2.5rem] shadow-sm relative z-10">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-12">
              
              <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4 md:flex-row md:gap-6">
                  <div className="shrink-0">
                      {menuData?.venue?.logo_url ? (
                          <img 
                              src={menuData.venue.logo_url.startsWith('http') ? menuData.venue.logo_url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${menuData.venue.logo_url}`} 
                              alt={menuData.venue.name} 
                              className="w-24 h-24 md:w-28 md:h-28 rounded-3xl shadow-lg object-cover border-4 border-slate-50 animate-in zoom-in duration-500"
                              onError={(e:any)=>{e.target.style.display='none'}}
                          />
                      ) : (
                          <div className="w-24 h-24 md:w-28 md:h-28 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-lg border-4 border-slate-50">
                              <UtensilsCrossed size={40} />
                          </div>
                      )}
                  </div>

                  <div className="flex flex-col justify-center space-y-1">
                      <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
                          {menuData?.venue?.name}
                      </h1>
                      
                      <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
                          <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold border border-emerald-200 shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              {tableNumber}
                          </span>
                          
                          <button className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors" aria-label="Venue Information">
                              <Info size={16}/>
                          </button>
                      </div>
                  </div>
              </div>

              <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[350px]">
                  <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                          type="text"
                          placeholder="Search for dishes, drinks..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 md:py-3 text-base md:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
                      />
                  </div>
                  {/* ⚡ UPDATED: Route to the consolidated tracking view */}
                  <button 
                      onClick={() => setIsOrdersDrawerOpen(true)} // ⚡ Open the drawer!
                      className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl py-3 md:py-2.5 text-sm font-bold flex justify-center items-center gap-2 shadow-sm transition-colors active:scale-95"
                  >
                      <Receipt size={16} className="text-indigo-500" /> Track My Orders
                  </button>
              </div>
          </div>
      </header>

      <div className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md pt-5 pb-3 border-b border-slate-200 shadow-sm">
        <div className="flex overflow-x-auto px-4 gap-3 custom-scrollbar pb-2">
          <button
            onClick={()=>setActiveCategory('all')}
            className={`shrink-0 whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${
              activeCategory === 'all' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >All</button>
          {categories.map(cat => (
            <button
              key={cat.category_id}
              onClick={()=> setActiveCategory(cat.category_id)}
              className={`shrink-0 whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${
                activeCategory === cat.category_id ? 'bg-slate-900 text-white shadow-slate-300' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4 py-6 space-y-4 max-w-6xl mx-auto">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <UtensilsCrossed size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">No items found</h3>
            <p className="text-slate-500 font-medium mt-1">Try a different category or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => {
                const cartQty = cart[item.item_id]?.quantity || 0;
                const formattedPrice = Number(item.price).toLocaleString('en-KE',{ style: 'currency',currency:'KES',minimumFractionDigits: 0});

                return (
                  <div key={item.item_id} className="bg-white rounded-[1.5rem] p-3 flex gap-4 shadow-sm border border-slate-100 items-stretch hover:shadow-md transition-shadow">
                    <div className="w-28 h-28 shrink-0 rounded-2xl bg-slate-100 overflow-hidden relative border border-slate-200/50">
                        {item.image_url ? (
                          <img src={item.image_url.startsWith('http') ? item.image_url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${item.image_url}`} alt={item.name} className='w-full h-full object-cover transition-transform hover:scale-105' loading='lazy' onError={(e:any)=>{e.target.style.display='none'}}/>                  
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <UtensilsCrossed size={32}/>
                          </div>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-1 pr-1">
                      <div>
                        <h3 className="font-black text-slate-900 leading-tight text-base tracking-tight">{item.name}</h3>
                        {item.description && (
                          <p className="text-[11px] md:text-xs text-slate-500 font-medium mt-1 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span className="font-black text-indigo-600 text-lg">
                          {formattedPrice}
                        </span>

                        {cartQty === 0 ? (
                          <button
                            onClick={()=>{
                              updateQuantity({
                                item_id: item.item_id,
                                name: item.name,
                                price: Number(item.price),
                                image_url: item.image_url
                              }, 1);
                              toast.success(`Added ${item.name}`,{position:'top-center'})
                            }}
                            className='w-10 h-10 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm active:scale-95'
                          >
                            <Plus size={20}></Plus>
                          </button>
                        ) : (
                          <div className="flex items-center gap-3 bg-slate-100 rounded-xl p-1 border border-slate-200 shadow-inner">
                            <button onClick={()=>updateQuantity({ item_id: item.item_id, name: item.name, price: Number(item.price), image_url: item.image_url }, -1)} className="w-8 h-8 bg-white text-slate-700 rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform">
                              <Minus size={16}/>
                            </button>
                            <span className="font-black text-slate-900 w-4 text-center text-sm">{cartQty}</span>
                            <button onClick={()=>updateQuantity({ item_id: item.item_id, name: item.name, price: Number(item.price), image_url: item.image_url }, 1)} className='w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform'>
                              <Plus size={16}/>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </main>

      <div className="py-12 mt-8 flex flex-col items-center justify-center text-slate-300 opacity-60">
          <Smartphone size={24} className="mb-2" />
          <span className="text-[10px] font-black uppercase tracking-widest">Powered by</span>
          <span className="text-sm font-black tracking-tight text-slate-400">Smart Table</span>
      </div>

      {cartTotals.count > 0 && (
        <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-96 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <button onClick={()=>setIsCartOpen(true)} className="w-full bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between active:scale-[0.98] transition-transform border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center relative backdrop-blur-sm">
                <ShoppingBag size={24} className="text-indigo-400"></ShoppingBag>
                <span className="absolute -top-2 -right-2 bg-indigo-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-sm">
                  {cartTotals.count}
                </span>
              </div>
              <span className="font-black text-lg tracking-wide">Review Order</span>
            </div>
            <span className="font-black text-lg bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/5">
              {cartTotals.total.toLocaleString('en-KE', { style: 'currency',currency: 'KES',minimumFractionDigits: 0})}
            </span>
          </button>
        </div>
      )}
    </div>
  )
};

const MenuSkeleton: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 px-4 pt-8 pb-6 space-y-6 animate-pulse max-w-6xl mx-auto">
            <div className="h-40 bg-slate-200 rounded-[2.5rem] w-full"></div>
            <div className="flex gap-3 overflow-hidden mt-6">
                <div className="w-20 h-10 bg-slate-200 rounded-full shrink-0"></div>
                <div className="w-32 h-10 bg-slate-200 rounded-full shrink-0"></div>
                <div className="w-24 h-10 bg-slate-200 rounded-full shrink-0"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-36 bg-white border border-slate-100 rounded-[1.5rem] w-full flex gap-4 p-3">
                        <div className="w-28 h-28 bg-slate-200 rounded-2xl shrink-0"></div>
                        <div className="flex-1 space-y-3 py-2">
                            <div className="h-5 bg-slate-200 rounded-md w-3/4"></div>
                            <div className="h-3 bg-slate-200 rounded w-full"></div>
                            <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                            <div className="h-6 bg-slate-200 rounded-md w-1/3 mt-auto"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};