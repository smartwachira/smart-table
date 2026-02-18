// //import { useState, useEffect } from 'react';
// //import { useParams } from 'react-router-dom';
// //import axios from "axios";
// //import './Menu.css';
// import MenuCategory from './MenuCategory';
// import FloatingCart from './FloatingCart';
// //import { useCart } from '../context/CartContext';
// import MenuSkeleton  from './MenuSkeleton';
import MenuItem from './MenuItem';
import { useCart } from '../context/CartContext';


//Mock Data for Ui Testing
const MOCK_MENU = [
  {
    id:1,
    name: "Sizzling Steak",
    description: "Premium aged beef steak served with peppercorn sauce and golden fries",
    price:950,
    image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    is_available: true,

  },
  {
    id: 3,
    name: "Mojito Special",
    description: "Refreshing mint and lime cocktail. The perfect summer drink.",
    price: 650,
    image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
    is_available: false, // Testing Sold Out logic
  }
]


const Menu =()=>{
  const { handleAddTocart} = useCart()
  


  return(
    <div className="w-full animate-fadeIn">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-500 text-gray-900">Popular Items</h2>
        <span className="text-sm text-gray-500">{ MOCK_MENU.length} items</span>
      </div>

      {/* Responsive Grid System */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_MENU.map((item)=>(
          <MenuItem
            key={item.id}
            item={item}
            onAddToCart={handleAddTocart}
          />
        ))}
      </div>
    </div>
  )
};
export default Menu;
