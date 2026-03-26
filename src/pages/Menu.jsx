import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { 
  Search, 
  ShoppingBag, 
  ChevronRight, 
  Utensils,
  AlertCircle
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Modular Components
import DishCard from '../components/DishCard';
import CategoryFilter from '../components/CategoryFilter';
import VariantSelector from '../components/VariantSelector';
import WaiterButton from '../components/WaiterButton';
import Footer from '../components/Footer';

const Menu = () => {
    const { tableId } = useParams();
    const { cart, addToCart, setTableId } = useCart();
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tableInfo, setTableInfo] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (tableId) {
            handleTableInit(tableId);
        }
        fetchMenuData();
    }, [tableId]);

    const handleTableInit = async (id) => {
        let tableData = null;
        if (id.startsWith('table-')) {
            const tableNum = parseInt(id.replace('table-', ''));
            const { data } = await supabase.from('tables').select('*').eq('table_number', tableNum).single();
            tableData = data;
        } else if (!isNaN(id)) {
            const { data } = await supabase.from('tables').select('*').eq('table_number', parseInt(id)).single();
            tableData = data;
        } else {
            const { data } = await supabase.from('tables').select('*').eq('id', id).single();
            tableData = data;
        }

        if (tableData) {
            setTableId(tableData.id);
            setTableInfo(tableData);
            setError(false);
        } else {
            setError(true);
            toast.error("Invalid Table Access!", { icon: <AlertCircle /> });
        }
    };

    const fetchMenuData = async () => {
        setLoading(true);
        const { data: cats } = await supabase.from('categories').select('*').order('created_at');
        const { data: menu } = await supabase.from('menu_items').select('*, menu_item_variants(*)').eq('is_available', true);
        if (cats) setCategories(cats);
        if (menu) setItems(menu);
        setLoading(false);
    };

    const cartCount = useMemo(() => cart.reduce((acc, curr) => acc + curr.quantity, 0), [cart]);
    const cartTotal = useMemo(() => cart.reduce((acc, curr) => acc + (Number(curr.price) * curr.quantity), 0), [cart]);

    const filteredItems = useMemo(() => items.filter(i => 
        (selectedCategory === 'All' || i.category_id === categories.find(c => c.name === selectedCategory)?.id) &&
        (i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [items, selectedCategory, searchTerm, categories]);

    const handleAddItem = (item, variant) => {
        addToCart(item, variant);
        setSelectedItem(null);
        toast.success(`Entry added!`);
    };

    if (error) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 font-inter max-w-md mx-auto text-center">
            <AlertCircle className="w-16 h-16 text-[#E23744] mb-6" />
            <h2 className="text-2xl font-black text-[#1C1C1C] tracking-tighter uppercase italic">Access Denied</h2>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-4">Invalid table identifier.</p>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 gap-6">
            <div className="w-16 h-16 bg-[#E23744] rounded-full flex items-center justify-center animate-bounce">
                <Utensils className="text-white w-7 h-7" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Synchronizing Menu Channel...</p>
        </div>
    );

    return (
        <div className="bg-white min-h-screen font-inter pb-20 relative w-full overflow-x-hidden italic">
            {/* Professional Header - Responsive */}
            <header className="fixed top-0 inset-x-0 z-[45] bg-[#E23744] h-[72px] flex items-center justify-center px-4 md:px-10 shadow-lg shadow-[#E23744]/20 border-b border-white/10">
                <div className="w-full max-w-7xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white text-[#E23744] rounded-xl flex items-center justify-center font-black text-sm shadow-xl border-2 border-white/20">
                            {tableInfo?.table_number || '??'}
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-black text-white tracking-tighter leading-none uppercase italic">SIDHU <span className="opacity-60">PUNJABI</span></h1>
                            <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1 leading-none shadow-sm">ESTABLISHED TABLE CHANNEL</p>
                        </div>
                    </div>
                    
                    <div className="sm:hidden text-center">
                         <h1 className="text-sm font-black text-white tracking-tighter leading-none uppercase italic leading-none">SIDHU HQ</h1>
                         <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1 italic">TABLE {tableInfo?.table_number}</p>
                    </div>

                    <Link to="/cart" className="w-12 h-12 bg-white/20 text-white rounded-2xl relative flex items-center justify-center active:scale-90 transition-all border border-white/20 hover:bg-white/30">
                        <ShoppingBag className="w-6 h-6" />
                        {cartCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-[#1C1C1C] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">{cartCount}</span>
                        )}
                    </Link>
                </div>
            </header>

            <main className="pt-24 px-4 md:px-10 max-w-7xl mx-auto min-h-screen">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-6 lg:py-10">
                    <div className="space-y-4">
                       <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1C1C1C] tracking-tighter uppercase italic leading-[0.85]">Explore <br/><span className="text-[#E23744] underline underline-offset-[12px] decoration-gray-100">The Menu</span></h2>
                       <p className="text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-widest italic">What would you like to eat today?</p>
                    </div>

                    <div className="relative group w-full md:max-w-md">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 transition-colors group-focus-within:text-[#E23744]" />
                        <input 
                            type="text" 
                            placeholder="Search food, drinks & more..."
                            className="w-full h-[64px] bg-white rounded-2xl pl-16 pr-8 text-sm font-bold border-2 border-gray-100 focus:outline-none focus:ring-4 focus:ring-[#E23744]/10 focus:border-[#E23744] transition-all text-gray-900 placeholder-gray-400 italic"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-8 mb-12">
                     <CategoryFilter categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 pb-20">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="h-full">
                             <DishCard item={item} onClick={(it) => setSelectedItem(it)} />
                        </div>
                    ))}
                </div>

                {filteredItems.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center opacity-20 text-center">
                        <Utensils className="w-20 h-20 mb-6 text-gray-400" />
                        <p className="font-black text-2xl uppercase italic tracking-tighter text-gray-800">Clear Search. <br/>Nothing matches.</p>
                    </div>
                )}
            </main>

            <Footer />

            <WaiterButton tableId={tableId} />

            <AnimatePresence>
                {cartCount > 0 && (
                    <motion.div initial={{ y: 150 }} animate={{ y: 0 }} exit={{ y: 150 }} className="fixed bottom-8 left-0 right-0 z-50 px-4 md:px-10 pointer-events-none flex justify-center">
                        <Link to="/cart" className="pointer-events-auto w-full max-w-2xl bg-[#1C1C1C] h-[72px] text-white rounded-[2rem] p-3 flex items-center justify-between shadow-3xl shadow-black/40 border border-white/5 active:scale-[0.98] transition-all">
                            <div className="flex flex-col pl-6">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic leading-none mb-1">VALUATION</p>
                                <p className="text-2xl font-black italic tracking-tighter">₹{cartTotal.toLocaleString()}</p>
                            </div>
                            <div className="h-full bg-[#E23744] px-10 rounded-[1.5rem] font-black text-[12px] uppercase tracking-widest flex items-center gap-3 group shadow-xl transition-all hover:bg-[#F04B57]">
                                VIEW CART <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>

            <VariantSelector item={selectedItem} open={!!selectedItem} onClose={() => setSelectedItem(null)} onSelect={handleAddItem} />
        </div>
    );
};

export default Menu;
