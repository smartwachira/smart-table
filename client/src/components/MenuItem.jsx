// This component handles one single dish. Doesn't care about fetching data; it just displays what it's given
import { useCart } from  '../context/CartContext';

import { Plus, Ban } from 'lucide-react';

const MenuItem = ({item}) => {
    const {addToCart} = useCart();
    const{ name, description,price,image_url,is_available} =item;
    return (
        <div className="group relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full transition-all hover:shadow-md">

            {/* 2. Image Area (Fixed Aspect Ratio) */}
            <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 relative">
                <img 
                    src={image_url || "https://placehold.co/400*300?text=No+Image"} 
                    alt="name" 
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 
                        ${!is_available? "grayscale opacity-60": ''}`}
                    loading='lazy'

                />

                {/* Sold Out Overlay */}
                {!is_available &&(
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                        <span className="text-white font-bold text-sm tracking-wider">
                            <Ban size={12}/> SOLD OUT</span>
                    </div>
                )}
            </div>

            {/* Content Area */}

            <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 line-clamp-1 text-lg" title={name}>
                        {name}
                    </h3>
                    <span className="font-bold text-brand-primaryr">
                        {price.toLocaleString()} KES
                    </span>
                </div>

                <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-grow">
                    {description}
                </p>

                <button 
                    onClick={() => addToCart(item)}
                    disabled={!is_available}
                    className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all font-medium active:scale-95
                        ${is_available 
                        ? 'bg-surface-muted text-brand-secondary hover:bg-brand-primary hover:text-white' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    <Plus size={18} />
                    {is_available ? 'Add to Order' : 'Unavailable'}
                </button>
            </div>


        </div>
    );

};

export default MenuItem;