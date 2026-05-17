import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

// 🛡️ Exported Interfaces
export interface MenuCategory {
    category_id: string;
    name: string;
    venue_id?: string;
}

export interface MenuItem {
    item_id: string;
    name: string;
    price: number | string;
    description?: string;
    image_url?: string;
    is_available: boolean;
    category_id: string;
}

export interface ItemFormData {
    name: string;
    price: string | number;
    category_id: string;
    description: string;
    is_available: boolean;
}

// ⚡ HELPER: Moved here to centralize all menu-related data processing
export const getImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path; 
    const sanitizedPath = path.replace(/\\/g, '/');
    const cleanPath = sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`;
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${cleanPath}`;
};

// --- AUTH HELPERS ---
const getToken = () => localStorage.getItem('auth_token');
const getConfig = (venueId?: string) => ({
    headers: { Authorization: `Bearer ${getToken()}` },
    venueId
});

// ============================================================================
// ⚡ 1. FETCH HOOKS (GET)
// ============================================================================

export const useMenuCategories = (venueId?: string) => {
    return useQuery({
        queryKey: ['categories', venueId],
        queryFn: async () => {
            const res = await axios.get<MenuCategory[]>('/api/menu/categories', getConfig(venueId));
            return res.data;
        },
        enabled: !!venueId
    });
};

export const useMenuItems = (venueId?: string) => {
    return useQuery({
        queryKey: ['menuItems', venueId],
        queryFn: async () => {
            const res = await axios.get<MenuItem[]>('/api/menu/items', getConfig(venueId));
            return res.data;
        },
        enabled: !!venueId
    });
};

// ============================================================================
// ⚡ 2. ITEM MUTATION HOOKS
// ============================================================================

export const useToggleItemAvailability = (venueId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ itemId, is_available }: { itemId: string, is_available: boolean }) => {
            await axios.patch(`/api/menu/items/${itemId}`, { is_available }, getConfig(venueId));
        },
        onSuccess: (_, variables) => {
            toast.success(`Item marked as ${variables.is_available ? 'Available' : 'Sold Out'}`);
            queryClient.invalidateQueries({ queryKey: ['menuItems', venueId] });
        },
        onError: () => toast.error('Failed to update availability.')
    });
};

export const useSaveMenuItem = (venueId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ formData, imageFile, editingItemId }: { formData: ItemFormData, imageFile: File | null, editingItemId?: string }) => {
            const payload = new FormData();
            payload.append('name', formData.name);
            payload.append('price', String(formData.price));
            payload.append('category_id', formData.category_id);
            payload.append('description', formData.description);
            payload.append('is_available', String(formData.is_available));
            if (imageFile) payload.append('image', imageFile);

            const uploadConfig = { 
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${getToken()}` },
                venueId
            };

            if (editingItemId) {
                return axios.patch<MenuItem>(`/api/menu/items/${editingItemId}`, payload, uploadConfig);
            } else {
                return axios.post<MenuItem>('/api/menu/items', payload, uploadConfig);
            }
        },
        onSuccess: (_, variables) => {
            toast.success(variables.editingItemId ? 'Menu item updated.' : 'New menu item added.');
            queryClient.invalidateQueries({ queryKey: ['menuItems', venueId] });
        },
        onError: () => toast.error('Failed to save menu item.')
    });
};

export const useDeleteItem = (venueId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (itemId: string) => axios.delete(`/api/menu/items/${itemId}`, getConfig(venueId)),
        onSuccess: () => {
            toast.success('Item deleted permanently.');
            queryClient.invalidateQueries({ queryKey: ['menuItems', venueId] });
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || 'Failed to delete item.', { duration: 5000 });
        }
    });
};

// ============================================================================
// ⚡ 3. CATEGORY MUTATION HOOKS
// ============================================================================

export const useAddCategory = (venueId?: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (name: string) => axios.post<MenuCategory>('/api/menu/categories', { name }, getConfig(venueId)),
        onSuccess: () => {
            toast.success('Category created.');
            queryClient.invalidateQueries({ queryKey: ['categories', venueId] });
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || 'Failed to create category.');
        }
    });
};

export const useDeleteCategory = (venueId?: string, onCategoryDeleted?: () => void) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (categoryId: string) => axios.delete(`/api/menu/categories/${categoryId}`, getConfig(venueId)),
        onSuccess: () => {
            toast.success('Category deleted.');
            if (onCategoryDeleted) onCategoryDeleted(); // Callback to reset UI state if needed
            queryClient.invalidateQueries({ queryKey: ['categories', venueId] });
        },
        onError: (error: AxiosError<{ message: string }>) => {
            toast.error(error.response?.data?.message || 'Failed to delete category.');
        }
    });
};