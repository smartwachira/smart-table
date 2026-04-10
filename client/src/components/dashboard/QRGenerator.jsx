import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'sonner';
import axios from 'axios';
import { 
    QrCode, Printer, Download, Plus, Trash2, 
    Settings2, Grid3X3, ChevronDown, ChevronUp, Image as ImageIcon, Store
} from 'lucide-react';

export default function QRGenerator() {
    const [venueId, setVenueId] = useState('');
    const [tables, setTables] = useState([]);
    const [singleTableInput, setSingleTableInput] = useState('');
    
    // Strategic State: Database Logo & Ordering Mode
    const [venueLogo, setVenueLogo] = useState(null);
    const [orderingMode, setOrderingMode] = useState('TAB'); // 'TAB' or 'KIOSK'

    // Bulk Generation State
    const [bulkStart, setBulkStart] = useState('');
    const [bulkEnd, setBulkEnd] = useState('');

    // Design State for the QR Codes
    const [qrColor, setQrColor] = useState('#0f172a'); // Slate 900
    const [includeLogo, setIncludeLogo] = useState(true);

    // Mobile UI State
    const [isControlsOpen, setIsControlsOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setVenueId(decoded.venueId);
                setTables(['Table 1', 'Table 2', 'Table 3', 'VIP-1']);
                
                const fetchVenueDetails = async () => {
                    try {
                        const res = await axios.get('/api/settings/venue', {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        
                        if (res.data && res.data.logo_url) {
                            setVenueLogo(res.data.logo_url);
                        }
                    } catch (error) {
                        console.warn("Could not fetch venue logo for QR codes.");
                    }
                };
                fetchVenueDetails();

            } catch (err) {
                console.error("Token decode error", err);
            }
        }
    }, []);

    const BASE_QR_URL = window.location.origin + '/q';

    // ⚡ FIX 2: Format the Logo URL to prevent Canvas CORS/Path errors
    const getFormattedLogoUrl = () => {
        if (!venueLogo) return undefined;
        if (venueLogo.startsWith('http')) return venueLogo;
        
        // If your backend serves uploads locally, we must point directly to the backend port.
        // Adjust 'http://localhost:5000' to match your actual backend URL.
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        return `${backendUrl}${venueLogo.startsWith('/') ? '' : '/'}${venueLogo}`;
    };

    const handleAddSingle = (e) => {
        e.preventDefault();
        if (!singleTableInput.trim()) return;
        if (tables.includes(singleTableInput.trim())) {
            return toast.error("Table already exists.");
        }
        setTables([...tables, singleTableInput.trim()]);
        setSingleTableInput('');
        toast.success(`Added ${singleTableInput}`);
    };

    const handleBulkGenerate = (e) => {
        e.preventDefault();
        const start = parseInt(bulkStart);
        const end = parseInt(bulkEnd);
        
        if (isNaN(start) || isNaN(end) || start >= end || end - start > 100) {
            return toast.error("Invalid range. Start must be less than end (Max 100).");
        }

        const newTables = [];
        for (let i = start; i <= end; i++) {
            const tableName = `Table ${i}`;
            if (!tables.includes(tableName)) newTables.push(tableName);
        }

        setTables([...tables, ...newTables]);
        setBulkStart('');
        setBulkEnd('');
        toast.success(`Generated tables ${start} through ${end}`);
        setIsControlsOpen(false); 
    };

    const removeTable = (tableToRemove) => {
        setTables(tables.filter(t => t !== tableToRemove));
    };

    const downloadQRCode = (tableName) => {
        const canvas = document.getElementById(`qr-${tableName}`);
        if (!canvas) return;
        
        const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `QR_${tableName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex flex-col md:flex-row h-[100dvh] md:h-full md:min-h-[85vh] bg-slate-50 relative overflow-hidden">
            
            {/* --- CONTROLS --- */}
            <aside className={`w-full md:w-[340px] bg-white border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0 flex flex-col z-20 print:hidden transition-all duration-300 ${isControlsOpen ? 'max-h-screen overflow-y-auto' : 'max-h-[72px] md:max-h-screen'} overflow-hidden md:overflow-y-auto absolute md:static top-0 left-0 shadow-md md:shadow-none`}>
                
                <div 
                    className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white cursor-pointer md:cursor-default sticky top-0 z-10"
                    onClick={() => setIsControlsOpen(!isControlsOpen)}
                >
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                            <QrCode className="text-indigo-600" size={24} /> Print Center
                        </h2>
                        <p className="text-xs md:text-sm font-medium text-slate-500 mt-0.5 hidden md:block">Deploy smart table infrastructure.</p>
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
                            <button 
                                onClick={() => setOrderingMode('TAB')}
                                className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${orderingMode === 'TAB' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Open Tab Mode
                            </button>
                            <button 
                                onClick={() => setOrderingMode('KIOSK')}
                                className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${orderingMode === 'KIOSK' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Kiosk (Pay Upfront)
                            </button>
                        </div>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 leading-tight">
                            {orderingMode === 'TAB' ? 'Guests can order multiple rounds and pay at the end.' : 'Guests must pay immediately upon submitting each order.'}
                        </p>
                    </div>

                    <form onSubmit={handleAddSingle} className="space-y-2 pt-4 border-t border-slate-100">
                        <label className="text-xs md:text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Plus size={16} className="text-indigo-500"/> Add Table
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={singleTableInput}
                                onChange={(e) => setSingleTableInput(e.target.value)}
                                placeholder="e.g. VIP-2" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
                            />
                            <button type="submit" disabled={!singleTableInput.trim()} className="px-5 bg-indigo-600 text-white disabled:bg-slate-200 disabled:text-slate-400 font-bold rounded-xl transition-all active:scale-95">
                                Add
                            </button>
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
                        <label className="text-xs md:text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Settings2 size={16} className="text-indigo-500"/> QR Appearance
                        </label>
                        
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                            {['#0f172a', '#4f46e5', '#ea580c', '#16a34a', '#db2777'].map(color => (
                                <button 
                                    key={color} 
                                    type="button"
                                    onClick={() => setQrColor(color)}
                                    className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-[3px] transition-all ${qrColor === color ? 'border-white shadow-md scale-110 ring-2 ring-slate-300' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>

                        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-900">Include Venue Logo</p>
                                <p className="text-[10px] font-medium text-slate-500 mt-0.5 max-w-[150px]">
                                    {venueLogo ? 'Injects your DB logo into the code.' : 'No logo found in settings.'}
                                </p>
                            </div>
                            <button 
                                type="button"
                                disabled={!venueLogo}
                                onClick={() => setIncludeLogo(!includeLogo)}
                                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${includeLogo && venueLogo ? 'bg-indigo-600' : 'bg-slate-300 cursor-not-allowed'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeLogo && venueLogo ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 border-t border-slate-200 bg-slate-50 shrink-0 space-y-3 pb-safe">
                    <button 
                        onClick={handlePrint}
                        disabled={tables.length === 0}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:shadow-none active:scale-95"
                    >
                        <Printer size={20} /> Print Codes {tables.length > 0 && `(${tables.length})`}
                    </button>
                    {tables.length > 0 && (
                        <button onClick={() => {if(window.confirm('Clear all tables?')) setTables([]);}} className="w-full py-2 text-slate-500 hover:text-red-600 text-sm font-bold transition-colors">
                            Clear Canvas
                        </button>
                    )}
                </div>
            </aside>

            {/* --- QR GRID --- */}
            <main className={`flex-1 overflow-y-auto p-4 pt-[88px] md:pt-6 md:p-8 print:p-0 print:pt-0 print:m-0 print:w-[210mm] print:overflow-visible print:bg-white bg-slate-50/50 custom-scrollbar ${isControlsOpen ? 'hidden md:block' : 'block'}`}>
                
                {tables.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 print:hidden px-4 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <QrCode size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Blank Canvas</h3>
                        <p className="text-sm font-medium mt-1 max-w-[250px]">Configure your flow and generate codes to begin.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 print:grid-cols-2 gap-4 md:gap-6 print:gap-4 print:p-4 pb-10">
                        {tables.map(table => {
                            const qrPayload = `${BASE_QR_URL}/${venueId}/${encodeURIComponent(table)}?m=${orderingMode === 'TAB' ? 't' : 'k'}`;

                            return (
                                <div key={table} className="bg-white rounded-3xl border border-slate-200 shadow-sm print:shadow-none print:border-2 print:border-slate-300 overflow-hidden flex flex-col items-center p-4 md:p-6 transition-all hover:shadow-md page-break-inside-avoid relative group print:break-inside-avoid">
                                    
                                    <h3 className="text-lg md:text-2xl font-black text-slate-900 mb-4 md:mb-6 uppercase tracking-widest print:text-2xl text-center leading-tight">
                                        {table}
                                    </h3>

                                    <div className="p-3 md:p-4 bg-white rounded-2xl shadow-inner border border-slate-100 print:shadow-none print:border-none mb-4 flex justify-center w-full aspect-square relative">
                                        <QRCodeCanvas
                                            id={`qr-${table}`}
                                            value={qrPayload}
                                            size={250}
                                            style={{ width: '100%', height: '100%', maxWidth: '250px', maxHeight: '250px' }}
                                            bgColor={"#ffffff"}
                                            fgColor={qrColor}
                                            level={"H"}
                                            includeMargin={false}
                                            imageSettings={includeLogo && venueLogo ? {
                                                src: getFormattedLogoUrl(), 
                                                height: 48,
                                                width: 48,
                                                excavate: true,
                                                crossOrigin: "anonymous", // ⚡ FIX 2: Prevents Canvas Tainting!
                                            } : undefined}
                                        />
                                        {!venueLogo && includeLogo && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                 <div className="bg-white p-1 rounded-lg shadow-sm border border-slate-100">
                                                    <ImageIcon size={24} className="text-slate-300" />
                                                 </div>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-center text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest print:text-black">
                                        Scan to Order
                                    </p>

                                    {/* ⚡ FIX 1: Added 'hidden md:flex' so this overlay completely vanishes on mobile! */}
                                    <div className="hidden md:flex absolute inset-0 bg-slate-900/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 items-center justify-center gap-3 transition-opacity print:hidden focus-within:opacity-100 rounded-3xl">
                                        <button 
                                            onClick={() => downloadQRCode(table)}
                                            className="p-3 bg-white text-slate-900 hover:text-indigo-600 rounded-xl transition-transform hover:scale-110 shadow-lg font-bold flex flex-col items-center gap-1"
                                            title="Download PNG"
                                        >
                                            <Download size={20} />
                                        </button>
                                        <button 
                                            onClick={() => removeTable(table)}
                                            className="p-3 bg-white text-slate-900 hover:text-red-600 rounded-xl transition-transform hover:scale-110 shadow-lg font-bold flex flex-col items-center gap-1"
                                            title="Remove Table"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    {/* Mobile Direct Action Buttons */}
                                    <div className="md:hidden flex w-full gap-2 mt-4 pt-4 border-t border-slate-100 print:hidden relative z-10">
                                        <button onClick={() => downloadQRCode(table)} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold flex justify-center items-center gap-1 active:bg-slate-200">
                                            <Download size={14}/> Save
                                        </button>
                                        <button onClick={() => removeTable(table)} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold flex justify-center items-center gap-1 active:bg-red-100">
                                            <Trash2 size={14}/> Remove
                                        </button>
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