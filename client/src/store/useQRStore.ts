import { create } from 'zustand';

interface QRState {
    tables: string[];
    orderingMode: 'TAB' | 'KIOSK';
    fgColor: string;
    bgColor: string;
    includeLogo: boolean;
    logoSize: number;
    menuCta: string;
    wifiCta: string;
    
    // Actions
    setTables: (tables: string[]) => void;
    addTable: (table: string) => void;
    removeTable: (table: string) => void;
    clearTables: () => void;
    setOrderingMode: (mode: 'TAB' | 'KIOSK') => void;
    setFgColor: (color: string) => void;
    setBgColor: (color: string) => void;
    setIncludeLogo: (include: boolean) => void;
    setLogoSize: (size: number) => void;
    setMenuCta: (cta: string) => void;
    setWifiCta: (cta: string) => void;
}

export const useQRStore = create<QRState>((set) => ({
    tables: ['Table 1', 'Table 2', 'Table 3'], // Default initial state
    orderingMode: 'TAB',
    fgColor: '#0f172a', // Slate 900
    bgColor: '#ffffff', // White
    includeLogo: true,
    logoSize: 64, // Default pixel size
    menuCta: 'Scan to View Menu',
    wifiCta: 'Scan to Auto-Connect',

    setTables: (tables) => set({ tables }),
    addTable: (table) => set((state) => ({ tables: [...state.tables, table] })),
    removeTable: (table) => set((state) => ({ tables: state.tables.filter(t => t !== table) })),
    clearTables: () => set({ tables: [] }),
    
    setOrderingMode: (mode) => set({ orderingMode: mode }),
    setFgColor: (color) => set({ fgColor: color }),
    setBgColor: (color) => set({ bgColor: color }),
    setIncludeLogo: (include) => set({ includeLogo: include }),
    setLogoSize: (size) => set({ logoSize: size }),
    setMenuCta: (cta) => set({ menuCta: cta }),
    setWifiCta: (cta) => set({ wifiCta: cta }),
}));