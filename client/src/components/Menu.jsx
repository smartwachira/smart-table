import React, {useState, useEffect, useCallback} from 'react';
import { useParams, useSearchParams} from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, ShoppingBag,Plus,Minus,Info,UtensilsCrossed, AlertCircle,Moon,Smartphone} from  'lucide-react';
import { useCart} from '../context/CartContext'
import FloatingCart  from './FloatingCart.jsx';

export default function Menu(){
  const {venueId} = useParams();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table') || 'Takeaway';

  const {cart,updateQuantity,cartTotals,setIsCartOpen, venueConfig, setVenueConfig} = useCart();

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMenu = useCallback(async ()=>{
    if (!venueId){
      setError("No venue specified. Please scan a valid QR code.");
      setIsLoading(false);
      return;
    }
    try {
      const res = await axios.get(`/api/menu/public/${venueId}`);
      setCategories(res.data.categories);
      setItems(res.data.items);
      setVenueConfig(res.data.venue)
    } catch (err){
      setError("Failed to load the menu. The venue might be offline.");
      console.log("Error  loading the menu",err)
    } finally {
      setIsLoading(false);
    }
  },[venueId,setVenueConfig])

  useEffect(()=>{
    fetchMenu();
  },[fetchMenu]);

  const filteredItems = items.filter(item =>{
    const matchesCat = activeCategory === 'all' || item.category_id === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat &&  matchesSearch;
  });

  if (error){
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-red-500 mb-4"></AlertCircle>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Oops!</h2>
        <p className="text-slate-600">{error}</p>
      </div>
    )
  }

  if (isLoading) return <MenuSkeleton></MenuSkeleton>;

  // ⚡ THE MASTER LOCK: Check if venue is accepting orders
    if (venueConfig && !venueConfig.is_accepting_orders) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-2xl">
                    <Moon size={40} className="text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">{venueConfig.name} is Closed</h2>
                <p className="text-slate-400 max-w-xs">We are not accepting digital orders right now. Please check back later or speak to a waiter.</p>
            </div>
        );
    }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32">

      {/* Slide-out Cart Drawer */}
      <FloatingCart tableNumber={tableNumber} venueId={venueId}></FloatingCart>

      {/* HERO HEADER */}
      <header className="bg-white px-4 md:px-8 pt-8 pb-6 md:pb-8 rounded-b-[2.5rem] shadow-sm relative z-10">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-12">
              
              {/* LEFT ZONE: Identity (Logo, Name, Table) */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4 md:flex-row md:gap-6">
                  
                  {/* Logo */}
                  <div className="shrink-0">
                      {venueConfig?.logo_url ? (
                          <img 
                              src={`http://localhost:5000${venueConfig.logo_url}`} 
                              alt={venueConfig.name} 
                              className="w-24 h-24 md:w-28 md:h-28 rounded-3xl shadow-lg object-cover border-4 border-slate-50 animate-in zoom-in duration-500"
                          />
                      ) : (
                          <div className="w-24 h-24 md:w-28 md:h-28 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-lg border-4 border-slate-50">
                              <UtensilsCrossed size={40} />
                          </div>
                      )}
                  </div>

                  {/* Typography */}
                  <div className="flex flex-col justify-center space-y-1">
                      <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
                          {venueConfig?.name}
                      </h1>
                      
                      <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
                          <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold border border-emerald-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              Table {tableNumber}
                          </span>
                          
                          {/* Info Button (Moved to sit next to the Table Number) */}
                          <button className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors" aria-label="Venue Information">
                              <Info size={16}/>
                          </button>
                      </div>
                  </div>
              </div>

              {/* RIGHT ZONE: Actions (Search) */}
              <div className="w-full md:max-w-md md:shrink-0 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                      type="text"
                      placeholder="Search for dishes, drinks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 md:py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
                  />
              </div>
              
          </div>
      </header>

      {/* STICKY CATEGORY NAV */}
      <div className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md pt-5 pb-3 border-b border-slate-200 shadow-sm">
        <div className="flex overflow-x-auto px-4 gap-3 scrollbar-hide pb-2">
          <button
            onClick={()=>setActiveCategory('all')}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${
              activeCategory === 'all' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >All</button>
          {categories.map(cat => (
            <button
              key={cat.category_id}
              onClick={()=> setActiveCategory(cat.category_id)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${
                activeCategory === cat.category_id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* MENU ITEMS FEED */}
      <main className="px-4 py-6 space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <UtensilsCrossed size={48} className="mx-auto text-slate-300 mb-4"></UtensilsCrossed>
            <h3 className="text-lg font-bold text-slate-700">No items found</h3>
            <p className="text-slate-500 text-sm  mt-1">Try a different category or search term.</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const cartQty = cart[item.item_id]?.quantity || 0;
            const formattedPrice = item.price.toLocaleString('en-KE',{ style: 'currency',currency:'KES',minimumFractionDigits: 0});

            return (
              <div key={item.item_id} className="bg-white rounded-[1.5rem] p-3 flex gap-4 shadow-sm border border-slate-100 items-stretch">
                <div className="w-28 h-28 shrink-0 rounded-2xl bg-slate-100 overflow-hidden relative border border-slate-200/50">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className='w-full h-full object-cover' loading='lazy'/>                   
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <UtensilsCrossed size={32}/>
                      </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col justify-between py-1 pr-1">
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight text-[15px]">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-1 5 line-clamp-2 leading-relaxed">
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
                          updateQuantity(item, 1);
                          toast.success(`Added ${item.name}`,{position:'top-center'})
                          
                        }}
                        className='w-9 h-9 bg-slate-900 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md active:scale-95'
                      >
                        <Plus size={20}></Plus>
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 bg-slate-100 rounded-full p-1 border border-slate-200 shadow-inner">
                        <button onClick={()=>updateQuantity(item,-1)} className="w-7 h-7 bg-white text-slate-700 rounded-full flex items-center justify-center shadow-sm active:scale-95">
                          <Minus size={16}/>
                        </button>
                        <span className="font-bold text-slate-900 w-3 text-center text-sm">{cartQty}</span>
                        <button onClick={()=>updateQuantity(item,1)} className='w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-sm active:scale-95'>
                          <Plus size={16}/>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </main>
      {/* Footer Branding */}
      <div className="py-12 mt-8 flex flex-col items-center justify-center text-slate-300 opacity-60">
          <Smartphone size={24} className="mb-2" />
          <span className="text-[10px] font-black uppercase tracking-widest">Powered by</span>
          <span className="text-sm font-black tracking-tight text-slate-400">Smart Table</span>
      </div>

      {/* FLOATING ACTION  BAR */}
      {cartTotals.count > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <button onClick={()=>setIsCartOpen(true)} className="w-full bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between active:scale-[0.98] transition-transform  border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center relative">
                <ShoppingBag size={20} className="text-indigo-400"></ShoppingBag>
                <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-sm">
                  {cartTotals.count}
                </span>
              </div>
              <span className="font-bold text-lg tracking-wide">Review Order</span>
              
            </div>
            <span className="font-bold text-lg bg-white-10 px-3 py-1.5 rounded-2xl">
              {cartTotals.total.toLocaleString('en-KE', { style: 'currency',currency: 'KES',minimumFractionDigits: 0})}
            </span>
            
          </button>
        </div>
      )}
    </div>
  )

};

function MenuSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50 px-4 pt-8 pb-6 space-y-6 animate-pulse">
            <div className="h-32 bg-slate-200 rounded-[2.5rem] w-full"></div>
            <div className="flex gap-3 overflow-hidden mt-6">
                <div className="w-20 h-10 bg-slate-200 rounded-full shrink-0"></div>
                <div className="w-32 h-10 bg-slate-200 rounded-full shrink-0"></div>
                <div className="w-24 h-10 bg-slate-200 rounded-full shrink-0"></div>
            </div>
            <div className="space-y-4 mt-6">
                {[1,2,3,4].map(i => (
                    <div key={i} className="h-36 bg-white border border-slate-100 rounded-[1.5rem] w-full flex gap-4 p-3">
                        <div className="w-28 h-28 bg-slate-200 rounded-2xl shrink-0"></div>
                        <div className="flex-1 space-y-3 py-2">
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-200 rounded w-full"></div>
                            <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                            <div className="h-6 bg-slate-200 rounded w-1/3 mt-auto"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}