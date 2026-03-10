import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Search, Plus, Edit2, X, Check, Image as ImageIcon, 
  MoreVertical, UtensilsCrossed, AlertCircle,UploadCloud
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

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

export default function MenuManagement() {
  // --- STATE ---
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const {user} = useAuth();

  // Drawer & Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // New Category State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // --- LIFECYCLE ---
  useEffect(() => {
    // Simulate API Fetch
    setTimeout(() => {
      setCategories(MOCK_CATEGORIES);
      setItems(MOCK_ITEMS);
      setIsLoading(false);
    }, 600);
  }, []);

  // --- HANDLERS ---
  const handleToggleAvailability = async (itemId, currentStatus) => {
    // Optimistic UI Update for instant feedback
    setItems(items.map(item => 
      item.item_id === itemId ? { ...item, is_available: !currentStatus } : item
    ));
    
    try {
      // TODO: Replace with actual Axios PATCH request
      // await axios.patch(`/api/menu/items/${itemId}/availability`, { is_available: !currentStatus });
      toast.success(`Item marked as ${!currentStatus ? 'Available' : 'Unavailable'}`);
    } catch (error) {
      // Revert on failure
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

        //1. Prepare Multipart Form Data
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
        // Update existing
        setItems(items.map(item => item.item_id === editingItem.item_id ? { ...item, ...formData } : item));
        await axios.put(`/api/menu/items/${editingItem.item_id}`, payload, config);
        toast.success('Menu item updated.');
      } else {
        // Create new
        const newItem = { ...formData, item_id: `i${Date.now()}` };
        setItems([...items, newItem]);
        await axios.post('/api/menu/items', payload, config);
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
      // TODO: Replace with actual Axios POST request
      const newCat = { category_id: `c${Date.now()}`, name: newCategoryName };
      setCategories([...categories, newCat]);
      setNewCategoryName('');
      setIsAddingCategory(false);
      toast.success('Category created.');
    } catch (error) {
      toast.error('Failed to create category.');
      console.error("Error creating menu category:", error);
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
    <div className="flex flex-col md:flex-row h-full min-h-[85vh] bg-slate-50 relative overflow-hidden">
      
      {/* --- LEFT COLUMN: CATEGORIES SIDEBAR --- */}
      <aside className="w-full md:w-64 lg:w-72 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col z-10">
        <div className="p-5 border-b border-slate-100 hidden md:block">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="text-indigo-600" size={24} />
            Menu Map
          </h2>
          <p className="text-sm text-slate-500 mt-1">Organize your offerings.</p>
        </div>

        {/* Mobile horizontal scroll / Desktop vertical list */}
        <div className="flex-1 overflow-x-auto md:overflow-y-auto p-4 md:p-3 scrollbar-hide flex md:flex-col gap-2 border-b md:border-b-0 border-slate-200">
          
          <button
            onClick={() => setActiveCategory('all')}
            className={`whitespace-nowrap md:whitespace-normal text-left px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-between group ${
              activeCategory === 'all' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>All Items</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${activeCategory === 'all' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'}`}>
              {items.length}
            </span>
          </button>

          {categories.map((cat) => {
            const itemCount = items.filter(i => i.category_id === cat.category_id).length;
            return (
              <button
                key={cat.category_id}
                onClick={() => setActiveCategory(cat.category_id)}
                className={`whitespace-nowrap md:whitespace-normal text-left px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-between group ${
                  activeCategory === cat.category_id 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="truncate pr-2">{cat.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeCategory === cat.category_id ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'}`}>
                  {itemCount}
                </span>
              </button>
            )
          })}

          {/* Add Category Trigger / Form */}
          <div className="mt-2 hidden md:block border-t border-slate-100 pt-3 px-1">
            {!isAddingCategory ? (
              <button 
                onClick={() => setIsAddingCategory(true)}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 py-3 rounded-xl transition-colors"
              >
                <Plus size={18} /> New Category
              </button>
            ) : (
              <form onSubmit={handleAddCategory} className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Category Name" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsAddingCategory(false)} className="flex-1 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button type="submit" disabled={!newCategoryName.trim()} className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">Save</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </aside>

      {/* --- RIGHT COLUMN: MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Header & Search */}
        <header className="bg-white p-4 md:p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 shrink-0">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search menu items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>
          
          <button 
            onClick={() => openDrawer()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-sm active:scale-95"
          >
            <Plus size={20} />
            Add Menu Item
          </button>
        </header>

        {/* Item Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="bg-white rounded-2xl h-72 border border-slate-100 shadow-sm"></div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <AlertCircle size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">No items found</h3>
                <p className="text-slate-500 mt-2">There are no menu items matching your current filters. Try selecting a different category or clearing your search.</p>
              </div>
              <button onClick={() => {setSearchQuery(''); setActiveCategory('all');}} className="text-indigo-600 font-semibold hover:underline">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 auto-rows-max">
              {filteredItems.map(item => (
                <div key={item.item_id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                  
                  {/* Card Image */}
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${!item.is_available && 'grayscale opacity-70'}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon size={48} />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    {!item.is_available && (
                      <div className="absolute top-3 left-3 bg-red-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                        86'd (Sold Out)
                      </div>
                    )}

                    {/* Quick Edit Overlay Button */}
                    <button 
                      onClick={() => openDrawer(item)}
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm text-slate-700 hover:text-indigo-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                      aria-label="Edit Item"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className={`font-bold text-lg leading-tight ${!item.is_available ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                        {item.name}
                      </h3>
                      <span className="font-bold text-indigo-600 whitespace-nowrap">
                        {item.price.toLocaleString('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 })}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-1">
                      {item.description}
                    </p>
                    
                    {/* Interactive Footer (Availability Toggle) */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                      <span className="text-sm font-semibold text-slate-600">Available on POS</span>
                      
                      {/* Custom Toggle Switch */}
                      <button 
                        onClick={() => handleToggleAvailability(item.item_id, item.is_available)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          item.is_available ? 'bg-indigo-600' : 'bg-slate-300'
                        }`}
                        role="switch"
                        aria-checked={item.is_available}
                      >
                        <span className="sr-only">Toggle availability</span>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          item.is_available ? 'translate-x-6' : 'translate-x-1'
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

      {/* --- SLIDE-OUT DRAWER (Add/Edit Item) --- */}
      {/* Backdrop */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
      
      {/* Drawer Panel */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
        isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
          <h2 className="text-xl font-bold text-slate-900">
            {editingItem ? 'Edit Menu Item' : 'New Menu Item'}
          </h2>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X size={24} />
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
// Extracted to keep the main component cleaner and handle local form state efficiently
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
        // Create a temporary local URL to preview the image instantly
        setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, price: parseFloat(formData.price) },imageFile);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* ---  Image Upload Zone --- */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Item Image</label>
          <div className="relative group rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 transition-colors overflow-hidden flex items-center justify-center h-48 cursor-pointer">
            
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
                  <span className="text-white font-medium flex items-center gap-2">
                    <UploadCloud size={20} /> Change Image
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <UploadCloud size={24} />
                </div>
                <p className="text-sm font-medium text-slate-700">Click or drag to upload</p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG, or WEBP (Max 5MB)</p>
              </div>
            )}
          </div>
        </div>

        {/* Name Input */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Item Name</label>
          <input 
            required
            type="text" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g. Garlic Parmesan Wings"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Price & Category Row */}
        <div className="flex gap-4">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-semibold text-slate-700">Price (KSh)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">KSh</span>
              <input 
                required
                type="number" 
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2 flex-1">
            <label className="text-sm font-semibold text-slate-700">Category</label>
            <select 
              required
              value={formData.category_id}
              onChange={(e) => setFormData({...formData, category_id: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none"
            >
              <option value="" disabled>Select Category</option>
              {categories.map(c => (
                <option key={c.category_id} value={c.category_id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex justify-between">
            Description
            <span className="text-xs text-slate-400 font-normal">Displayed on digital menu</span>
          </label>
          <textarea 
            rows="3"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Describe the ingredients, preparation, and flavor profile..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
          />
        </div>

        {/* Initial Availability */}
        {!item && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Make item available immediately?</p>
              <p className="text-xs text-slate-500">Customers can order this as soon as it's saved.</p>
            </div>
            <button 
              type="button"
              onClick={() => setFormData({...formData, is_available: !formData.is_available})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
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
      <div className="p-6 border-t border-slate-100 bg-white flex gap-3 shrink-0">
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="flex-1 px-4 py-3 text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Check size={20} />
          {item ? 'Save Changes' : 'Publish Item'}
        </button>
      </div>
    </form>
  );
}