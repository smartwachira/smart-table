//This component handles one category

import MenuItem from "./MenuItem";

const MenuCategory = ({ category,onAddToCart }) => {

    if (!category.MenuItems || category.MenuItems.length === 0){
        return null;
    }
    return(
        <div className="mb-10 w-full animate-fadeIn">
            {/* Category Header with Item Count Badge */}
            <div className="flex items-center justify-between mb-6 border-b border-gray-200 ph-3">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {category.name}
                </h2>
                <span className="text-xs font-bold uppercase tracking-wider bg-surface-muted text-brand-secondary px-3 py-1 rounded-full">
                    {category.MenuItems.length} Items
                </span>
            </div>

            {/* Responsive Grid System (Reused from yesterday) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.MenuItems.map((item)=>(
                    <MenuItem
                        key={item.id}
                        item={item}
                        onAddToCart={onAddToCart}
                    />
                ))}
            </div>
        </div>
    );

};

export default MenuCategory;