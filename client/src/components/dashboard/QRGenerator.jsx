import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'sonner';
import axios from 'axios';
import html2canvas from 'html2canvas'; // ⚡ NEW: Added for beautiful card snapshots
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

    // ⚡ NEW: Download the entire styled card
    const downloadFullCard = async (tableName) => {
        const cardElement = document.getElementById(`card-${tableName}`);
        if (!cardElement) return;

        // Temporarily hide the action buttons so they don't appear in the screenshot
        const actionOverlays = cardElement.querySelectorAll('.action-overlay');
        const originalStyles = [];
        actionOverlays.forEach(el => {
            originalStyles.push(el.style.display);
            el.style.display = 'none';
        });

        try {
            const canvas = await html2canvas(cardElement, {
                scale: 3, // Very high resolution for crisp printing
                backgroundColor: '#ffffff',
                useCORS: true // Ensures the logo loads correctly from the backend
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
            // Restore the buttons immediately after capture
            actionOverlays.forEach((el, i) => {
                el.style.display = originalStyles[i];
            });
        }
    };

    // ⚡ NEW: Download individual QR codes isolated
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
                        
                        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${hasWifiConfig ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                            <Wifi className={hasWifiConfig ? 'text-emerald-500' : 'text-slate-400'} size={20} />
                            <div>
                                <p className={`text-sm font-bold ${hasWifiConfig ? 'text-emerald-900' : 'text-slate-700'}`}>
                                    {hasWifiConfig ? 'WiFi Auto-Connect Active' : 'WiFi Not Configured'}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    {hasWifiConfig ? `Network: ${venueSettings.wifi_ssid}` : 'Add WiFi in Settings to generate Dual-QRs.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 border-t border-slate-200 bg-slate-50 shrink-0 space-y-3 pb-safe">
                    <button onClick={handlePrint} disabled={tables.length === 0} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95">
                        <Printer size={20} /> Print Codes
                    </button>
                </div>
            </aside>

            <main className={`flex-1 overflow-y-auto p-4 pt-[88px] md:pt-6 md:p-8 print:p-0 print:pt-0 print:m-0 print:w-[210mm] print:overflow-visible print:bg-white bg-slate-50/50 custom-scrollbar ${isControlsOpen ? 'hidden md:block' : 'block'}`}>
                
                {tables.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 print:hidden px-4 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4"><QrCode size={40} className="text-slate-300" /></div>
                        <h3 className="text-xl font-black text-slate-800">Blank Canvas</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-2 gap-4 md:gap-6 print:gap-8 pb-10">
                        {tables.map((table) => {
                            const qrPayload = `${BASE_QR_URL}/${venueId}/${encodeURIComponent(table)}?m=${orderingMode === 'TAB' ? 't' : 'k'}`;

                            return (
                                <div key={table} id={`card-${table}`} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm print:shadow-none print:border-2 print:border-slate-300 overflow-hidden flex flex-col items-center p-6 md:p-8 transition-all hover:shadow-md page-break-inside-avoid relative group">
                                    
                                    <h3 className="text-xl md:text-3xl font-black text-slate-900 mb-6 uppercase tracking-widest text-center">
                                        {table}
                                    </h3>

                                    <div className="flex flex-col items-center w-full gap-8 relative z-0">
                                        
                                        {hasWifiConfig && (
                                            <div className="flex flex-col items-center w-full pb-8 border-b-2 border-dashed border-slate-200">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">1</span>
                                                    <span className="font-bold text-slate-500 uppercase tracking-widest text-sm">Need WiFi?</span>
                                                </div>
                                                <div className="p-3 bg-white border-2 border-slate-100 rounded-2xl">
                                                    <QRCodeCanvas
                                                        id={`qr-wifi-${table}`} // ⚡ ID for isolated download
                                                        value={getWifiPayload()}
                                                        size={120}
                                                        bgColor={"#ffffff"}
                                                        fgColor={"#0f172a"}
                                                        level={"L"} 
                                                    />
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 mt-3">Scan to Auto-Connect</p>
                                            </div>
                                        )}

                                        <div className="flex flex-col items-center w-full">
                                            {hasWifiConfig && (
                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">2</span>
                                                    <span className="font-black text-indigo-600 uppercase tracking-widest text-sm">Order Food</span>
                                                </div>
                                            )}
                                            <div className="p-4 bg-white rounded-[2rem] shadow-inner border border-slate-100 print:shadow-none print:border-none flex justify-center w-full aspect-square">
                                                <QRCodeCanvas
                                                    id={`qr-menu-${table}`} // ⚡ ID for isolated download
                                                    value={qrPayload}
                                                    size={hasWifiConfig ? 220 : 280} 
                                                    style={{ width: '100%', height: '100%', maxWidth: hasWifiConfig ? '220px' : '280px', maxHeight: hasWifiConfig ? '220px' : '280px' }}
                                                    bgColor={"#ffffff"}
                                                    fgColor={qrColor}
                                                    level={"H"}
                                                    imageSettings={includeLogo && venueSettings?.logo_url ? {
                                                        src: getFormattedLogoUrl(), 
                                                        height: hasWifiConfig ? 40 : 56,
                                                        width: hasWifiConfig ? 40 : 56,
                                                        excavate: true,
                                                        crossOrigin: "anonymous"
                                                    } : undefined}
                                                />
                                            </div>
                                            {!hasWifiConfig && (
                                                <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mt-6">
                                                    Scan to Order
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* ⚡ DESKTOP ACTION OVERLAY (Uses html2canvas + isolated downloads) */}
                                    <div className="hidden md:flex absolute inset-0 bg-slate-900/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex-col items-center justify-center gap-3 transition-opacity print:hidden focus-within:opacity-100 rounded-[2rem] z-10 action-overlay">
                                        <button onClick={() => downloadFullCard(table)} className="w-48 py-3 bg-white text-slate-900 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl font-black flex items-center justify-center gap-2 transition-colors">
                                            <Download size={18} /> Save Full Card
                                        </button>
                                        <div className="flex gap-2 w-48">
                                            {hasWifiConfig && (
                                                <button onClick={() => downloadSingleQR(table, 'WIFI')} className="flex-1 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-colors">
                                                    <Wifi size={14} /> WiFi QR
                                                </button>
                                            )}
                                            <button onClick={() => downloadSingleQR(table, 'MENU')} className="flex-1 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-colors">
                                                <UtensilsCrossed size={14} /> Menu QR
                                            </button>
                                        </div>
                                        <button onClick={() => removeTable(table)} className="w-48 py-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors mt-2">
                                            <Trash2 size={16} /> Delete Table
                                        </button>
                                    </div>

                                    {/* ⚡ MOBILE ACTION OVERLAY */}
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