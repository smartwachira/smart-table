import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'sonner';
import axios from 'axios';
import html2canvas from 'html2canvas'; 
import { 
    QrCode, Printer, Download, Plus, Trash2, 
    Settings2, Grid3X3, ChevronDown, ChevronUp, Image as ImageIcon, Store, Wifi, UtensilsCrossed
} from 'lucide-react';

export default function QRGenerator() {
    const [venueId, setVenueId] = useState('');
    const [tables, setTables] = useState([]);
    const [singleTableInput, setSingleTableInput] = useState('');
    
    const [venueSettings, setVenueSettings] = useState(null);
    const [orderingMode, setOrderingMode] = useState('TAB'); 

    const [bulkStart, setBulkStart] = useState('');
    const [bulkEnd, setBulkEnd] = useState('');

    const [qrColor, setQrColor] = useState('#0f172a');
    const [includeLogo, setIncludeLogo] = useState(true);

    const [isControlsOpen, setIsControlsOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setVenueId(decoded.venueId);
                setTables(['Table 1', 'Table 2', 'Table 3']);
                
                const fetchVenueDetails = async () => {
                    try {
                        const res = await axios.get('/api/settings/venue', {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setVenueSettings(res.data);
                    } catch (error) {
                        console.warn("Could not fetch venue settings.");
                    }
                };
                fetchVenueDetails();
            } catch (err) {
                console.error("Token decode error", err);
            }
        }
    }, []);

    const BASE_QR_URL = window.location.origin + '/q';

    const getFormattedLogoUrl = () => {
        if (!venueSettings?.logo_url) return undefined;
        const logo = venueSettings.logo_url;
        if (logo.startsWith('http')) return logo;
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        return `${backendUrl}${logo.startsWith('/') ? '' : '/'}${logo}`;
    };

    const getWifiPayload = () => {
        if (!venueSettings?.wifi_ssid) return null;
        const authType = venueSettings.wifi_password ? 'WPA' : 'nopass';
        return `WIFI:S:${venueSettings.wifi_ssid};T:${authType};P:${venueSettings.wifi_password || ''};;`;
    };

    const hasWifiConfig = !!getWifiPayload();

    const handleAddSingle = (e) => {
        e.preventDefault();
        if (!singleTableInput.trim()) return;
        if (tables.includes(singleTableInput.trim())) return toast.error("Table already exists.");
        setTables([...tables, singleTableInput.trim()]);
        setSingleTableInput('');
    };

    const handleBulkGenerate = (e) => {
        e.preventDefault();
        const start = parseInt(bulkStart);
        const end = parseInt(bulkEnd);
        if (isNaN(start) || isNaN(end) || start >= end || end - start > 100) {
            return toast.error("Invalid range.");
        }
        const newTables = [];
        for (let i = start; i <= end; i++) {
            const tableName = `Table ${i}`;
            if (!tables.includes(tableName)) newTables.push(tableName);
        }
        setTables([...tables, ...newTables]);
        setBulkStart('');
        setBulkEnd('');
        setIsControlsOpen(false); 
    };

    const removeTable = (tableToRemove) => setTables(tables.filter(t => t !== tableToRemove));

    const handlePrint = () => window.print();

    const downloadFullCard = async (tableName) => {
        const cardElement = document.getElementById(`card-${tableName}`);
        if (!cardElement) return;

        // Hide action buttons during snapshot
        const actionOverlays = cardElement.querySelectorAll('.action-overlay');
        const originalStyles = [];
        actionOverlays.forEach(el => {
            originalStyles.push(el.style.display);
            el.style.display = 'none';
        });

        // ⚡ FIX: Added slight padding to the capture to ensure rounded corners aren't clipped
        cardElement.style.padding = '32px'; 
        cardElement.style.borderRadius = '32px';

        try {
            const canvas = await html2canvas(cardElement, {
                scale: 3, 
                backgroundColor: '#ffffff',
                useCORS: true
            });
            const pngUrl = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            downloadLink.download = `SmartTable_Card_${tableName.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            toast.success("Full card downloaded!");
        } catch (err) {
            console.error("Failed to generate card image", err);
            toast.error("Failed to download image.");
        } finally {
            // Restore styles
            cardElement.style.padding = '';
            cardElement.style.borderRadius = '';
            actionOverlays.forEach((el, i) => {
                el.style.display = originalStyles[i];
            });
        }
    };

    const downloadSingleQR = (tableName, type) => {
        const canvasId = type === 'WIFI' ? `qr-wifi-${tableName}` : `qr-menu-${tableName}`;
        const canvas = document.getElementById(canvasId);
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
        <div className="flex flex-col md:flex-row h-[100dvh] md:h-full md:min-h-[85vh] bg-slate-50 relative overflow-hidden">
            
            <aside className={`w-full md:w-[340px] bg-white border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0 flex flex-col z-20 print:hidden transition-all duration-300 ${isControlsOpen ? 'max-h-screen overflow-y-auto' : 'max-h-[72px] md:max-h-screen'} overflow-hidden md:overflow-y-auto absolute md:static top-0 left-0 shadow-md md:shadow-none`}>
                <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white cursor-pointer md:cursor-default sticky top-0 z-10" onClick={() => setIsControlsOpen(!isControlsOpen)}>
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                            <QrCode className="text-indigo-600" size={24} /> Print Center
                        </h2>
                    </div>
                    <button className="md:hidden p-2 bg-slate-50 rounded-lg text-slate-500">
                        {isControlsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>

                <div className="p-4 md:p-6 space-y-6 md:space-y-8 flex-1 bg-white">
                    <div className="space-y-3">
                        <label className="text-xs md:text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Store size={16} className="text-indigo-500"/> Customer Flow
                        </label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => setOrderingMode('TAB')} className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${orderingMode === 'TAB' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Open Tab</button>
                            <button onClick={() => setOrderingMode('KIOSK')} className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${orderingMode === 'KIOSK' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Kiosk</button>
                        </div>
                    </div>

                    <form onSubmit={handleAddSingle} className="space-y-2 pt-4 border-t border-slate-100">
                        <label className="text-xs md:text-sm font-bold text-slate-700 flex items-center gap-2"><Plus size={16} className="text-indigo-500"/> Add Table</label>
                        <div className="flex gap-2">
                            <input type="text" value={singleTableInput} onChange={(e) => setSingleTableInput(e.target.value)} placeholder="e.g. VIP-2" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner" />
                            <button type="submit" disabled={!singleTableInput.trim()} className="px-5 bg-indigo-600 text-white disabled:bg-slate-200 font-bold rounded-xl active:scale-95">Add</button>
                        </div>
                    </form>

                    <form onSubmit={handleBulkGenerate} className="space-y-2 pt-4 border-t border-slate-100">
                        <label className="text-xs md:text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Grid3X3 size={16} className="text-indigo-500"/> Bulk Generate
                        </label>
                        <div className="flex items-center gap-2">
                            <input type="number" min="1" placeholder="Start" value={bulkStart} onChange={(e)=>setBulkStart(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner text-center" />
                            <span className="text-slate-400 font-bold text-sm">to</span>
                            <input type="number" min="2" placeholder="End" value={bulkEnd} onChange={(e)=>setBulkEnd(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner text-center" />
                        </div>
                        <button type="submit" disabled={!bulkStart || !bulkEnd} className="w-full py-3 bg-slate-900 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold rounded-xl transition-all active:scale-95 text-sm md:text-base mt-2">
                            Generate Range
                        </button>
                    </form>

                    <div className="space-y-4 pt-6 border-t border-slate-100">
                        <label className="text-xs md:text-sm font-bold text-slate-700 flex items-center gap-2"><Settings2 size={16} className="text-indigo-500"/> Appearance</label>
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                            {['#0f172a', '#4f46e5', '#ea580c', '#16a34a', '#db2777'].map(color => (
                                <button key={color} type="button" onClick={() => setQrColor(color)} className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-[3px] transition-all ${qrColor === color ? 'border-white shadow-md scale-110 ring-2 ring-slate-300' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                            ))}
                        </div>

                        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                            <div><p className="text-sm font-bold text-slate-900">Venue Logo</p></div>
                            <button type="button" disabled={!venueSettings?.logo_url} onClick={() => setIncludeLogo(!includeLogo)} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${includeLogo && venueSettings?.logo_url ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                <span className={`inline-block h-4 w-4 mt-1 transform rounded-full bg-white transition-transform ${includeLogo && venueSettings?.logo_url ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 border-t border-slate-200 bg-slate-50 shrink-0 space-y-3 pb-safe">
                    <button onClick={handlePrint} disabled={tables.length === 0} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95">
                        <Printer size={20} /> Print Cards
                    </button>
                </div>
            </aside>

            {/* ⚡ FIX 3: Strict Print Layouts. 
                Using `print:grid-cols-2` and `print:gap-12` ensures exactly two cards fit perfectly on an A4 page without clipping. */}
            <main className={`flex-1 overflow-y-auto p-4 pt-[88px] md:pt-6 md:p-8 print:p-8 print:m-0 print:w-full print:bg-white bg-slate-50/50 custom-scrollbar ${isControlsOpen ? 'hidden md:block' : 'block'}`}>
                
                {tables.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 print:hidden px-4 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4"><QrCode size={40} className="text-slate-300" /></div>
                        <h3 className="text-xl font-black text-slate-800">Blank Canvas</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-2 gap-4 md:gap-6 print:gap-12 pb-10">
                        {tables.map((table) => {
                            const qrPayload = `${BASE_QR_URL}/${venueId}/${encodeURIComponent(table)}?m=${orderingMode === 'TAB' ? 't' : 'k'}`;

                            return (
                                /* ⚡ FIX 4: Added `print:break-inside-avoid` to ensure cards never get split across two physical pages */
                                <div key={table} id={`card-${table}`} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm print:shadow-none print:border-[3px] print:border-slate-800 overflow-hidden flex flex-col items-center p-6 md:p-10 transition-all hover:shadow-md page-break-inside-avoid relative group print:break-inside-avoid print:bg-white print:color-adjust-exact">
                                    
                                    {/* Brand Header */}
                                    {venueSettings?.name && (
                                         <p className="text-sm font-black text-slate-400 uppercase tracking-widest text-center mb-2 print:text-black">
                                            {venueSettings.name}
                                         </p>
                                    )}

                                    <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-8 uppercase tracking-widest text-center print:text-black">
                                        {table}
                                    </h3>

                                    <div className="flex flex-col items-center w-full gap-10 relative z-0">
                                        
                                        {hasWifiConfig && (
                                            <div className="flex flex-col items-center w-full pb-10 border-b-[3px] border-dashed border-slate-200 print:border-slate-400">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-black print:bg-black">1</span>
                                                    <span className="font-black text-slate-600 uppercase tracking-[0.2em] text-sm print:text-black">Need WiFi?</span>
                                                </div>
                                                <div className="p-4 bg-white border-2 border-slate-100 rounded-3xl print:border-none print:p-0">
                                                    <QRCodeCanvas
                                                        id={`qr-wifi-${table}`} 
                                                        value={getWifiPayload()}
                                                        size={140}
                                                        bgColor={"#ffffff"}
                                                        fgColor={qrColor} // ⚡ FIX 1: Applied custom color to WiFi QR!
                                                        level={"M"} 
                                                        imageSettings={includeLogo && venueSettings?.logo_url ? { // ⚡ FIX 2: Applied custom logo to WiFi QR!
                                                            src: getFormattedLogoUrl(), 
                                                            height: 32,
                                                            width: 32,
                                                            excavate: true,
                                                            crossOrigin: "anonymous"
                                                        } : undefined}
                                                    />
                                                </div>
                                                <p className="text-xs font-black text-slate-400 mt-4 uppercase tracking-widest print:text-black">Scan to Auto-Connect</p>
                                            </div>
                                        )}

                                        <div className="flex flex-col items-center w-full">
                                            {hasWifiConfig && (
                                                <div className="flex items-center gap-3 mb-5">
                                                    <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-black print:bg-black print:text-white">2</span>
                                                    <span className="font-black text-indigo-600 uppercase tracking-[0.2em] text-sm print:text-black">Order Food</span>
                                                </div>
                                            )}
                                            <div className="p-5 bg-white rounded-[2.5rem] shadow-inner border border-slate-100 print:shadow-none print:border-none flex justify-center w-full aspect-square">
                                                <QRCodeCanvas
                                                    id={`qr-menu-${table}`} 
                                                    value={qrPayload}
                                                    size={hasWifiConfig ? 200 : 280} 
                                                    style={{ width: '100%', height: '100%', maxWidth: hasWifiConfig ? '200px' : '280px', maxHeight: hasWifiConfig ? '200px' : '280px' }}
                                                    bgColor={"#ffffff"}
                                                    fgColor={qrColor}
                                                    level={"H"}
                                                    imageSettings={includeLogo && venueSettings?.logo_url ? {
                                                        src: getFormattedLogoUrl(), 
                                                        height: hasWifiConfig ? 48 : 64,
                                                        width: hasWifiConfig ? 48 : 64,
                                                        excavate: true,
                                                        crossOrigin: "anonymous"
                                                    } : undefined}
                                                />
                                            </div>
                                            <p className="text-center text-sm font-black text-slate-400 uppercase tracking-[0.2em] mt-6 print:text-black">
                                                Scan to View Menu
                                            </p>
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

                                    <div className="md:hidden flex flex-col w-full gap-2 mt-8 pt-6 border-t border-slate-100 print:hidden relative z-10 action-overlay">
                                        <button onClick={() => downloadFullCard(table)} className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-black flex justify-center items-center gap-2 active:bg-indigo-100">
                                            <Download size={16}/> Save Full Card
                                        </button>
                                        <div className="flex gap-2">
                                            {hasWifiConfig && (
                                                <button onClick={() => downloadSingleQR(table, 'WIFI')} className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold flex justify-center items-center gap-2 border border-slate-200">
                                                    <Wifi size={14}/> WiFi
                                                </button>
                                            )}
                                            <button onClick={() => downloadSingleQR(table, 'MENU')} className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold flex justify-center items-center gap-2 border border-slate-200">
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