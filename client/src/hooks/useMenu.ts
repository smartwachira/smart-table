import { useQuery } from '@tanstack/react-query';
import api from '../utils/axiosConfig';

// We export the interfaces from here so any component can use them
export interface MenuCategoryType {
    category_id: string;
    name: string;
    venue_id: string;
}

export interface MenuItemType {
    item_id: string;
    name: string;
    price: string | number;
    description?: string;
    image_url?: string;
    is_available: boolean;
    category_id: string;
    MenuCategory?: MenuCategoryType;
}

export interface MenuResponse {
    categories: MenuCategoryType[];
    items: MenuItemType[];
    venue: any; 
}

// ⚡ THE CUSTOM HOOK: Centralizes the fetching and caching strategy
export const usePublicMenu = (venueId: string | null) => {
    return useQuery({
        queryKey: ['publicMenu', venueId], // The unique cache identifier
        queryFn: async () => {
            if (!venueId) throw new Error("No venue ID");
            const res = await api.get<MenuResponse>(`/api/menu/public`); 
            return res.data;
        },
        enabled: !!venueId, // Only run the query if we actually have a venueId
        staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
        retry: 1
    });
};