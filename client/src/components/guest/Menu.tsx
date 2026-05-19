import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { toast } from 'sonner';
import { Search, ShoppingBag, UtensilsCrossed, AlertCircle, Moon, Smartphone, Receipt, Plus, Minus } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { useSwipeable } from 'react-swipeable'; 
import { useQueryClient } from '@tanstack/react-query';
import io, { Socket } from 'socket.io-client';

// ⚡ IMPORT THE NEW CUSTOM HOOK AND TYPES
import { usePublicMenu, MenuItemType } from '../../hooks/useMenu'; 
import { useCustomerCartStore } from '../../store/useCustomerCartStore';
import { useCustomerStore } from '../../store/useCustomerStore'; 
import FloatingCart from './FloatingCart'; 
import MyOrdersDrawer from './MyOrdersDrawer';
import ItemDetailDrawer from './ItemDetailDrawer'; 

interface GuestJwtPayload {
    role: string;
    venueId: string;
    tableName: string;
    orderMode: 'KIOSK' | 'TAB';
    exp: number;
}

export default function Menu() {
  const navigate = useNavigate();
  const { cart, updateQuantity, setIsCartOpen, venueConfig, setVenueConfig, getCartTotals } = useCustomerCartStore();
  const cartTotals = getCartTotals();
  
  const { activeCategory, searchQuery, setActiveCategory, setSearchQuery } = useCustomerStore();

  const [venueId, setVenueId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState<string>('');
  
  const [isOrdersDrawerOpen, setIsOrdersDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItemType | null>(null); 
  const queryClient = useQueryClient();

    // ============================================================================
    // ⚡ WEBSOCKET INTEGRATION: Global Venue State Synchronization
    // ============================================================================
    useEffect(() => {
        const guestToken = localStorage.getItem('guest_token');
        if (!guestToken) return;

        // ⚡ Secure Handshake using the Guest JWT
        const socket: Socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
            auth: { guest_token: guestToken }
        });

        // ⚡ Sniper Rifle: Refetch the public menu without disrupting the user's scroll
        const invalidateMenuState = () => {
            queryClient.invalidateQueries({ queryKey: ['publicMenu'] });
        };

        // Listen for Global Venue State changes
        socket.on('menu:updated', invalidateMenuState);
        socket.on('settings:updated', invalidateMenuState);

        return () => {
            socket.disconnect();
        };
    }, [queryClient]);

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

  // ⚡ REFACTOR: The component is now clean, relying entirely on the custom hook!
  const { data: menuData, isLoading, error } = usePublicMenu(venueId);

  useEffect(() => {
      if (menuData?.venue && !venueConfig) {
          setVenueConfig(menuData.venue);
      }
  }, [menuData, venueConfig, setVenueConfig]);

  const categories = menuData?.categories || [];
  const items = menuData?.items || [];

  // ============================================================================
  // ⚡ GESTURE LOGIC: Handle Swiping between categories
  // ============================================================================
  
  const activeCategoryList = ['all', ...categories.map(c => c.category_id)];

  const handlers = useSwipeable({
      onSwipedLeft: () => {
          const currentIndex = activeCategoryList.indexOf(activeCategory);
          if (currentIndex < activeCategoryList.length - 1) {
              setActiveCategory(activeCategoryList[currentIndex + 1]);
          }
      },
      onSwipedRight: () => {
          const currentIndex = activeCategoryList.indexOf(activeCategory);
          if (currentIndex > 0) {
              setActiveCategory(activeCategoryList[currentIndex - 1]);
          }
      },
      preventScrollOnSwipe: true,
      trackMouse: false, 
      delta: 50 
  });


  const filteredItems = items.filter(item => {
    const matchesCat = activeCategory === 'all' || item.category_id === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch && item.is_available;
  });

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

  if (isLoading || !venueId) return <MenuSkeleton />;

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
    <div {...handlers} className="min-h-screen bg-slate-50 font-sans pb-32 relative">

      <FloatingCart tableNumber={tableNumber} />
      
      <MyOrdersDrawer 
          isOpen={isOrdersDrawerOpen} 
          onOpen={() => setIsOrdersDrawerOpen(true)}
          onClose={() => setIsOrdersDrawerOpen(false)} 
          venueId={venueId} 
      />

      <ItemDetailDrawer 
          item={selectedItem} 
          isOpen={!!selectedItem} 
          onClose={() => setSelectedItem(null)} 
      />

      <header className="bg-white border-b border-slate-200 shadow-sm relative z-10">
          <div className="max-w-6xl mx-auto px-4 pt-6 pb-4 space-y-4">
              
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden pr-4">
                      <div className="w-12 h-12 shrink-0 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-md overflow-hidden">
                          {menuData?.venue?.logo_url ? (
                              <img src={menuData.venue.logo_url.startsWith('http') ? menuData.venue.logo_url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${menuData.venue.logo_url}`} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                              <UtensilsCrossed size={20} />
                          )}
                      </div>
                      <div className="flex flex-col truncate">
                          <h1 className="text-lg font-black text-slate-900 truncate leading-tight">
                              {menuData?.venue?.name}
                          </h1>
                          <div className="flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-200 uppercase tracking-widest">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Table {tableNumber}
                              </span>
                          </div>
                      </div>
                  </div>

                  <button 
                      onClick={() => setIsOrdersDrawerOpen(true)}
                      className="shrink-0 flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-2xl text-sm font-bold transition-colors active:scale-95"
                  >
                      <Receipt size={18} className="text-indigo-600" />
                      <span className="hidden sm:inline">My Tab</span>
                  </button>
              </div>

              <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                      type="text"
                      placeholder="Search menu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      className="w-full bg-slate-100 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all shadow-inner"
                  />
              </div>
          </div>
      </header>

      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl pt-3 pb-3 border-b border-slate-200 shadow-sm">
        <div className="flex overflow-x-auto px-4 gap-2 custom-scrollbar pb-1 max-w-6xl mx-auto">
          <button
            id="cat-all"
            onClick={()=>setActiveCategory('all')}
            className={`shrink-0 whitespace-nowrap px-5 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${
              activeCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >All</button>
          {categories.map(cat => (
            <button
              id={`cat-${cat.category_id}`}
              key={cat.category_id}
              onClick={()=> setActiveCategory(cat.category_id)}
              className={`shrink-0 whitespace-nowrap px-5 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${
                activeCategory === cat.category_id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4 py-6 space-y-4 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300" key={activeCategory}>
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center opacity-70">
            <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <UtensilsCrossed size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">No items found</h3>
            <p className="text-slate-500 font-medium mt-1 text-sm">Try a different category or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {filteredItems.map(item => {
                const cartQty = cart[item.item_id]?.quantity || 0;
                const formattedPrice = Number(item.price).toLocaleString('en-KE',{ style: 'currency',currency:'KES',minimumFractionDigits: 0});

                return (
                  <div 
                      key={item.item_id} 
                      onClick={() => setSelectedItem(item)}
                      className="group bg-white rounded-[1.5rem] p-3 flex gap-4 shadow-sm border border-slate-100 cursor-pointer active:scale-[0.98] transition-transform hover:shadow-md hover:border-indigo-100 relative"
                  >
                    
                    <div className="w-28 h-28 shrink-0 rounded-2xl bg-slate-100 overflow-hidden relative border border-slate-200/50">
                        {cartQty > 0 && (
                            <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-md z-10 border border-indigo-700">
                                {cartQty}x
                            </div>
                        )}
                        {item.image_url ? (
                          <img src={item.image_url.startsWith('http') ? item.image_url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${item.image_url}`} alt={item.name} className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110' loading='lazy' onError={(e:any)=>{e.target.style.display='none'}}/>                  
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <UtensilsCrossed size={32}/>
                          </div>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-1 pr-1">
                      <div>
                        <h3 className="font-black text-slate-900 leading-tight text-base tracking-tight pr-4">{item.name}</h3>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 font-medium mt-1 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span className="font-black text-indigo-600 text-[17px]">
                          {formattedPrice}
                        </span>

                        {cartQty === 0 ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); 
                                    updateQuantity({
                                        item_id: item.item_id,
                                        name: item.name,
                                        price: Number(item.price),
                                        image_url: item.image_url
                                    }, 1);
                                    toast.success(`Added ${item.name}`, { position: 'top-center' });
                                }}
                                className='w-10 h-10 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm active:scale-95'
                            >
                                <Plus size={20} />
                            </button>
                        ) : (
                            <div 
                                className="flex items-center gap-2 bg-slate-100 rounded-xl p-1 border border-slate-200 shadow-inner"
                                onClick={(e) => e.stopPropagation()} 
                            >
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation(); 
                                        updateQuantity({ item_id: item.item_id, name: item.name, price: Number(item.price), image_url: item.image_url }, -1);
                                    }} 
                                    className="w-8 h-8 bg-white text-slate-700 rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                                >
                                    <Minus size={16}/>
                                </button>
                                <span className="font-black text-slate-900 w-4 text-center text-sm">{cartQty}</span>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation(); 
                                        updateQuantity({ item_id: item.item_id, name: item.name, price: Number(item.price), image_url: item.image_url }, 1);
                                    }} 
                                    className='w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform'
                                >
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

      <div className="py-12 mt-4 flex flex-col items-center justify-center text-slate-300 opacity-60">
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
        <div className="min-h-screen bg-slate-50 px-4 pt-6 pb-6 space-y-6 animate-pulse max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                    <div className="space-y-2">
                        <div className="h-5 bg-slate-200 rounded w-32"></div>
                        <div className="h-4 bg-slate-200 rounded w-16"></div>
                    </div>
                </div>
                <div className="w-20 h-10 bg-slate-200 rounded-xl"></div>
            </div>
            <div className="h-12 bg-slate-200 rounded-2xl w-full"></div>
            
            <div className="flex gap-2 overflow-hidden mt-2">
                <div className="w-20 h-10 bg-slate-200 rounded-xl shrink-0"></div>
                <div className="w-32 h-10 bg-slate-200 rounded-xl shrink-0"></div>
                <div className="w-24 h-10 bg-slate-200 rounded-xl shrink-0"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-36 bg-white border border-slate-100 rounded-[1.5rem] w-full flex gap-4 p-3">
                        <div className="w-28 h-28 bg-slate-200 rounded-2xl shrink-0"></div>
                        <div className="flex-1 space-y-3 py-2">
                            <div className="h-5 bg-slate-200 rounded-md w-3/4"></div>
                            <div className="h-3 bg-slate-200 rounded w-full"></div>
                            <div className="h-6 bg-slate-200 rounded-md w-1/3 mt-auto"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};