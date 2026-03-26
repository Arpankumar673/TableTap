import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { supabase } from '../services/supabaseClient';
import { 
  ArrowLeft, 
  Trash2, 
  CreditCard, 
  Banknote, 
  ChevronRight, 
  ShoppingBag,
  Bell,
  AlertCircle,
  Receipt,
  Percent,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { createOrder } from '../services/orderService';
import { initializePayment } from '../services/paymentService';

// Modular Components
import CartItem from '../components/CartItem';
import Footer from '../components/Footer';

const Cart = () => {
    const navigate = useNavigate();
    const { cart, removeFromCart, updateQuantity, clearCart, tableId } = useCart();
    const [paymentMethod, setPaymentMethod] = useState('online');
    const [instructions, setInstructions] = useState('');
    const [loading, setLoading] = useState(false);
    const [billingSettings, setBillingSettings] = useState({ gst_enabled: true, gst_percentage: 5, discount_enabled: false, discount_percentage: 0 });

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('settings').select('value').eq('key', 'billing').single();
            if (data?.value) setBillingSettings(data.value);
        };
        fetchSettings();
    }, []);

    const subtotal = useMemo(() => cart.reduce((acc, curr) => acc + (Number(curr.price) * curr.quantity), 0), [cart]);
    
    const billing = useMemo(() => {
        const discountAmount = billingSettings.discount_enabled ? (subtotal * (billingSettings.discount_percentage / 100)) : 0;
        const subtotalAfterDiscount = subtotal - discountAmount;
        const taxAmount = billingSettings.gst_enabled ? (subtotalAfterDiscount * (billingSettings.gst_percentage / 100)) : 0;
        const finalTotal = subtotalAfterDiscount + taxAmount;
        
        return {
            subtotal,
            discount: discountAmount,
            tax: taxAmount,
            total: finalTotal
        };
    }, [subtotal, billingSettings]);

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error("Basket empty!");
        setLoading(true);
        try {
            const orderData = {
                table_id: tableId,
                subtotal: billing.subtotal,
                tax_amount: billing.tax,
                discount_amount: billing.discount,
                total_amount: Math.round(billing.total),
                payment_method: paymentMethod,
                payment_status: 'pending',
                items: cart.map(item => ({
                    menu_item_id: item.id,
                    variant_id: item.variant_id,
                    quantity: item.quantity,
                    instructions: instructions,
                    price_at_time: item.price
                }))
            };

            const order = await createOrder(orderData);

            if (paymentMethod === 'online') {
                try {
                    await initializePayment({
                        orderId: order.id,
                        amount: orderData.total_amount,
                        tableNumber: 4 
                    });
                    clearCart();
                    navigate(`/success/${order.id}`);
                } catch (payErr) {
                    toast.error(payErr.message || "Payment Failed");
                }
            } else {
                toast.success("Order Placed!");
                clearCart();
                navigate(`/success/${order.id}`);
            }
        } catch (err) {
            toast.error(err.message || "Order Failed");
        } finally {
            setLoading(false);
        }
    };

    if (cart.length === 0) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 font-inter max-w-md mx-auto text-center italic">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center shadow-inner mb-8 opacity-40">
                <ShoppingBag className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-3xl font-black text-[#1C1C1C] tracking-tighter uppercase italic leading-[0.85]">Basket <br/><span className="text-[#E23744]">Deactivated.</span></h2>
            <button onClick={() => navigate(-1)} className="mt-12 h-14 bg-[#1C1C1C] text-white px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Go back to explore</button>
        </div>
    );

    return (
        <div className="bg-white min-h-screen font-inter pb-20 relative w-full overflow-x-hidden italic">
            <header className="fixed top-0 inset-x-0 z-[45] bg-[#E23744] h-[72px] flex items-center justify-center px-4 md:px-10 shadow-lg shadow-[#E23744]/20 border-b border-white/10">
                <div className="w-full max-w-7xl flex items-center gap-6">
                    <button onClick={() => navigate(-1)} className="w-12 h-12 bg-white/20 text-white rounded-2xl active:scale-90 transition-all border border-white/20 shadow-inner flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tighter leading-none uppercase italic">Order Checkout</h1>
                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1 italic leading-none">Establishing Delivery Matrix</p>
                    </div>
                </div>
            </header>

            <main className="pt-24 px-4 md:px-10 max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 min-h-[60vh]">
                
                {/* Left Side: Items & Instructions (Fills on Desktop) */}
                <div className="flex-grow space-y-10">
                    <div className="space-y-4">
                        <h3 className="text-[11px] md:text-xs font-black text-gray-400 uppercase tracking-[0.2em] italic ml-2">Selected Entry Points</h3>
                        <div className="space-y-3">
                            <AnimatePresence>
                                {cart.map((item) => (
                                    <CartItem 
                                        key={`${item.id}-${item.variant_id}`} 
                                        item={item} 
                                        onUpdate={updateQuantity}
                                        onRemove={removeFromCart}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] italic ml-2">Directives for Chef</h3>
                        <textarea 
                            className="w-full bg-white rounded-3xl p-8 text-sm font-bold border-2 border-gray-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-[#E23744]/10 focus:border-[#E23744] transition-all text-gray-900 placeholder-gray-400 italic"
                            placeholder="Any specific instructions (Ex: Extra spicy, no oil)..."
                            rows="3"
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                        />
                    </div>
                </div>

                {/* Right Side: Billing & Method (Sticky on Desktop) */}
                <div className="w-full lg:w-[400px] shrink-0 space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] italic ml-2">Financial Breakdown</h3>
                        <div className="bg-gray-50/50 rounded-[2.5rem] p-10 border-2 border-gray-50 italic space-y-5">
                            <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                                <span className="flex items-center gap-3"><Calculator className="w-4 h-4" /> Subtotal</span>
                                <span className="text-[#1C1C1C]">₹{billing.subtotal.toFixed(2)}</span>
                            </div>
                            {billingSettings.discount_enabled && (
                                <div className="flex justify-between items-center text-xs font-bold text-emerald-600">
                                    <span className="flex items-center gap-3"><Percent className="w-4 h-4" /> Discount ({billingSettings.discount_percentage}%)</span>
                                    <span>- ₹{billing.discount.toFixed(2)}</span>
                                </div>
                            )}
                            {billingSettings.gst_enabled && (
                                <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                                    <span className="flex items-center gap-3"><Receipt className="w-4 h-4" /> GST ({billingSettings.gst_percentage}%)</span>
                                    <span className="text-[#1C1C1C]">+ ₹{billing.tax.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="pt-6 border-t border-gray-100 flex justify-between items-center text-[#1C1C1C]">
                                <span className="text-sm font-black uppercase tracking-widest italic">To Pay</span>
                                <span className="text-3xl font-black italic tracking-tighter">₹{Math.round(billing.total).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] italic ml-2">Secure Payment Channel</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setPaymentMethod('online')}
                                className={`flex flex-col items-center gap-4 py-8 rounded-3xl border-2 transition-all active:scale-95 ${
                                    paymentMethod === 'online' ? 'bg-[#1C1C1C] border-[#1C1C1C] text-white' : 'bg-white border-gray-100 text-gray-400'
                                }`}
                            >
                                <CreditCard className={`w-8 h-8 ${paymentMethod === 'online' ? 'text-[#E23744]' : 'text-gray-100'}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest italic leading-none">Online</span>
                            </button>
                            <button 
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex flex-col items-center gap-4 py-8 rounded-3xl border-2 transition-all active:scale-95 ${
                                    paymentMethod === 'cash' ? 'bg-[#1C1C1C] border-[#1C1C1C] text-white' : 'bg-white border-gray-100 text-gray-400'
                                }`}
                            >
                                <Banknote className={`w-8 h-8 ${paymentMethod === 'cash' ? 'text-emerald-500' : 'text-gray-100'}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest italic leading-none">Cash Pay</span>
                            </button>
                        </div>
                    </div>
                    
                    {/* Desktop Place Order Button (Persistent) */}
                    <button 
                        onClick={handleCheckout}
                        disabled={loading}
                        className="hidden lg:flex w-full h-[72px] bg-[#E23744] hover:bg-[#F04B57] text-white rounded-3xl font-black text-[12px] uppercase tracking-widest items-center justify-center gap-4 transition-all shadow-2xl shadow-[#E23744]/20 active:scale-[0.98] italic"
                    >
                         {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>FINALIZE SECURE ORDER <ChevronRight className="w-5 h-5" /></>}
                    </button>
                </div>
            </main>

            <Footer />

            {/* Mobile Sticky Bar - Hidden on Desktop */}
            <div className="lg:hidden fixed bottom-8 left-0 right-0 z-50 px-4 pointer-events-none flex justify-center">
                <div className="pointer-events-auto bg-[#1C1C1C] rounded-[2rem] h-[72px] flex items-center justify-between shadow-3xl shadow-black/40 border border-white/5 w-full max-w-lg p-3 transition-all">
                    <div className="flex flex-col pl-6">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1 italic">Total Bill</p>
                        <p className="text-2xl font-black text-white tracking-tighter italic whitespace-nowrap">₹{Math.round(billing.total).toLocaleString()}</p>
                    </div>
                    <button 
                        onClick={handleCheckout}
                        disabled={loading}
                        className="h-full bg-[#E23744] text-white px-8 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] italic"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>PLACE ORDER <ChevronRight className="w-4 h-4" /></>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Cart;
