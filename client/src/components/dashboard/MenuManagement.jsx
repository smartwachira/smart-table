import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Search, Plus, Edit2, X, Check, Image as ImageIcon, 
  UtensilsCrossed, AlertCircle, UploadCloud, Trash2
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function MenuManagement() {
  // --- STATE ---
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const token = localStorage.getItem('token');
  const {user} = useAuth();
  const config = { headers: {
      Authorization: `Bearer ${token}`},
      venueId: user.venueId
  }

  // Drawer & Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // New Category State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // --- LIFECYCLE ---
  const fetchMenuData = async ()=> {
    setIsLoading(true);
    try {
      const [categoriesRes,itemsRes] = await Promise.all([
        axios.get('/api/menu/categories',config),
        axios.get('/api/menu/items',config)
      ]);

      setCategories(categoriesRes.data);
      setItems(itemsRes.data);
    } catch (error){
      console.error("Fetch Menu Data Error:",error);
      toast.error("Failed to load menu data. Please check your connection.")
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchMenuData();
  }, []);

  // --- HANDLERS ---
  const handleToggleAvailability = async (itemId, currentStatus) => {
    setItems(items.map(item => 
      item.item_id === itemId ? { ...item, is_available: !currentStatus } : item
    ));
    
    try {
      await axios.patch(`/api/menu/items/${itemId}`, { is_available: !currentStatus },config);
      toast.success(`Item marked as ${!currentStatus ? 'Available' : 'Unavailable'}`);
    } catch (error) {
      setItems(items.map(item => 
        item.item_id === itemId ? { ...item, is_available: currentStatus } : item
      ));
      toast.error('Failed to update availability.');
      console.error("Error updating availability:", error);
    }
  };

  const handleSaveItem = async (formData,imageFile) => {
    const token = localStorage.getItem('token');
    try {
        const payload = new FormData();
        payload.append('name',formData.name);
        payload.append('price', formData.price);
        payload.append('category_id',formData.category_id);
        payload.append('description',formData.description);
        payload.append('is_available',formData.is_available)

        if (imageFile) {
            payload.append('image', imageFile);
        }
      
        const config = { 
            headers: {
                'Content-Type':'multipart/form-data',
                Authorization: `Bearer ${token}`
            },
            venueId: user.venueId
        }
      if (editingItem) {
        const res = await axios.patch(`/api/menu/items/${editingItem.item_id}`, payload, config);
        setItems(items.map(item => item.item_id === editingItem.item_id ? res.data : item));
        toast.success('Menu item updated.');
      } else {
        const newItem = await axios.post('/api/menu/items', payload, config);
        setItems([newItem.data, ...items]);
        toast.success('New menu item added.');
      }
      setIsDrawerOpen(false);
    } catch (error) {
      toast.error('Failed to save menu item.');
      console.error("Error saving menu item:", error);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    try {
      const newCat = await axios.post('/api/menu/categories', {name: newCategoryName}, config);
      setCategories([...categories, newCat.data]);
      setNewCategoryName('');
      setIsAddingCategory(false);
      toast.success('Category created.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create category.');
      console.error("Error creating menu category:", error);
    }
  };

  // ⚡ NEW: Handle Category Deletion
  const handleDeleteCategory = async (e, categoryId, categoryName) => {
    e.stopPropagation(); 
    if (!window.confirm(`Are you sure you want to delete the "${categoryName}" category?`)) return;

    try {
      await axios.delete(`/api/menu/categories/${categoryId}`, config);
      setCategories(categories.filter(c => c.category_id !== categoryId));
      if (activeCategory === categoryId) setActiveCategory('all');
      toast.success('Category deleted.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete category.');
    }
  };

  // ⚡ NEW: Handle Item Deletion
  const handleDeleteItem = async (e, itemId, itemName) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to completely delete "${itemName}"?`)) return;

    try {
      await axios.delete(`/api/menu/items/${itemId}`, config);
      setItems(items.filter(i => i.item_id !== itemId));
      toast.success('Item deleted permanently.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete item.', { duration: 5000 });
    }
  };

  const openDrawer = (item = null) => {
    setEditingItem(item);
    setIsDrawerOpen(true);
  };

  // --- DERIVED DATA ---
  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category_id === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    // ⚡ MOBILE FIX: Changed min-h to h-[100dvh] md:h-full to prevent mobile scroll jumping
    <div className="flex flex-col md:flex-row h-[100dvh] md:h-full md:min-h-[85vh] bg-slate-50 relative overflow-hidden">
      
      {/* --- LEFT COLUMN: CATEGORIES SIDEBAR --- */}
      {/* ⚡ MOBILE FIX: Made this sticky at the top with a horizontal scrolling tab UI */}
      <aside className="w-full md:w-64 lg:w-72 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0 flex flex-col z-20 sticky top-0 md:static shadow-sm md:shadow-none">
        <div className="p-4 md:p-5 border-b border-slate-100 hidden md:block">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            <UtensilsCrossed className="text-indigo-600" size={24} />
            Menu Map
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Organize your offerings.</p>
        </div>

        {/* Categories List (Horizontal on mobile, vertical on desktop) */}
        <div className="flex-1 overflow-x-auto md:overflow-y-auto p-3 md:p-4 custom-scrollbar flex md:flex-col gap-2 items-center md:items-stretch snap-x snap-mandatory">
          
          <button
            onClick={() => setActiveCategory('all')}
            className={`shrink-0 snap-center whitespace-nowrap md:whitespace-normal text-left px-4 py-2 md:py-3 rounded-full md:rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-between gap-2 group ${
              activeCategory === 'all' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                : 'bg-slate-100 md:bg-transparent text-slate-600 hover:bg-slate-200 md:hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>All Items</span>
            <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full ${activeCategory === 'all' ? 'bg-indigo-500 text-white' : 'bg-slate-200 md:bg-slate-200 text-slate-600 group-hover:bg-slate-300'}`}>
              {items.length}
            </span>
          </button>

          {categories.map((cat) => {
            const itemCount = items.filter(i => i.category_id === cat.category_id).length;
            return (
              <button
                key={cat.category_id}
                onClick={() => setActiveCategory(cat.category_id)}
                className={`shrink-0 snap-center whitespace-nowrap md:whitespace-normal text-left px-4 py-2 md:py-3 rounded-full md:rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-between gap-2 group ${
                  activeCategory === cat.category_id 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                    : 'bg-slate-100 md:bg-transparent text-slate-600 hover:bg-slate-200 md:hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="truncate max-w-[120px] md:max-w-none">{cat.name}</span>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full ${activeCategory === cat.category_id ? 'bg-indigo-500 text-white' : 'bg-slate-200 md:bg-slate-200 text-slate-600 group-hover:bg-slate-300'}`}>
                    {itemCount}
                  </span>
                  {/* ⚡ NEW: Delete Category Button */}
                  <div 
                    onClick={(e) => handleDeleteCategory(e, cat.category_id, cat.name)}
                    className={`p-1.5 md:p-2 rounded-lg transition-colors ${activeCategory === cat.category_id ? 'hover:bg-indigo-500 text-white' : 'hover:bg-red-100 text-slate-400 hover:text-red-600'} hidden group-hover:flex items-center justify-center`}
                    title="Delete Category"
                  >
                    <Trash2 size={14} />
                  </div>
                </div>
              </button>
            )
          })}

          {/* ⚡ MOBILE FIX: Compact inline Add Category form for horizontal scrolling */}
          <div className="shrink-0 snap-center md:mt-2 md:border-t md:border-slate-100 md:pt-3 flex items-center">
            {!isAddingCategory ? (
              <button 
                onClick={() => setIsAddingCategory(true)}
                className="flex items-center justify-center gap-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 md:py-3 rounded-full md:rounded-xl transition-colors md:w-full"
              >
                <Plus size={18} /> <span className="hidden md:inline">New Category</span>
              </button>
            ) : (
              <form onSubmit={handleAddCategory} className="flex items-center gap-1 md:gap-2 animate-in fade-in slide-in-from-right-2 md:flex-col md:items-stretch">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Category Name" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-32 md:w-full bg-white md:bg-slate-50 border border-slate-200 rounded-full md:rounded-lg px-3 py-1.5 md:py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex gap-1 md:gap-2">
                  <button type="submit" disabled={!newCategoryName.trim()} className="p-1.5 md:flex-1 md:py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-full md:rounded-lg disabled:opacity-50 shrink-0"><Check size={16} className="md:mx-auto"/></button>
                  <button type="button" onClick={() => setIsAddingCategory(false)} className="p-1.5 md:flex-1 md:py-2 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-full md:rounded-lg shrink-0"><X size={16} className="md:mx-auto"/></button>
                </div>
              </form>
            )}
          </div>
        </div>
      </aside>

      {/* --- RIGHT COLUMN: MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
        
        {/* Top Header & Search */}
        <header className="bg-white p-3 md:p-6 border-b border-slate-200 flex items-center gap-4 z-10 shrink-0">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base md:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
            />
          </div>
          
          {/* Desktop Button - Hidden on mobile */}
          <button 
            onClick={() => openDrawer()}
            className="hidden md:flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 shrink-0"
          >
            <Plus size={18} /> Add Item
          </button>
        </header>

        {/* Item Grid */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 pb-24 custom-scrollbar">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="bg-white rounded-2xl h-[280px] border border-slate-100 shadow-sm"></div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4 px-4">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <AlertCircle size={32} className="md:w-10 md:h-10" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">No items found</h3>
                <p className="text-sm md:text-base text-slate-500 font-medium mt-1 md:mt-2">No menu items match your current filters. Try selecting a different category or clearing your search.</p>
              </div>
              {searchQuery && (
                <button onClick={() => {setSearchQuery(''); setActiveCategory('all');}} className="text-indigo-600 font-bold hover:underline bg-indigo-50 px-4 py-2 rounded-xl">
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-6 auto-rows-max">
              {filteredItems.map(item => (
                <div key={item.item_id} className="bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                  
                  {/* Card Image */}
                  <div className="relative h-40 md:h-48 bg-slate-100 overflow-hidden shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${!item.is_available && 'grayscale opacity-70'}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon size={40} />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    {!item.is_available && (
                      <div className="absolute top-3 left-3 bg-red-600/90 backdrop-blur-sm text-white text-[10px] md:text-xs font-black uppercase tracking-wider px-2.5 py-1 md:py-1.5 rounded-lg shadow-sm">
                        86'd (Sold Out)
                      </div>
                    )}

                    {/* ⚡ NEW: Action Buttons Container */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                      {/* Quick Edit Button */}
                      <button 
                        onClick={() => openDrawer(item)}
                        className="p-2 md:p-2.5 bg-white/90 backdrop-blur-sm text-slate-700 hover:text-indigo-600 rounded-xl shadow-sm active:scale-95"
                        aria-label="Edit Item"
                      >
                        <Edit2 size={16} />
                      </button>
                      
                      {/* Quick Delete Button */}
                      <button 
                        onClick={(e) => handleDeleteItem(e, item.item_id, item.name)}
                        className="p-2 md:p-2.5 bg-white/90 backdrop-blur-sm text-slate-700 hover:text-red-600 rounded-xl shadow-sm active:scale-95"
                        aria-label="Delete Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 md:p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-2 mb-1.5 md:mb-2">
                      <h3 className={`font-black text-base md:text-lg leading-tight tracking-tight ${!item.is_available ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                        {item.name}
                      </h3>
                      <span className="font-black text-indigo-600 whitespace-nowrap text-sm md:text-base">
                        {item.price.toLocaleString('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 })}
                      </span>
                    </div>
                    <p className="text-slate-500 font-medium text-xs md:text-sm line-clamp-2 mb-3 md:mb-4 flex-1">
                      {item.description || <span className="italic opacity-50">No description provided.</span>}
                    </p>
                    
                    {/* Interactive Footer (Availability Toggle) */}
                    <div className="pt-3 md:pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                      <span className="text-xs md:text-sm font-bold text-slate-600">Active on POS</span>
                      
                      {/* Custom Toggle Switch */}
                      <button 
                        onClick={() => handleToggleAvailability(item.item_id, item.is_available)}
                        className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          item.is_available ? 'bg-indigo-600' : 'bg-slate-300'
                        }`}
                        role="switch"
                        aria-checked={item.is_available}
                      >
                        <span className="sr-only">Toggle availability</span>
                        <span className={`inline-block h-3.5 w-3.5 md:h-4 md:w-4 transform rounded-full bg-white transition-transform ${
                          item.is_available ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ⚡ MOBILE FIX: Floating Action Button (FAB) strictly for mobile */}
      <button 
        onClick={() => openDrawer()}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl shadow-slate-900/30 z-30 active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </button>

      {/* --- SLIDE-OUT DRAWER (Add/Edit Item) --- */}
      {/* Backdrop */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
      
      {/* Drawer Panel */}
      <div className={`fixed top-0 right-0 h-[100dvh] w-full sm:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${
        isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 bg-slate-50 shrink-0 mt-safe">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {editingItem ? 'Edit Item' : 'New Menu Item'}
          </h2>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full md:rounded-xl transition-colors bg-white shadow-sm border border-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Form Content */}
        {isDrawerOpen && (
          <ItemForm 
            item={editingItem} 
            categories={categories} 
            onSave={handleSaveItem} 
            onCancel={() => setIsDrawerOpen(false)} 
          />
        )}
      </div>

    </div>
  );
}

// --- SUB-COMPONENT: ITEM FORM ---
function ItemForm({ item, categories, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    price: item?.price || '',
    category_id: item?.category_id || categories[0]?.category_id || '',
    description: item?.description || '',
    is_available: item !== null ? item.is_available : true
  });

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(item?.image_url || '');

  const handleImageChange = (e) =>{
    const file = e.target.files[0];
    if (file) {
        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, price: parseFloat(formData.price) },imageFile);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 md:space-y-6 custom-scrollbar pb-10">
        
        {/* ---  Image Upload Zone --- */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Item Image</label>
          <div className="relative group rounded-3xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 transition-colors overflow-hidden flex items-center justify-center h-40 md:h-48 cursor-pointer">
            
            <input 
              type="file" 
              accept="image/jpeg, image/png, image/webp"
              onChange={handleImageChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="Click to upload an image"
            />
            
            {previewUrl ? (
              <div className="relative w-full h-full">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-bold flex items-center gap-2">
                    <UploadCloud size={20} /> Change Image
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center p-4">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 md:mb-3 shadow-sm group-hover:scale-110 transition-transform">
                  <UploadCloud size={24} className="md:w-7 md:h-7" />
                </div>
                <p className="text-sm font-bold text-slate-700">Tap to upload image</p>
                <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1">PNG, JPG, WEBP (Max 5MB)</p>
              </div>
            )}
          </div>
        </div>

        {/* Name Input */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Item Name</label>
          {/* ⚡ MOBILE FIX: text-base prevents iOS auto-zoom on focus */}
          <input 
            required
            type="text" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g. Garlic Parmesan Wings"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
          />
        </div>

        {/* Price & Category Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-bold text-slate-700">Price (KSh)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">KSh</span>
              <input 
                required
                type="number" 
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-base md:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-2 flex-1">
            <label className="text-sm font-bold text-slate-700">Category</label>
            <select 
              required
              value={formData.category_id}
              onChange={(e) => setFormData({...formData, category_id: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner appearance-none"
            >
              <option value="" disabled>Select Category...</option>
              {categories.map(c => (
                <option key={c.category_id} value={c.category_id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex justify-between items-center">
            Description
            <span className="text-[10px] md:text-xs text-slate-400 font-medium">Displayed on digital menu</span>
          </label>
          <textarea 
            rows="3"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Describe the ingredients, preparation, and flavor profile..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none shadow-inner"
          />
        </div>

        {/* Initial Availability */}
        {!item && (
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Make active immediately?</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Customers can order this as soon as it's saved.</p>
            </div>
            <button 
              type="button"
              onClick={() => setFormData({...formData, is_available: !formData.is_available})}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                formData.is_available ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.is_available ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        )}
      </div>

      {/* Drawer Footer Actions */}
      <div className="p-4 md:p-6 border-t border-slate-100 bg-white flex gap-3 shrink-0 pb-safe">
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3.5 text-sm md:text-base text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="flex-1 px-4 py-3.5 text-sm md:text-base text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Check size={18} />
          {item ? 'Save Changes' : 'Publish Item'}
        </button>
      </div>
    </form>
  );
}