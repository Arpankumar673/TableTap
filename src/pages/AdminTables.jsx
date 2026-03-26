import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  Plus, 
  Search, 
  Download, 
  Printer, 
  Table as TableIcon,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

const AdminTables = () => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState(null);

    useEffect(() => { fetchTables(); }, []);

    const fetchTables = async () => {
        setLoading(true);
        const { data } = await supabase.from('tables').select('*').order('table_number', { ascending: true });
        if (data) setTables(data);
        setLoading(false);
    };

    const downloadQR = (tableNum) => {
        const svg = document.getElementById(`qr-table-${tableNum}`);
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.download = `Table-${tableNum}-QR.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    return (
        <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-12 pb-20 italic font-inter">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-10 border-b border-gray-100 pb-12">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-[#1C1C1C] tracking-tighter uppercase italic">Tables & QR</h1>
                    <p className="text-gray-400 font-bold text-xs md:text-sm mt-5 uppercase tracking-widest flex items-center gap-3 italic leading-none shadow-sm px-5 py-2.5 bg-white border border-gray-100 w-fit rounded-2xl">
                        <TableIcon className="w-5 h-5 text-[#E23744]" /> Managing <span className="text-[#1C1C1C]">10 Tables</span>
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-10">
                <AnimatePresence>
                    {tables.map(table => (
                        <motion.div 
                            layout initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            key={table.id}
                            className="bg-white rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 group relative flex flex-col items-center p-10 active:scale-[0.98]"
                        >
                            <div className="w-16 h-16 bg-[#1C1C1C] text-white rounded-2xl flex items-center justify-center font-black text-2xl mb-10 group-hover:bg-[#E23744] transition-colors shadow-2xl shadow-black/10 italic">
                                {table.table_number}
                            </div>
                            
                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 mb-10 transition-all group-hover:bg-white flex items-center justify-center relative shadow-inner">
                                <QRCodeSVG 
                                    id={`qr-table-${table.table_number}`}
                                    value={`${window.location.origin}/menu/table-${table.table_number}`}
                                    size={120}
                                    level="H"
                                    includeMargin={false}
                                    className="relative z-10"
                                />
                                <button 
                                    onClick={() => setSelectedTable(table)}
                                    className="absolute inset-0 bg-[#E23744]/0 group-hover:bg-[#E23744]/5 flex items-center justify-center transition-all z-20 rounded-[2rem]"
                                >
                                    <Maximize2 className="text-transparent group-hover:text-[#E23744] w-6 h-6" />
                                </button>
                            </div>

                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-10 italic">Print for Table {table.table_number}</p>

                            <div className="flex gap-3 w-full mt-auto">
                                <button onClick={() => downloadQR(table.table_number)} className="flex-grow h-14 bg-gray-50 hover:bg-[#1C1C1C] hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 border-2 border-transparent group/btn italic">
                                    <Download className="w-4 h-4" /> SAVE
                                </button>
                                <button className="w-14 h-14 shrink-0 bg-gray-50 hover:bg-rose-50 hover:text-[#E23744] rounded-2xl transition-all border-2 border-transparent flex items-center justify-center active:scale-90">
                                    <Printer className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Expander Modal */}
            <AnimatePresence>
                {selectedTable && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTable(null)} className="absolute inset-0 bg-[#1C1C1C]/60 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[4rem] p-12 max-w-sm w-full relative z-10 flex flex-col items-center shadow-3xl">
                            <h3 className="text-4xl font-black text-[#1C1C1C] uppercase italic mb-2 tracking-tighter leading-none">Table {selectedTable.table_number}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-12 italic leading-none">QR Scan Code</p>
                            
                            <div className="bg-gray-50 p-12 rounded-[3.5rem] border border-gray-100 mb-12 shadow-inner">
                                <QRCodeSVG 
                                    value={`${window.location.origin}/menu/table-${selectedTable.table_number}`}
                                    size={240}
                                    level="H"
                                />
                            </div>

                            <button onClick={() => downloadQR(selectedTable.table_number)} className="w-full h-16 bg-[#E23744] text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-[#E23744]/20 active:scale-95 transition-all italic">
                                SAVE QR IMAGE
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminTables;
