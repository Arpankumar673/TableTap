import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { 
  CheckCircle2, 
  Download, 
  ShoppingBag, 
  Star, 
  Clock, 
  ChevronRight,
  Bell,
  FileText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';

// Components
import Footer from '../components/Footer';

const Success = () => {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, 10000);
        return () => clearInterval(interval);
    }, [orderId]);

    const fetchOrder = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*, tables(table_number), order_items(*, menu_items(name))')
            .eq('id', orderId)
            .single();
        
        if (data) setOrder(data);
        setLoading(false);
    };

    const generateInvoice = () => {
        if (!order) return;
        setGenerating(true);
        try {
            const doc = new jsPDF();
            doc.setFontSize(22);
            doc.setTextColor('#E23744');
            doc.text("SIDHU PUNJABI RESTAURANT", 105, 20, { align: "center" });
            doc.save(`Sidhu_Punjabi_Invoice_${order.id.slice(0, 8)}.pdf`);
            toast.success("Invoice Downloaded!");
        } catch (err) {
            toast.error("Generation failed: " + err.message);
        } finally {
            setGenerating(false);
        }
    };

    const submitFeedback = async () => {
        if (rating === 0) return toast.error("Select rating!");
        const { error } = await supabase.from('feedback').insert({ order_id: orderId, rating, comment });
        if (!error) {
            setSubmitted(true);
            toast.success("Reception updated!");
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 gap-10">
            <div className="w-16 h-16 bg-[#E23744] rounded-full animate-bounce flex items-center justify-center shadow-2xl">
                <CheckCircle2 className="text-white w-8 h-8" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 italic">Synchronizing Receipt Channel...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-white font-inter pb-0 relative w-full overflow-x-hidden italic">
            
            {/* Professional Success Header */}
            <div className="bg-[#E23744] text-white pt-24 pb-48 px-4 flex flex-col items-center text-center shadow-lg shadow-[#E23744]/20 overflow-hidden relative">
                <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center">
                    <motion.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl border-4 border-white/20"
                    >
                        <CheckCircle2 className="w-12 h-12 text-[#E23744]" />
                    </motion.div>
                    
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-[0.85] mb-6 underline underline-offset-[16px] decoration-white/10">Signal <br/><span className="text-white">Received</span></h1>
                    <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mt-6 italic">STATION ID #{orderId.slice(0, 8)}</p>
                </div>
                
                {/* Decorative background number */}
                <div className="absolute -bottom-10 right-0 text-[180px] font-black text-white/5 pointer-events-none leading-none select-none italic">
                     READY
                </div>
            </div>

            {/* Content Flow Hub */}
            <main className="px-4 md:px-10 -mt-32 max-w-4xl mx-auto space-y-6 relative z-20 mb-20">
                <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-3xl shadow-[#E23744]/10 border border-gray-100 flex flex-col md:flex-row gap-12 items-center md:items-start transition-all">
                    
                    {/* Primary Info */}
                    <div className="flex-grow space-y-8 w-full">
                        <div className="flex justify-between items-center border-b border-gray-50 pb-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none italic">Allocation Matrix</p>
                                <h3 className="text-3xl md:text-4xl font-black text-[#1C1C1C] tracking-tighter italic">Table #{order?.tables?.table_number || '??'}</h3>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none italic">Arrival Flux</p>
                                <h3 className="text-2xl md:text-3xl font-black text-[#E23744] tracking-tighter italic">15-20 Min</h3>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                             <button 
                                onClick={generateInvoice}
                                disabled={generating}
                                className="flex-grow h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-xl shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
                            >
                                {generating ? <Clock className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />} 
                                {generating ? 'PROCESSING...' : 'DOWNLOAD INVOICE'}
                            </button>
                            <Link to={`/menu/table-${order?.tables?.table_number}`} className="flex-grow h-16 bg-[#1C1C1C] hover:bg-[#E23744] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-4 shadow-xl active:scale-[0.98] transition-all">
                                <ShoppingBag className="w-5 h-5" /> RE-ENTER MENU <ChevronRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>

                {!submitted ? (
                    <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-lg border-2 border-gray-50 flex flex-col items-center gap-10 text-center">
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-[#1C1C1C] tracking-tight uppercase italic leading-none">Experience Calibration</h3>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] italic leading-none">Your input optimizes our kitchen</p>
                        </div>

                        <div className="flex gap-3 md:gap-4">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button key={s} onClick={() => setRating(s)} className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.25rem] flex items-center justify-center transition-all shadow-sm active:scale-90 ${rating >= s ? 'bg-[#E23744] text-white' : 'bg-gray-50 text-gray-200'}`}>
                                    <Star className={`w-6 h-6 ${rating >= s ? 'fill-white' : ''}`} />
                                </button>
                            ))}
                        </div>

                        <textarea 
                            className="w-full bg-white rounded-3xl p-8 text-sm font-bold border-2 border-gray-100 focus:outline-none focus:ring-4 focus:ring-[#E23744]/10 focus:border-[#E23744] transition-all text-gray-900 placeholder-gray-400 italic"
                            placeholder="Add commentary regarding your dishes..." rows="3" value={comment} onChange={(e) => setComment(e.target.value)}
                        />

                        <button 
                            onClick={submitFeedback}
                            className="w-full h-16 bg-white text-[#1C1C1C] border-2 border-[#1C1C1C] rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-[#1C1C1C] hover:text-white transition-all duration-300 shadow-sm"
                        >
                            TRANSMIT REVIEW
                        </button>
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-500 rounded-[3rem] p-12 text-center text-white shadow-2xl relative overflow-hidden">
                        <CheckCircle2 className="w-16 h-16 mx-auto mb-6" />
                        <h3 className="text-2xl font-black uppercase tracking-tight mb-2 italic leading-none">Matrix Updated</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 italic">Chef has analyzed and cataloged your review.</p>
                        
                        {/* Background flare */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[60px] rounded-full" />
                    </motion.div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default Success;
