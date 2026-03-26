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
        const { data, error } = await supabase
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
            const primaryColor = '#E23744';
            
            // Header
            doc.setFontSize(22);
            doc.setTextColor(primaryColor);
            doc.text("SIDHU PUNJABI RESTAURANT", 105, 20, { align: "center" });
            
            doc.setFontSize(10);
            doc.setTextColor('#6B7280');
            doc.text("Professional Dining Receipt", 105, 28, { align: "center" });

            // Info Section
            doc.setDrawColor('#E5E7EB');
            doc.line(20, 35, 190, 35);
            
            doc.setTextColor('#1C1C1C');
            doc.setFont(undefined, 'bold');
            doc.text(`Order ID: #${order.id.slice(0, 8)}`, 20, 45);
            doc.text(`Table: ${order.tables?.table_number || 'Default'}`, 20, 52);
            doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 190, 45, { align: 'right' });
            doc.text(`Time: ${new Date(order.created_at).toLocaleTimeString()}`, 190, 52, { align: 'right' });

            // Items Header
            doc.line(20, 60, 190, 60);
            doc.text("Item Description", 20, 68);
            doc.text("Qty", 130, 68, { align: 'center' });
            doc.text("Price", 160, 68, { align: 'center' });
            doc.text("Total", 190, 68, { align: 'right' });
            doc.line(20, 72, 190, 72);

            // Item List
            doc.setFont(undefined, 'normal');
            let cursorY = 80;
            order.order_items?.forEach((item) => {
                const name = item.menu_items?.name || 'Dish Item';
                const total = (item.price_at_time * item.quantity).toFixed(2);
                doc.text(name, 20, cursorY);
                doc.text(item.quantity.toString(), 130, cursorY, { align: 'center' });
                doc.text(`₹${item.price_at_time}`, 160, cursorY, { align: 'center' });
                doc.text(`₹${total}`, 190, cursorY, { align: 'right' });
                cursorY += 8;
            });

            // Financials
            cursorY += 10;
            doc.line(120, cursorY, 190, cursorY);
            cursorY += 10;
            
            doc.text("Subtotal:", 130, cursorY);
            doc.text(`₹${(order.subtotal || 0).toFixed(2)}`, 190, cursorY, { align: 'right' });
            cursorY += 8;

            if (order.discount_amount > 0) {
                doc.setTextColor('#10B981');
                doc.text("Discount:", 130, cursorY);
                doc.text(`- ₹${(order.discount_amount).toFixed(2)}`, 190, cursorY, { align: 'right' });
                cursorY += 8;
                doc.setTextColor('#1C1C1C');
            }

            if (order.tax_amount > 0) {
                doc.text("Tax (GST):", 130, cursorY);
                doc.text(`+ ₹${(order.tax_amount).toFixed(2)}`, 190, cursorY, { align: 'right' });
                cursorY += 8;
            }

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text("Final Total:", 130, cursorY + 5);
            doc.text(`₹${(order.total_amount).toFixed(2)}`, 190, cursorY + 5, { align: 'right' });

            // Footer
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.setTextColor('#9CA3AF');
            doc.text("Thank you for dining with Sidhu Punjabi!", 105, 280, { align: 'center' });
            doc.text("This is a computer generated receipt.", 105, 285, { align: 'center' });

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
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 gap-10 max-w-md mx-auto shadow-xl">
            <div className="w-16 h-16 bg-[#E23744] rounded-full animate-bounce flex items-center justify-center shadow-2xl">
                <CheckCircle2 className="text-white w-8 h-8" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Synchronizing Receipt Channel...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-white font-inter pb-20 relative max-w-md mx-auto shadow-xl italic">
            {/* Success Area (Red Header) */}
            <div className="bg-[#E23744] text-white pt-20 pb-44 px-10 rounded-b-[4rem] relative overflow-hidden flex flex-col items-center text-center shadow-lg shadow-[#E23744]/20 border-b border-white/10">
                <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl relative z-10"
                >
                    <CheckCircle2 className="w-10 h-10 text-[#E23744]" />
                </motion.div>
                
                <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-[0.85] mb-4 relative z-10 underline underline-offset-[14px] decoration-white/10">Order <br/><span className="text-white">Received</span></h1>
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest relative z-10 mt-4 italic">EST ID #{orderId.slice(0, 8)}</p>
            </div>

            {/* Content Flow */}
            <main className="px-4 -mt-32 space-y-4 relative z-20">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-50 flex flex-col gap-8 transition-all">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-8">
                        <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none mb-2 italic">Allocation</p>
                            <h3 className="text-3xl font-black text-[#1C1C1C] tracking-tighter italic whitespace-nowrap">Table #{order?.tables?.table_number || '??'}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none mb-2 italic">Live Timer</p>
                            <h3 className="text-2xl font-black text-[#E23744] tracking-tighter italic">15-20 Min</h3>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                         <button 
                            onClick={generateInvoice}
                            disabled={generating}
                            className="w-full h-16 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 active:bg-emerald-600 disabled:opacity-50"
                        >
                            {generating ? <Clock className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                            {generating ? 'GENERATING PDF...' : 'DOWNLOAD RECEIPT'}
                        </button>
                        <Link to={`/menu/table-${order?.tables?.table_number}`} className="w-full h-16 bg-[#1C1C1C] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-4 shadow-xl active:scale-[0.98] transition-all">
                            <ShoppingBag className="w-4 h-4" /> MORE ITEMS <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {!submitted ? (
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col items-center gap-8 font-inter italic">
                        <div className="text-center">
                            <h3 className="text-lg font-black text-[#1C1C1C] tracking-tight uppercase italic mb-1 leading-none">Dish Feedback</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Rate your experience</p>
                        </div>

                        <div className="flex gap-3">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button key={s} onClick={() => setRating(s)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${rating >= s ? 'bg-[#E23744] text-white' : 'bg-gray-50 text-gray-300'}`}>
                                    <Star className={`w-5 h-5 ${rating >= s ? 'fill-white' : ''}`} />
                                </button>
                            ))}
                        </div>

                        <textarea 
                            className="w-full bg-white rounded-2xl p-6 text-sm font-bold border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#E23744] focus:border-[#E23744] transition-all text-gray-900 placeholder-gray-500 italic"
                            placeholder="Add commentary..." rows="2" value={comment} onChange={(e) => setComment(e.target.value)}
                        />

                        <button 
                            onClick={submitFeedback}
                            className="w-full h-14 bg-white text-[#1C1C1C] border-2 border-[#1C1C1C] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 active:bg-[#1C1C1C] active:text-white"
                        >
                            TRANSMIT REVIEW
                        </button>
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-500 rounded-[2.5rem] p-10 text-center text-white shadow-2xl italic">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-4" />
                        <h3 className="text-xl font-black uppercase tracking-tight mb-2 italic leading-none">Signal Received</h3>
                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-80 italic italic">Chef has cataloged your submission.</p>
                    </motion.div>
                )}
            </main>
        </div>
    );
};

export default Success;
