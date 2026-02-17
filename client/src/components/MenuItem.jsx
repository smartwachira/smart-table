// This component handles one single dish. Doesn't care about fetching data; it just displays what it's given
//import { useCart } from  '../context/CartContext';
import './Menu.css';
import { Plus } from 'lucide-react';

const MenuItem = ({item, onAddToCart}) => {
    //const {addToCart} = useCart();
    const{ name, description,price,image_url,is_available} =item;
    return (
        <div className="group relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full transition-all hover:shadow-md">

            <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 relative">
                <img 
                    src={image_url || "https://placehold.co/400*300?text=No+Image"} 
                    alt="" 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading='lazy'

                />
                {!is_available &&(
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white font-bold text-sm tracking-wider">SOLD OUT</span>
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col flex-grow">
                <div className="flexx justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1" title={name}>
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
                    onClick={()=>is_available && onAddToCart(item)}
                    disabled={!is_available}
                    className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium 
                        ${is_available
                             ? 'bg-brand-secondary text-white hover:bg-emarald-800 active:scale-95'
                             : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    
                        }`}
                >
                    <Plus size={18}/>
                </button>
            </div>


        </div>
    );

};

export default MenuItem;