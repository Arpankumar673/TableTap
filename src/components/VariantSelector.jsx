import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Utensils, Plus, ShoppingBasket } from 'lucide-react';

const VariantSelector = ({ item, open, onClose, onSelect }) => {
  if (!item) return null;

  const hasVariants = item.menu_item_variants && item.menu_item_variants.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-8 pointer-events-none">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1C1C1C]/40 backdrop-blur-sm pointer-events-auto"
          />
          <motion.div 
            initial={{ y: 500 }}
            animate={{ y: 0 }}
            exit={{ y: 500 }}
            className="bg-white rounded-3xl w-full max-w-md p-8 relative shadow-2xl border border-gray-100 flex flex-col gap-6 pointer-events-auto font-inter italic"
          >
            <div className="flex justify-between items-start">
              <div className="flex-grow">
                <h3 className="text-2xl font-black text-[#1C1C1C] tracking-tighter uppercase italic leading-tight line-clamp-1 truncate">{item.name}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                    {hasVariants ? 'Customise your appetite' : 'Confirm Selection'}
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl text-gray-400 hover:bg-gray-100 transition-all shrink-0 active:scale-90 shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {hasVariants ? (
                item.menu_item_variants.map(v => (
                  <button 
                    key={v.id}
                    onClick={() => onSelect(item, v)}
                    className="w-full flex items-center justify-between p-5 bg-gray-50 hover:bg-white rounded-2xl border-2 border-transparent hover:border-[#E23744] transition-all active:scale-[0.98] group shadow-sm hover:shadow-xl group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-300 group-hover:text-[#E23744] transition-colors shadow-sm">
                        <Utensils className="w-5 h-5" />
                      </div>
                      <span className="font-black text-[#1C1C1C] text-sm uppercase tracking-tight italic">{v.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-[#E23744] text-lg tracking-tighter italic">₹{v.price}</span>
                      <div className="w-10 h-10 bg-[#E23744] text-white rounded-xl flex items-center justify-center transition-all shadow-xl shadow-[#E23744]/20 active:scale-90 italic">
                        <Plus className="w-5 h-5" />
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <button 
                  onClick={() => onSelect(item, { name: 'Standard', price: item.price })}
                  className="w-full flex items-center justify-between p-6 bg-[#1C1C1C] hover:bg-[#E23744] text-white rounded-[2rem] transition-all active:scale-[0.98] shadow-2xl shadow-black/10 group"
                >
                   <div className="flex flex-col items-start">
                      <p className="text-[9px] font-black text-white/50 uppercase tracking-widest italic mb-1">Price Point</p>
                      <span className="font-black text-2xl tracking-tighter italic leading-none">₹{item.price}</span>
                   </div>
                   <div className="h-14 px-8 bg-white/20 rounded-2xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest border border-white/10 group-hover:bg-white group-hover:text-[#E23744] transition-all">
                      <ShoppingBasket className="w-4 h-4" /> ADD TO BASKET
                   </div>
                </button>
              )}
            </div>
            
            <p className="text-[8px] font-black text-center text-gray-300 uppercase tracking-widest italic mt-2 opacity-60">Verified Sidhu Punjabi Menu Channel</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default VariantSelector;
