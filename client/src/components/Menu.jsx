import React, {useState, useEffect, useCallback} from 'react';
import { useParams, useSearchParams} from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, ShoppingBag,Plus,Minus,Info,UtensilsCrossed, AlertCircle} from  'lucide-react';
import { useCart} from '../context/CartContext'
import FloatingCart  from './FloatingCart.jsx';

export default function Menu(){
  const {venueId} = useParams();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table') || 'Takeaway';

  const {cart,updateQuantity,cartTotals,setIsCartOpen} = useCart();

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
    } catch (err){
      setError("Failed to load the menu. The venue might be offline.");
      console.log("Error  loading the menu",err)
    } finally {
      setIsLoading(false);
    }
  },[venueId])

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

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32">

      {/* Slide-out Cart Drawer */}
      <FloatingCart tableNumber={tableNumber} venueId={venueId}></FloatingCart>

      {/* HERO HEADER */}
      <header className="bg-white px-4 pt-8 pb-6 rounded-b-[2.5rem] shadow-sm relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold">
            {/* Placeholder for venue logo */}
            ST
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Smart Table</h1>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 inline-block px-3 py-1 rounded-full mt-1">
              {tableNumber}
            </p>
          </div>
          <button className='w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors'>
            <Info size={20}/>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}></Search>
          <input 
            type="text"
            placeholder='Search for dishes, drinks...'
            value={searchQuery}
            onChange={(e)=>setSearchQuery(e.target.value)} 
            className='w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner'
          />
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