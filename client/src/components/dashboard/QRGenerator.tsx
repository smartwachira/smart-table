import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'sonner';
import html2canvas from 'html2canvas'; 
import { 
    QrCode, Printer, Download, Plus, Trash2, 
    Grid3X3, ChevronDown, ChevronUp, Store, Wifi, UtensilsCrossed,
    Palette, Type, Maximize
} from 'lucide-react';
import { useQRStore } from '../../store/useQRStore'; 

// ⚡ IMPORT THE NEW CUSTOM HOOK AND TYPES
import { useVenueSettings } from '../../hooks/useVenueSettings';

interface JwtPayload { venueId: string; [key: string]: any; }

export default function QRGenerator() {
    const [venueId, setVenueId] = useState<string>('');
    
    // Local Transient UI State
    const [singleTableInput, setSingleTableInput] = useState<string>('');
    const [bulkStart, setBulkStart] = useState<string>('');
    const [bulkEnd, setBulkEnd] = useState<string>('');
    const [isControlsOpen, setIsControlsOpen] = useState<boolean>(true);

    // ⚡ ZUSTAND: Immune to Unmounting
    const { 
        tables, orderingMode, fgColor, bgColor, includeLogo, logoSize, menuCta, wifiCta,
        setTables, addTable, removeTable, clearTables, setOrderingMode, 
        setFgColor, setBgColor, setIncludeLogo, setLogoSize, setMenuCta, setWifiCta 
    } = useQRStore();

    // ============================================================================
    // ⚡ TANSTACK QUERY: Abstracted Settings Fetch
    // ============================================================================
    const { data: venueSettings } = useVenueSettings();

    // Decode token to get venueId for the QR Payload URLs
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            try {
                const decoded = jwtDecode<JwtPayload>(token);
                setVenueId(decoded.venueId);
            } catch (err) {
                console.error("Token decode error", err);
            }
        }
    }, []);

    const BASE_QR_URL = window.location.origin + '/q';

    const getFormattedLogoUrl = (): string | undefined => {
        if (!venueSettings?.logo_url) return undefined;
        const logo = venueSettings.logo_url;
        if (logo.startsWith('http')) return logo;
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        return `${backendUrl}${logo.startsWith('/') ? '' : '/'}${logo}`;
    };

    const getWifiPayload = (): string | null => {
        if (!venueSettings?.wifi_ssid) return null;
        const authType = venueSettings.wifi_password ? 'WPA' : 'nopass';
        return `WIFI:S:${venueSettings.wifi_ssid};T:${authType};P:${venueSettings.wifi_password || ''};;`;
    };

    const hasWifiConfig = !!getWifiPayload();

    // ============================================================================
    // HANDLERS
    // ============================================================================
    const handleAddSingle = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanTable = singleTableInput.trim();
        if (!cleanTable) return;
        if (tables.includes(cleanTable)) return toast.error("Table already exists.");
        addTable(cleanTable);
        setSingleTableInput('');
    };

    const handleBulkGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        const start = parseInt(bulkStart);
        const end = parseInt(bulkEnd);
        if (isNaN(start) || isNaN(end) || start >= end || end - start > 100) {
            return toast.error("Invalid range. Maximum 100 tables at a time.");
        }
        const newTables: string[] = [];
        for (let i = start; i <= end; i++) {
            const tableName = `Table ${i}`;
            if (!tables.includes(tableName)) newTables.push(tableName);
        }
        setTables([...tables, ...newTables]);
        setBulkStart('');
        setBulkEnd('');
        if (window.innerWidth < 768) setIsControlsOpen(false); 
    };

    const handlePrint = () => window.print();

    // ============================================================================
    // EXPORT LOGIC
    // ============================================================================
    const downloadFullCard = async (tableName: string) => {
        const cardElement = document.getElementById(`card-${tableName}`) as HTMLElement | null;
        if (!cardElement) return;

        const actionOverlays = cardElement.querySelectorAll<HTMLElement>('.action-overlay');
        const originalStyles: string[] = [];
        actionOverlays.forEach(el => {
            originalStyles.push(el.style.display);
            el.style.display = 'none';
        });

        cardElement.style.padding = '32px'; 
        cardElement.style.borderRadius = '32px';

        try {
            const canvas = await html2canvas(cardElement, {
                scale: 3, 
                backgroundColor: bgColor, // Use the custom background color
                useCORS: true
            });
            const pngUrl = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            downloadLink.download = `SmartTable_${tableName.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            toast.success("Full card downloaded!");
        } catch (err) {
            toast.error("Failed to download image.");
        } finally {
            cardElement.style.padding = '';
            cardElement.style.borderRadius = '';
            actionOverlays.forEach((el, i) => { el.style.display = originalStyles[i]; });
        }
    };

    const downloadSingleQR = (tableName: string, type: 'WIFI' | 'MENU') => {
        const canvasId = type === 'WIFI' ? `qr-wifi-${tableName}` : `qr-menu-${tableName}`;
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
        if (!canvas) return;
        
        const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${type}_QR_${tableName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        toast.success(`${type === 'WIFI' ? 'WiFi' : 'Menu'} QR downloaded!`);
    };

    return (
        <div className="flex flex-col md:flex-row h-[100dvh] md:h-full md:min-h-[85vh] bg-slate-100 relative overflow-hidden">
            
            {/* ============================================================================
                LEFT SIDEBAR: CONTROLS & SETTINGS
            ============================================================================ */}
            <aside className={`w-full md:w-[360px] lg:w-[400px] bg-white border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0 flex flex-col z-20 print:hidden transition-all duration-300 ${isControlsOpen ? 'max-h-screen' : 'max-h-[72px] md:max-h-screen'} overflow-hidden absolute md:static top-0 left-0 shadow-2xl md:shadow-none`}>
                <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white cursor-pointer md:cursor-default sticky top-0 z-10 shrink-0" onClick={() => setIsControlsOpen(!isControlsOpen)}>
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                            <QrCode className="text-indigo-600" size={24} /> Print Studio
                        </h2>
                    </div>
                    <button className="md:hidden p-2 bg-slate-50 rounded-lg text-slate-500">
                        {isControlsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>

                <div className="p-4 md:p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
                    
                    {/* SECTION 1: ROUTING */}
                    <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Store size={14} className="text-indigo-500"/> Digital Routing
                        </label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => setOrderingMode('TAB')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${orderingMode === 'TAB' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Open Tab (Table)</button>
                            <button onClick={() => setOrderingMode('KIOSK')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${orderingMode === 'KIOSK' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Kiosk (Takeaway)</button>
                        </div>
                    </div>

                    {/* SECTION 2: GENERATION */}
                    <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Grid3X3 size={14} className="text-indigo-500"/> Table Generation
                            </label>
                            {tables.length > 0 && (
                                <button onClick={clearTables} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md hover:bg-red-100">Clear All</button>
                            )}
                        </div>
                        
                        <form onSubmit={handleAddSingle} className="flex gap-2">
                            <input type="text" value={singleTableInput} onChange={(e) => setSingleTableInput(e.target.value)} placeholder="Single table (e.g. VIP-2)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                            <button type="submit" disabled={!singleTableInput.trim()} className="px-3 bg-slate-900 text-white disabled:bg-slate-200 disabled:text-slate-400 font-bold rounded-xl active:scale-95"><Plus size={18}/></button>
                        </form>

                        <form onSubmit={handleBulkGenerate} className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                <input type="number" min="1" placeholder="Start #" value={bulkStart} onChange={(e)=>setBulkStart(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-center" />
                                <span className="text-slate-400 font-bold text-xs">TO</span>
                                <input type="number" min="2" placeholder="End #" value={bulkEnd} onChange={(e)=>setBulkEnd(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-center" />
                            </div>
                            <button type="submit" disabled={!bulkStart || !bulkEnd} className="w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:bg-slate-50 disabled:text-slate-300 font-bold rounded-xl transition-all active:scale-95 text-xs">
                                Bulk Generate Range
                            </button>
                        </form>
                    </div>

                    {/* SECTION 3: AESTHETICS */}
                    <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Palette size={14} className="text-indigo-500"/> Aesthetic Design
                        </label>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-500">QR / Text Color</span>
                                <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1 bg-slate-50">
                                    <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0" />
                                    <input type="text" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-full bg-transparent text-xs font-mono font-bold text-slate-700 outline-none uppercase" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-500">Card Background</span>
                                <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1 bg-slate-50">
                                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0" />
                                    <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-full bg-transparent text-xs font-mono font-bold text-slate-700 outline-none uppercase" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700">Embed Venue Logo</span>
                                <button type="button" disabled={!venueSettings?.logo_url} onClick={() => setIncludeLogo(!includeLogo)} className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${includeLogo && venueSettings?.logo_url ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                    <span className={`inline-block h-3 w-3 mt-1 transform rounded-full bg-white transition-transform ${includeLogo && venueSettings?.logo_url ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            {includeLogo && venueSettings?.logo_url && (
                                <div className="space-y-1.5 animate-in fade-in">
                                    <span className="text-[10px] font-bold text-slate-500 flex items-center justify-between">
                                        Logo Scale <Maximize size={10} />
                                    </span>
                                    <input 
                                        type="range" min="32" max="96" 
                                        value={logoSize} onChange={(e) => setLogoSize(Number(e.target.value))} 
                                        className="w-full accent-indigo-600" 
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECTION 4: TYPOGRAPHY */}
                    <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm pb-10 md:pb-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Type size={14} className="text-indigo-500"/> Typography
                        </label>
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500">Menu Call-To-Action</span>
                            <input type="text" value={menuCta} onChange={(e) => setMenuCta(e.target.value)} placeholder="e.g. Scan to View Menu" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                        </div>
                        {hasWifiConfig && (
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-500">WiFi Call-To-Action</span>
                                <input type="text" value={wifiCta} onChange={(e) => setWifiCta(e.target.value)} placeholder="e.g. Scan to Connect" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 md:p-6 border-t border-slate-200 bg-white shrink-0 pb-safe z-20">
                    <button onClick={handlePrint} disabled={tables.length === 0} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                        <Printer size={20} /> Print {tables.length} Cards
                    </button>
                </div>
            </aside>

            {/* ============================================================================
                RIGHT PANEL: PREVIEW & PRINT LAYOUT
            ============================================================================ */}
            <main className={`flex-1 overflow-y-auto p-4 pt-[88px] md:pt-6 md:p-8 print:p-8 print:m-0 print:w-full print:bg-white bg-slate-100 custom-scrollbar ${isControlsOpen ? 'hidden md:block' : 'block'}`}>
                
                {tables.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 print:hidden px-4 text-center">
                        <div className="w-20 h-20 bg-white shadow-sm border border-slate-200 rounded-full flex items-center justify-center mb-4"><QrCode size={32} className="text-slate-300" /></div>
                        <h3 className="text-xl font-black text-slate-800">Blank Canvas</h3>
                        <p className="text-sm font-medium mt-1">Use the Print Studio to generate table cards.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-2 gap-4 md:gap-6 print:gap-12 pb-10">
                        {tables.map((table) => {
                            const qrPayload = `${BASE_QR_URL}/${venueId}/${encodeURIComponent(table)}?m=${orderingMode === 'TAB' ? 't' : 'k'}`;

                            return (
                                <div key={table} id={`card-${table}`} style={{ backgroundColor: bgColor }} className="rounded-[2.5rem] border border-slate-200 shadow-sm print:shadow-none print:border-[3px] print:border-slate-800 overflow-hidden flex flex-col items-center p-6 md:p-10 transition-all hover:shadow-md page-break-inside-avoid relative group print:break-inside-avoid print:color-adjust-exact">
                                    
                                    {venueSettings?.name && (
                                        <p style={{ color: fgColor }} className="text-sm font-black uppercase tracking-widest text-center mb-2 opacity-60">
                                            {venueSettings.name}
                                        </p>
                                    )}

                                    <h3 style={{ color: fgColor }} className="text-3xl md:text-4xl font-black mb-8 uppercase tracking-widest text-center">
                                        {table}
                                    </h3>

                                    <div className="flex flex-col items-center w-full gap-10 relative z-0">
                                        
                                        {hasWifiConfig && (
                                            <div className="flex flex-col items-center w-full pb-10 border-b-[3px] border-dashed border-slate-200/50 print:border-slate-400">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span style={{ backgroundColor: fgColor, color: bgColor }} className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black">1</span>
                                                    <span style={{ color: fgColor }} className="font-black uppercase tracking-[0.2em] text-sm opacity-90">{wifiCta}</span>
                                                </div>
                                                <div style={{ borderColor: fgColor }} className="p-4 bg-white border-2 rounded-3xl print:border-none print:p-0 bg-transparent mix-blend-multiply">
                                                    <QRCodeCanvas
                                                        id={`qr-wifi-${table}`} 
                                                        value={getWifiPayload() || ''}
                                                        size={140}
                                                        bgColor={bgColor}
                                                        fgColor={fgColor} 
                                                        level={"Q"} 
                                                        imageSettings={includeLogo && venueSettings?.logo_url ? { 
                                                            src: getFormattedLogoUrl() || '', 
                                                            height: logoSize * 0.5, 
                                                            width: logoSize * 0.5,
                                                            excavate: true,
                                                            crossOrigin: "anonymous"
                                                        } : undefined}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col items-center w-full">
                                            {hasWifiConfig && (
                                                <div className="flex items-center gap-3 mb-5">
                                                    <span style={{ backgroundColor: fgColor, color: bgColor }} className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black">2</span>
                                                    <span style={{ color: fgColor }} className="font-black uppercase tracking-[0.2em] text-sm opacity-90">{menuCta}</span>
                                                </div>
                                            )}
                                            <div style={{ borderColor: fgColor }} className="p-5 bg-transparent border-2 rounded-[2.5rem] print:border-none print:p-0 flex justify-center w-full aspect-square mix-blend-multiply">
                                                <QRCodeCanvas
                                                    id={`qr-menu-${table}`} 
                                                    value={qrPayload}
                                                    size={hasWifiConfig ? 200 : 280} 
                                                    style={{ width: '100%', height: '100%', maxWidth: hasWifiConfig ? '200px' : '280px', maxHeight: hasWifiConfig ? '200px' : '280px' }}
                                                    bgColor={bgColor}
                                                    fgColor={fgColor}
                                                    level={"H"}
                                                    imageSettings={includeLogo && venueSettings?.logo_url ? {
                                                        src: getFormattedLogoUrl() || '', 
                                                        height: logoSize,
                                                        width: logoSize,
                                                        excavate: true,
                                                        crossOrigin: "anonymous"
                                                    } : undefined}
                                                />
                                            </div>
                                            {!hasWifiConfig && (
                                                <p style={{ color: fgColor }} className="text-center text-sm font-black uppercase tracking-[0.2em] mt-6 opacity-60">
                                                    {menuCta}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Overlays */}
                                    <div className="hidden md:flex absolute inset-0 bg-slate-900/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex-col items-center justify-center gap-3 transition-opacity print:hidden focus-within:opacity-100 rounded-[2.5rem] z-10 action-overlay">
                                        <button onClick={() => downloadFullCard(table)} className="w-56 py-3.5 bg-white text-slate-900 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl font-black flex items-center justify-center gap-2 transition-colors shadow-lg">
                                            <Download size={20} /> Save Full Card
                                        </button>
                                        <div className="flex gap-2 w-56">
                                            {hasWifiConfig && (
                                                <button onClick={() => downloadSingleQR(table, 'WIFI')} className="flex-1 py-2.5 bg-slate-800 text-white hover:bg-slate-700 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-colors">
                                                    <Wifi size={16} /> WiFi QR
                                                </button>
                                            )}
                                            <button onClick={() => downloadSingleQR(table, 'MENU')} className="flex-1 py-2.5 bg-slate-800 text-white hover:bg-slate-700 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-colors">
                                                <UtensilsCrossed size={16} /> Menu QR
                                            </button>
                                        </div>
                                        <button onClick={() => removeTable(table)} className="w-56 py-2.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors mt-2">
                                            <Trash2 size={18} /> Delete Table
                                        </button>
                                    </div>

                                    <div className="md:hidden flex flex-col w-full gap-2 mt-8 pt-6 border-t border-slate-200/50 print:hidden relative z-10 action-overlay">
                                        <button onClick={() => downloadFullCard(table)} className="w-full py-3 bg-white border border-slate-200 text-slate-900 rounded-xl text-sm font-black flex justify-center items-center gap-2 active:bg-slate-50">
                                            <Download size={16}/> Save Full Card
                                        </button>
                                        <div className="flex gap-2">
                                            {hasWifiConfig && (
                                                <button onClick={() => downloadSingleQR(table, 'WIFI')} className="flex-1 py-2.5 bg-white text-slate-600 rounded-lg text-xs font-bold flex justify-center items-center gap-2 border border-slate-200 shadow-sm">
                                                    <Wifi size={14}/> WiFi
                                                </button>
                                            )}
                                            <button onClick={() => downloadSingleQR(table, 'MENU')} className="flex-1 py-2.5 bg-white text-slate-600 rounded-lg text-xs font-bold flex justify-center items-center gap-2 border border-slate-200 shadow-sm">
                                                <UtensilsCrossed size={14}/> Menu
                                            </button>
                                            <button onClick={() => removeTable(table)} className="w-auto px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold flex justify-center items-center active:bg-red-100 border border-red-100">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}