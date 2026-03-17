import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'sonner';
import { QrCode, Printer, Download, Plus, Trash2, Settings2, Grid3X3 } from 'lucide-react';

export default function QRGenerator() {
    const [venueId, setVenueId] = useState('');
    const [tables, setTables] = useState([]);
    const [singleTableInput, setSingleTableInput] = useState('');
    
    // Bulk Generation State
    const [bulkStart, setBulkStart] = useState('');
    const [bulkEnd, setBulkEnd] = useState('');

    // Design State for the QR Codes
    const [qrColor, setQrColor] = useState('#0f172a'); // Slate 900
    const [includeLogo, setIncludeLogo] = useState(false);

    // Get the venue ID on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setVenueId(decoded.venueId);
                // Pre-populate with a few standard tables
                setTables(['Table 1', 'Table 2', 'Table 3', 'VIP-1']);
            } catch (err) {
                console.error("Token decode error", err);
            }
        }
    }, []);

    // The base URL where your customer-facing menu app lives
    const BASE_MENU_URL = window.location.origin + '/menu'; // Adjust to production URL later

    const handleAddSingle = (e) => {
        e.preventDefault();
        if (!singleTableInput.trim()) return;
        if (tables.includes(singleTableInput)) {
            return toast.error("Table already exists in the list.");
        }
        setTables([...tables, singleTableInput]);
        setSingleTableInput('');
        toast.success(`Added ${singleTableInput}`);
    };

    const handleBulkGenerate = (e) => {
        e.preventDefault();
        const start = parseInt(bulkStart);
        const end = parseInt(bulkEnd);
        
        if (isNaN(start) || isNaN(end) || start >= end || end - start > 100) {
            return toast.error("Invalid range. Ensure start < end, max 100 at a time.");
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
        <div className="flex flex-col md:flex-row h-full  min-h-[85vh] bg-slate-50 relative overflow-hidden">
            
            {/* --- LEFT COLUMN: CONTROLS (Hidden when printing) --- */}
            <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col z-10 print:hidden overflow-y-auto">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <QrCode className="text-indigo-600" /> Print Center
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Generate and print table tents.</p>
                </div>

                <div className="p-6 space-y-8 flex-1">
                    {/* Single Table Addition */}
                    <form onSubmit={handleAddSingle} className="space-y-3">
                        <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <Plus size={16} className="text-slate-400"/> Single Table
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={singleTableInput}
                                onChange={(e) => setSingleTableInput(e.target.value)}
                                placeholder="e.g. VIP-2" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                            <button type="submit" className="px-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl transition-colors">
                                Add
                            </button>
                        </div>
                    </form>

                    {/* Bulk Generation */}
                    <form onSubmit={handleBulkGenerate} className="space-y-3">
                        <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <Grid3X3 size={16} className="text-slate-400"/> Bulk Generate
                        </label>
                        <div className="flex items-center gap-2">
                            <input type="number" min="1" placeholder="Start" value={bulkStart} onChange={(e)=>setBulkStart(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                            <span className="text-slate-400 font-medium">to</span>
                            <input type="number" min="2" placeholder="End" value={bulkEnd} onChange={(e)=>setBulkEnd(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                        </div>
                        <button type="submit" className="w-full py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-xl transition-colors text-sm">
                            Generate Range
                        </button>
                    </form>

                    {/* Styling Controls */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <Settings2 size={16} className="text-slate-400"/> QR Style
                        </label>
                        <div className="flex gap-3">
                            {['#0f172a', '#4f46e5', '#ea580c', '#16a34a'].map(color => (
                                <button 
                                    key={color} 
                                    onClick={() => setQrColor(color)}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform ${qrColor === color ? 'border-slate-400 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                        <label className="flex items-center gap-2 mt-4 cursor-pointer">
                            <input type="checkbox" checked={includeLogo} onChange={(e) => setIncludeLogo(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm text-slate-700">Include Smart Table Icon</span>
                        </label>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 space-y-3">
                    <button 
                        onClick={handlePrint}
                        disabled={tables.length === 0}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Printer size={20} /> Print All ({tables.length})
                    </button>
                    <button onClick={() => setTables([])} className="w-full py-2 text-slate-500 hover:text-red-600 text-sm font-semibold transition-colors">
                        Clear All
                    </button>
                </div>
            </aside>

            {/* --- RIGHT COLUMN: QR GRID --- */}
            {/* The print: modifier makes this fill the entire page when printing */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8 print:p-0 print:overflow-visible print:bg-white bg-slate-50/50">
                {tables.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 print:hidden">
                        <QrCode size={64} className="mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-slate-700">No tables added</h3>
                        <p>Use the panel to generate QR codes.</p>
                    </div>
                ) : (
                    // Print layout adjusts grid for physical paper sizes
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 print:grid-cols-3 gap-6 print:gap-8">
                        {tables.map(table => {
                            // The payload encoded in the QR Code
                            const qrPayload = `${BASE_MENU_URL}/${venueId}?table=${encodeURIComponent(table)}`;

                            return (
                                <div key={table} className="bg-white rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-2 print:border-slate-300 overflow-hidden group flex flex-col items-center p-6 transition-all hover:shadow-md page-break-inside-avoid">
                                    
                                    {/* Table Name Header */}
                                    <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-widest print:text-3xl text-center">
                                        {table}
                                    </h3>

                                    {/* The Canvas QR Code */}
                                    <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-100 print:shadow-none print:border-none mb-6">
                                        <QRCodeCanvas
                                            id={`qr-${table}`}
                                            value={qrPayload}
                                            size={180}
                                            bgColor={"#ffffff"}
                                            fgColor={qrColor}
                                            level={"H"} // High error correction so it works even if damaged
                                            includeMargin={false}
                                            imageSettings={includeLogo ? {
                                                src: "/vite.svg", // Replace with actual venue logo path later
                                                x: undefined,
                                                y: undefined,
                                                height: 40,
                                                width: 40,
                                                excavate: true,
                                            } : undefined}
                                        />
                                    </div>

                                    {/* Instructions for customer (visible on print) */}
                                    <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-widest print:text-black">
                                        Scan to Order & Pay
                                    </p>

                                    {/* Screen-only actions (Hidden on print) */}
                                    <div className="mt-6 flex items-center justify-center gap-2 w-full pt-4 border-t border-slate-100 print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => downloadQRCode(table)}
                                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Download PNG"
                                        >
                                            <Download size={20} />
                                        </button>
                                        <button 
                                            onClick={() => removeTable(table)}
                                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove Table"
                                        >
                                            <Trash2 size={20} />
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