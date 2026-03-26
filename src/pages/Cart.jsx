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
                total_amount: Math.round(billing.total), // Round to nearest integer for simple billing
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
                toast.success("Order Placed!", { style: { borderRadius: '1rem', background: '#333', color: '#fff' } });
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
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 font-inter max-w-md mx-auto shadow-xl">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-inner mb-8 opacity-40">
                <ShoppingBag className="w-8 h-8 text-gray-300" />
            </div>
            <h2 className="text-2xl font-black text-[#1C1C1C] tracking-tighter uppercase italic text-center leading-[0.85]">Your Cart is Currently <br/><span className="text-[#E23744]">Deactivated.</span></h2>
            <button onClick={() => navigate(-1)} className="mt-12 h-12 bg-[#1C1C1C] text-white px-8 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Go back to explore</button>
        </div>
    );

    return (
        <div className="bg-white min-h-screen font-inter pb-44 relative max-w-md mx-auto shadow-xl transition-all italic">
            {/* Minimal Zomato Header */}
            <header className="fixed top-0 inset-x-0 z-[45] bg-[#E23744] h-[64px] flex items-center justify-center px-4 shadow-lg shadow-[#E23744]/10 border-b border-white/10">
                <div className="w-full max-w-md flex items-center gap-6">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/20 text-white rounded-xl active:scale-90 transition-all border border-white/20 shadow-inner flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tighter leading-none uppercase italic">My Basket</h1>
                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-0.5 italic italic">Sidhu Punjabi Orders</p>
                    </div>
                </div>
            </header>

            <main className="pt-20 px-4 space-y-8">
                {/* List Items Grid */}
                <div className="space-y-3 pt-4">
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

                {/* Directives Section */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic ml-4">Special Directives</h3>
                    <textarea 
                        className="w-full bg-white rounded-2xl p-6 text-sm font-bold border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E23744] focus:border-[#E23744] transition-all text-gray-900 placeholder-gray-500 italic"
                        placeholder="Ex: No Onion, Extra spicy..."
                        rows="2"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                    />
                </div>

                {/* Billing Summary Breakdown */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic ml-4">Bill Breakdown</h3>
                    <div className="bg-[#F8F8F8] rounded-3xl p-6 border border-gray-100 italic space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                            <span className="flex items-center gap-2"><Calculator className="w-3.5 h-3.5" /> Subtotal</span>
                            <span>₹{billing.subtotal.toFixed(2)}</span>
                        </div>
                        {billingSettings.discount_enabled && (
                            <div className="flex justify-between items-center text-xs font-bold text-emerald-600">
                                <span className="flex items-center gap-2"><Percent className="w-3.5 h-3.5" /> Discount ({billingSettings.discount_percentage}%)</span>
                                <span>- ₹{billing.discount.toFixed(2)}</span>
                            </div>
                        )}
                        {billingSettings.gst_enabled && (
                            <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                                <span className="flex items-center gap-2"><Receipt className="w-3.5 h-3.5" /> GST ({billingSettings.gst_percentage}%)</span>
                                <span>+ ₹{billing.tax.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-[#1C1C1C]">
                            <span className="text-sm font-black uppercase tracking-widest italic">To Pay</span>
                            <span className="text-xl font-black italic">₹{Math.round(billing.total).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Toggle */}
                <div className="space-y-4 pb-20">
                    <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic ml-4">Payment Method</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setPaymentMethod('online')}
                            className={`flex flex-col items-center gap-4 p-8 rounded-3xl border-2 transition-all active:scale-95 ${
                                paymentMethod === 'online' ? 'bg-[#1C1C1C] border-[#1C1C1C] text-white shadow-[#E23744]/20' : 'bg-white border-transparent text-gray-400'
                            }`}
                        >
                            <CreditCard className={`w-8 h-8 ${paymentMethod === 'online' ? 'text-[#E23744]' : 'text-gray-200'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest italic tracking-widest">Online</span>
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('cash')}
                            className={`flex flex-col items-center gap-4 p-8 rounded-3xl border-2 transition-all active:scale-95 ${
                                paymentMethod === 'cash' ? 'bg-[#1C1C1C] border-[#1C1C1C] text-white shadow-emerald-500/20' : 'bg-white border-transparent text-gray-400'
                            }`}
                        >
                            <Banknote className={`w-8 h-8 ${paymentMethod === 'cash' ? 'text-emerald-500' : 'text-gray-200'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest italic tracking-widest">Cash</span>
                        </button>
                    </div>
                </div>
            </main>

            {/* Bottom Zomato Sticky Bar */}
            <div className="fixed bottom-6 left-0 right-0 z-50 px-4 pointer-events-none">
                <div className="pointer-events-auto bg-[#1C1C1C] rounded-[2rem] h-20 flex items-center justify-between shadow-2xl border border-white/10 max-w-sm mx-auto overflow-hidden p-3 transition-all">
                    <div className="flex flex-col pl-6">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1 italic">Total Bill</p>
                        <p className="text-3xl font-black text-white tracking-tighter italic whitespace-nowrap">₹{Math.round(billing.total).toLocaleString()}</p>
                    </div>
                    <button 
                        onClick={handleCheckout}
                        disabled={loading}
                        className={`h-full bg-[#E23744] hover:bg-white hover:text-[#E23744] text-white min-w-[160px] px-8 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] italic ${
                            loading ? 'opacity-80' : ''
                        }`}
                    >
                        {loading ? (
                             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>PLACE ORDER <ChevronRight className="w-4 h-4" /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Cart;
