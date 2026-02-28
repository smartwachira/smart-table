import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from "axios";
import { UtensilsCrossed, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import MenuCategory from './MenuCategory';


const Menu =()=>{
  const { venueId } = useParams();
  const {addToCart} = useCart();

  //State Management
  const [venue,setVenue] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(()=>{
    const fetchMenu = async ()=>{
      try{
        setIsLoading(true);
        //Fallback for local testing if URL doesn't have a venue ID
        const targetVenue = venueId || '';

        const response = await axios.get(`/api/menu/${targetVenue}`);

        setVenue(response.data);

        //The ADAPTER PATTERN: Map 'item_id' from backend to 'id' for frontend
        const mappedCategories = response.data.MenuCategories.map(cat =>({
          ...cat,
          MenuItems: cat.MenuItems.map( item=>({
            ...item,
            id: item.item_id
          }))
        }));

        setCategories(mappedCategories);
      } catch (err){
        console.error("Menu fetch error:",err);
        setError("Failed to load the menu. Please scan the QR code again.");
      } finally{
        setIsLoading(false);
      }
    };

    fetchMenu();

  },[venueId]);

  //Loading State
  if (isLoading){
    return (
      <div className="flex flex-col items-center justify-center h-64 text-brand-primary">
        <Loader2 className="w-10 h-10 animate-spin mb-4"></Loader2>
        <p className="font-medium text-gray-600">Loading digital menu...</p>
      </div>
    )
  }

  // Error State
  if(error){
    return(
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <UtensilsCrossed className="w-12 h-12 text-gray-300 mb-4"></UtensilsCrossed>
        <p className="text-red-500 font-medium">{error}</p>
      </div>
    );
  }

  return(
    <div className="w-full">
      {venue && (
        <div className="mb-4 text-center sm:text-left bg-surface-muted p-6 rounded-2xl border border-gray-100">
          <h1 className="text-3xl font-bold text-brand-secondary">{venue.name}</h1>
          <p className="text-gray-500 mt-1">Tap an item to add it to your order.</p>
        </div>
      )}

      {/* Map the Categories */}
      {categories.length > 0?(
        categories.map((category)=>(
          <MenuCategory
            key={category.category_id}
            category={category}
            onAddToCart={addToCart}
          ></MenuCategory>
        ))
      ) : (
        <p className="text-center text-gray-500 py-10">No menu items available today.</p>
      )}
    </div>
  )
};
export default Menu;
