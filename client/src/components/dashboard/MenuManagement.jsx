import React, { useState, useEffect} from "react";
import { toast } from 'react-hot-toast';
import {
    Search, Plus, Edit2, X,Check,Image as ImageIcon,
    MoreVertical,UtensilsCrossed, AlertCircle
} from 'lucide-react';
import axios from "axios";

// --- MOCK DATA ---
const MOCK_CATEGORIES = [
  { category_id: 'c1', name: 'Starters' },
  { category_id: 'c2', name: 'Main Courses' },
  { category_id: 'c3', name: 'Signature Cocktails' },
  { category_id: 'c4', name: 'Desserts' }
];

const MOCK_ITEMS = [
  { item_id: 'i1', name: 'Truffle Fries', price: 650, description: 'Crispy fries tossed in white truffle oil and parmesan.', image_url: 'https://images.unsplash.com/photo-1530016555861-3d1f3f5fd94b?auto=format&fit=crop&q=80&w=300&h=200', is_available: true, category_id: 'c1' },
  { item_id: 'i2', name: 'Wagyu Burger', price: 1800, description: '8oz Wagyu beef, brioche bun, aged cheddar, caramelized onions.', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=300&h=200', is_available: true, category_id: 'c2' },
  { item_id: 'i3', name: 'Spicy Margarita', price: 1200, description: 'Tequila blanco, fresh lime, agave, jalapeño slices.', image_url: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&q=80&w=300&h=200', is_available: false, category_id: 'c3' },
];

export default function MenuManagement(){
    // STATE
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    //Drawer & Form State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    //New Category State
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // LIFECYCLE
    useEffect(()=>{
        //Simulate API Fetch
        setTimeout(()=>{
            setCategories(MOCK_CATEGORIES);
            setItems(MOCK_ITEMS);
            setIsLoading(false);
        },600)
    }, []);

    // --- HANDLERS ---
    const handleToggleAvailability = async (itemId, currentStatus) => {
        //Optimistic UI Update for instant feedback
        setItems(items.map(item=>
            item.item_id === itemId ? {...item, is_available: !currentStatus} : item

        ));

        try {
            await axios.patch(`/api/menu/items/${itemId}/availability`,{ is_available: !currentStatus});
            toast.success(`Item marked as ${!currentStatus ? 'Available' : 'Unavailable'}`);
        } catch (error){
            //Revert on  failure
            setItems(items.map(item=>
                item.item_id === itemId ? {...item, is_available: !currentStatus} : item

            ));
            toast.error('Failed to update availability.');
            console.error("Error updating availability:", error);

        }
    }

    const handleSaveItem = async (formData)=>{
        try {
            // TODO: Replace with actual Axios POST/PUT request
            if (editingItem){
                // Update existing
                setItems(items.map(item=>
                    item.item_id === editingItem.item_id ? {...item,...formData} : item
                ));
                toast.success('Menu item updated.')
            } else {
                // Create new
                const newItem = { ...formData, item_id: `i${Date.now()}`};
                setItems([...items, newItem]);
                toast.success('New menu item added.')
            }
            setIsDrawerOpen(false);
        } catch (error){
            toast.error('Failed to save menu item.')
            console.error("Error saving menu item:", error);
        }
    };

    const handleAddCategory = async (e)=>{
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        try {
            // TODO: Replace with actual Axios POST request
            const newCat = { category_id: `c${Date.now()}`,name: newCategoryName};
            setCategories([...categories, newCat]);
            setNewCategoryName('');
            setIsAddingCategory(false);
            toast.success('Category created.');
        } catch (error) {
            toast.error('Failed to create category.');
            console.error("Error creating menu category:", error);
        };
    };

    const openDrawer = (item = null)=>{
        setEditingItem(item);
        setIsDrawerOpen(true);
    };

    // --DERIVED DATA--
    const filteredItems = items.filter(item=>{
        const matchesCategory = activeCategory === 'all' || item.category_id === activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="flex flex-col md:flex-row h-full min-h-[85vh] bg-slate-50 relative overflow-hidden">

            {/* ---LEFT COLUMN: CATEGORIES SIDEBAR--- */}
            <aside className="w-full md:w-64 lg:w-72 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col z-10">
                <div className="p-5 border-b border-slate-100 hidden md:block">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <UtensilsCrossed className="text-indigo-600" size={24}></UtensilsCrossed>
                        Menu Map
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Organize your offerings.</p>
                </div>

                {/* Mobile horizontal scroll // Desktop vertical list */}
                <div className="flex-1 overflow-x-auto md:overflow-y-auto p-4 md:p-3 scrollbar-hide flex md:flex-col gap-2 border-b md:border-b-0 border-slate-200">

                    <button
                        onClick={()=> setActiveCategory('all')}
                        className={`whitespace-nowrap md:whitespace-normal text-left px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center `}
                    >

                    </button>
                </div>
            </aside>
        </div>
    )
}