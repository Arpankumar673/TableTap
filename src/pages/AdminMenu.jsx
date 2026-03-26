import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  Plus, 
  Search, 
  Edit3, 
  UtensilsCrossed, 
  ChevronRight,
  PlusCircle,
  XCircle,
  IndianRupee,
  Save,
  Trash2,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const AdminMenu = () => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All Dishes');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ name: '', price: '', category_id: '', image_url: '', is_available: true });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: cats } = await supabase.from('categories').select('*');
        const { data: menu } = await supabase.from('menu_items').select('*, category_id(*)').order('created_at', { ascending: false });
        if (cats) {
            setCategories(cats);
            if (cats.length > 0) setFormData(prev => ({ ...prev, category_id: cats[0].id }));
        }
        if (menu) setItems(menu);
        setLoading(false);
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({ 
                name: item.name, 
                price: item.price, 
                category_id: item.category_id?.id || item.category_id, 
                image_url: item.image_url || '',
                is_available: item.is_available 
            });
        } else {
            setEditingItem(null);
            setFormData({ 
                name: '', 
                price: '', 
                category_id: categories[0]?.id || '', 
                image_url: '', 
                is_available: true 
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        console.log("Saving Item:", formData);

        try {
            if (editingItem) {
                const { error } = await supabase.from('menu_items').update(formData).eq('id', editingItem.id);
                if (error) throw error;
                toast.success("Dish updated successfully!");
            } else {
                const { error } = await supabase.from('menu_items').insert(formData);
                if (error) throw error;
                toast.success("New dish added!");
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error("Save failed:", error);
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this dish?")) return;
        try {
            const { error } = await supabase.from('menu_items').delete().eq('id', id);
            if (error) throw error;
            toast.success("Dish removed!");
            fetchData();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const toggleAvailability = async (item) => {
        const { error } = await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
        if (!error) {
            setItems(items.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
        }
    };

    const filteredItems = items.filter(i => 
        (selectedCategory === 'All Dishes' || i.category_id?.name === selectedCategory) &&
        (i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-12 pb-20 italic font-inter bg-gray-50/20">
            {/* simple Header */}
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-10 border-b border-gray-100 pb-12">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-[#1C1C1C] tracking-tighter uppercase italic">Food Menu</h1>
                    <p className="text-gray-400 font-bold text-xs md:text-sm mt-5 uppercase tracking-widest flex items-center gap-3 italic bg-white px-5 py-2.5 border border-gray-100 w-fit rounded-2xl">
                        <UtensilsCrossed className="w-5 h-5 text-[#E23744]" /> Global catalog: <span className="text-[#1C1C1C]">{items.length} Tasty Items</span>
                    </p>
                </div>
                
                <button onClick={() => handleOpenModal()} className="bg-[#E23744] hover:bg-[#1C1C1C] text-white h-16 px-12 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-[#E23744]/20 transition-all flex items-center justify-center gap-4 group italic">
                    <PlusCircle className="w-6 h-6" /> ADD NEW DISH
                </button>
            </header>

            {/* simple Filters */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-10">
                <div className="flex overflow-x-auto gap-4 py-2 no-scrollbar w-full lg:w-auto">
                    {['All Dishes', ...categories.map(c => c.name)].map(cat => (
                        <button 
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`whitespace-nowrap px-10 h-14 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all italic border-2 ${
                                selectedCategory === cat 
                                ? 'bg-[#1C1C1C] text-white border-[#1C1C1C]' 
                                : 'bg-white text-gray-400 border-transparent'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="relative group w-full lg:min-w-[400px]">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[#E23744]" />
                    <input 
                        type="text" 
                        placeholder="Search Dish Name..."
                        className="w-full h-16 bg-white pl-16 pr-10 rounded-3xl border-2 border-transparent focus:border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E23744]/10 transition-all font-bold text-gray-900 italic"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
                <AnimatePresence>
                    {filteredItems.map(item => (
                        <motion.div 
                            layout initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            key={item.id}
                            className={`bg-white rounded-[3rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col h-full ${
                                !item.is_available ? 'opacity-60 grayscale-[0.5] filter' : ''
                            }`}
                        >
                            <div className="aspect-[4/3] overflow-hidden relative border-b border-gray-50">
                                <img 
                                    src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                />
                                <div className="absolute top-6 right-6 z-10">
                                    <button 
                                        onClick={() => toggleAvailability(item)}
                                        className={`h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all border-2 ${
                                            item.is_available ? 'bg-emerald-500 text-white border-white/20' : 'bg-[#1C1C1C] text-white border-white/20'
                                        }`}
                                    >
                                        {item.is_available ? 'AVAILABLE' : 'SOLD OUT'}
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 md:p-10 flex flex-col flex-grow justify-between gap-10 italic">
                                <div>
                                    <h3 className="text-base md:text-lg font-black text-[#1C1C1C] tracking-tighter leading-none uppercase italic line-clamp-1 mb-3">{item.name}</h3>
                                    <div className="flex items-center gap-3">
                                        <p className="text-[11px] font-black text-[#E23744] tracking-widest leading-none bg-rose-50 px-3 py-1.5 rounded-xl uppercase flex items-center gap-1.5 italic">
                                            <IndianRupee className="w-3 h-3" /> {item.price}
                                        </p>
                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">{item.category_id?.name}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-auto">
                                     <button onClick={() => handleOpenModal(item)} className="flex-grow h-14 bg-gray-50 hover:bg-[#1C1C1C] hover:text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 italic border-2 border-transparent">
                                        EDIT
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="w-14 h-14 shrink-0 bg-gray-50 hover:bg-rose-50 hover:text-[#E23744] rounded-[1.5rem] transition-all flex items-center justify-center border-2 border-transparent">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* ADD / EDIT MODAL */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-[#1C1C1C]/60 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} className="bg-white rounded-[3.5rem] p-12 max-w-md w-full relative z-10 shadow-3xl overflow-hidden font-inter italic">
                            <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-50">
                                <div>
                                    <h2 className="text-3xl font-black text-[#1C1C1C] tracking-tighter uppercase italic">{editingItem ? 'Edit Dish' : 'Add New Dish'}</h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 italic">Kitchen Menu Registry</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-12 h-12 bg-gray-100 hover:bg-[#E23744] hover:text-white rounded-2xl flex items-center justify-center transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic ml-4">Dish Name</label>
                                    <input 
                                        type="text" required placeholder="Ex: Butter Naan..." 
                                        className="w-full h-16 bg-white px-8 rounded-2xl border border-gray-300 text-gray-900 font-bold italic focus:ring-2 focus:ring-[#E23744] placeholder-gray-400 outline-none"
                                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic ml-4">Price (₹)</label>
                                        <input 
                                            type="number" required placeholder="0.00" 
                                            className="w-full h-16 bg-white px-8 rounded-2xl border border-gray-300 text-gray-900 font-bold italic focus:ring-2 focus:ring-[#E23744] placeholder-gray-400 outline-none"
                                            value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic ml-4">Category</label>
                                        <select 
                                            className="w-full h-16 bg-white px-8 rounded-2xl border border-gray-300 text-gray-900 font-bold italic focus:ring-2 focus:ring-[#E23744] outline-none"
                                            value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}
                                        >
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic ml-4">Photo URL (Optional)</label>
                                    <input 
                                        type="url" placeholder="https://..." 
                                        className="w-full h-16 bg-white px-8 rounded-2xl border border-gray-300 text-gray-900 font-bold italic focus:ring-2 focus:ring-[#E23744] placeholder-gray-400 outline-none"
                                        value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})}
                                    />
                                </div>

                                <button 
                                    type="submit" disabled={isSaving}
                                    className="w-full h-20 bg-[#1C1C1C] hover:bg-[#E23744] text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 mt-8 italic"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> SAVE ITEM</>}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminMenu;
