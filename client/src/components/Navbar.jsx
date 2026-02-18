import { Link } from "react-router-dom";
import { ShoppingBag, UtensilsCrossed,Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "../context/CartContext";

const Navbar = ()=>{
    const {getCartCount} = useCart();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


    return (
        <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Brand Logo */}
                    <Link to='/' className="flex items-center gap-2">
                        <div className="p-2 bg-brand-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                            <UtensilsCrossed className="w-6 h-6 text-brand-primary"/>
                        </div>
                        <span className="font-bold text-xl tracking-tight text-gray-900">
                            SmartTable
                        </span>
                        
                    </Link>

                    {/*Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/" className="text-gray-600 hover:text-brand-primary font-medium transition-colors">
                        Menu
                        </Link>
                        <Link className="text-gray-600 hover:text-brand-primary font-medium transition-colors">
                        My Orders
                        </Link>

                        {/* Cart Button */}
                        <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors group">
                            <ShoppingBag className="w-6 h-6 text-gray-600 group-hover:text-brand-primary"/>
                            {/* Badge */}
                            {getCartCount >0 && (
                                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-brand-accent rounded-full shadow-sm">
                                {getCartCount}
                                </span>
                            )}
                        
                                
                            
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none">
                            {isMobileMenuOpen ? <X size={24}/>:<Menu size={24}/>}
                        </button>
                    </div>
                </div>
            </div>

            {isMobileMenuOpen && (
                <div className="md:hidden bg-white border-b border-gray-100 absolute w-full left-0">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link
                            to="/" 
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-brand-primary hover:bg-gray-50"
                            onClick={()=>setIsMobileMenuOpen(false)}
                        >
                            Menu
                        </Link>
                        <Link 
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-brand-primary hover:bg-gray-50"
                            to='/orders'
                            onClick={()=>setIsMobileMenuOpen(false)}
                        >
                            My Orders
                        </Link>

                    </div>
                </div>
            )}
        </nav>
        
    );
};
export default Navbar;