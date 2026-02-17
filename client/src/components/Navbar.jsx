import { Link } from "react-router-dom";
import { ShoppingBag, UtensilsCrossed } from "lucide-react";

const Navbar = ()=>{
    return (
        <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Brand Logo */}
                    <Link to='/' className="flex items-center gap-2">
                        <div className="p-2 bg-brand-primary/10 rounded-lg">
                            <UtensilsCrossed className="w-6 h-6 text-brand-primary"/>
                        </div>
                        <span className="font-bold text-xl tracking-tight text-gray-900">SmartTable</span>
                        
                    </Link>

                    {/*Actions */}
                    <div className="flex items-center gap-4">
                        <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ShoppingBag className="w-6 h-6 text-gray-600"></ShoppingBag>
                            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-brand-accent rounded-full">
                                0
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
        
    );
};
export default Navbar;