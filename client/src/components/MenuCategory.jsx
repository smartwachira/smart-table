//This component handles one category

import MenuItem from "./MenuItem";
import './Menu.css';

const MenuCategory = ({ category }) => {
    return(
        <div className="menu-category">
            <h2 className="category-title">{category.name}</h2>

            <div className="items-list">
                {category.MenuItems.map((item) => (
                    <MenuItem key={item.item_id} item={item}/>
                ))}
            </div>
        </div>
    );

};

export default MenuCategory;