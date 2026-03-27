import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { 
  CheckCircle2, 
  Download, 
  ShoppingBag, 
  Star, 
  Clock, 
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';

// Components
import Footer from '../components/Footer';

const Success = () => {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [recipient, setRecipient] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchOrder();
        fetchRecipient();
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

    const fetchRecipient = async () => {
        const { data } = await supabase
            .from('sms_recipients')
            .select('phone_number')
            .eq('is_active', true)
            .limit(1)
            .single();
        
        if (data) setRecipient(data.phone_number);
    };

    const whatsappUrl = useMemo(() => {
        if (!order || !recipient) return null;
        
        const itemsList = order.order_items.map(i => `${i.menu_items?.name || 'Dish'} x${i.quantity}`).join('\n');
        
        const message = `New Order 🧾\nTable: ${order.tables?.table_number || '??'}\n\n${itemsList}\n\nTotal: ₹${order.total_amount}`;
        
        // Strip non-numeric and format for wa.me
        const cleanPhone = recipient.replace(/\D/g, '');
        // Ensure starting with 91 if it's 10 digit
        const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        
        return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    }, [order, recipient]);

    const generateInvoice = () => {
        if (!order) return;
        setGenerating(true);
        try {
            const doc = new jsPDF();
            doc.text("SIDHU PUNJABI", 105, 20, { align: "center" });
            doc.save(`Sidhu_Invoice_${order.id.slice(0, 8)}.pdf`);
            toast.success("Invoice Downloaded!");
        } catch (err) { toast.error("Fail: " + err.message); }
        finally { setGenerating(false); }
    };

    const submitFeedback = async () => {
        if (rating === 0) return toast.error("Select rating!");
        const { error } = await supabase.from('feedback').insert({ order_id: orderId, rating, comment });
        if (!error) { setSubmitted(true); toast.success("Shared!"); }
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center p-10 italic">
            <Clock className="w-8 h-8 text-[#E23744] animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-white font-inter pb-0 relative w-full overflow-x-hidden italic">
            
            <div className="bg-[#E23744] text-white pt-20 pb-40 px-6 flex flex-col items-center text-center relative overflow-hidden">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                    <CheckCircle2 className="w-10 h-10 text-[#E23744]" />
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic mb-4">Signal <br/>Received</h1>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest italic">ORDER ID #{orderId.slice(0, 8)}</p>
            </div>

            <main className="px-4 md:px-10 -mt-24 max-w-2xl mx-auto space-y-6 relative z-20 mb-20">
                <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-3xl shadow-[#E23744]/10 border border-gray-100 space-y-8">
                    
                    <div className="flex flex-col items-center gap-6 text-center border-b border-gray-50 pb-8">
                        <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic mb-1">STATION ASSIGNMENT</p>
                            <h3 className="text-3xl md:text-4xl font-black text-[#1C1C1C] tracking-tighter italic">Table #{order?.tables?.table_number || '??'}</h3>
                        </div>

                        {/* WhatsApp Broadcast Button - Exact UX Requirements */}
                        {whatsappUrl && (
                            <a 
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-20 bg-[#25D366] hover:bg-[#128C7E] text-white px-8 rounded-[2rem] font-black text-[11px] md:text-[13px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-2xl shadow-[#25D366]/20 active:scale-[0.98]"
                            >
                                <MessageSquare className="w-6 h-6" /> SEND ORDER TO KITCHEN ON WHATSAPP
                            </a>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button onClick={generateInvoice} className="h-16 bg-gray-50 text-[#1C1C1C] rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
                            <Download className="w-4 h-4" /> GET RECEIPT
                        </button>
                        <Link to={`/admin/dashboard`} className="h-16 bg-[#1C1C1C] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
                            <ShoppingBag className="w-4 h-4" /> BACK TO HQ
                        </Link>
                    </div>
                </div>

                {!submitted && (
                    <div className="bg-white rounded-[3rem] p-10 shadow-lg border-2 border-gray-50 space-y-10 text-center">
                        <div className="space-y-2">
                             <h3 className="text-lg font-black text-[#1C1C1C] tracking-tight uppercase italic">Rate the Experience</h3>
                             <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">Help us optimize the kitchen</p>
                        </div>
                        <div className="flex gap-4 justify-center">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button key={s} onClick={() => setRating(s)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${rating >= s ? 'bg-[#E23744] text-white' : 'bg-gray-50 text-gray-200'}`}>
                                    <Star className={`w-5 h-5 ${rating >= s ? 'fill-white' : ''}`} />
                                </button>
                            ))}
                        </div>
                        <textarea className="w-full bg-gray-50 rounded-2xl p-6 text-sm font-bold border-2 border-transparent focus:border-[#E23744] transition-all italic text-gray-800" placeholder="Dish commentary..." rows="2" value={comment} onChange={e => setComment(e.target.value)} />
                        <button onClick={submitFeedback} className="w-full h-16 bg-[#1C1C1C] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#E23744] transition-all">POST REVIEW</button>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default Success;
