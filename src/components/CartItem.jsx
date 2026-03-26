import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const CartItem = ({ item, onUpdate, onRemove }) => {
  return (
    <motion.div 
      layout
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 group hover:shadow-md transition-all h-28"
    >
      <div className="flex-grow min-w-0 flex flex-col justify-between h-full py-1">
        <div>
          <h3 className="text-[15px] font-bold text-[#1C1C1C] line-clamp-1 italic leading-tight uppercase tracking-tight">{item.name}</h3>
          <p className="text-[11px] font-bold text-gray-400 italic mb-2 leading-none">{item.variant_name}</p>
        </div>
        
        <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-xl border border-gray-100 w-fit">
          <button 
            onClick={() => onUpdate(item.id, item.variant_id, item.quantity - 1)} 
            className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#E23744] transition-colors shadow-sm active:scale-90"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-[13px] font-black text-[#1C1C1C] flex items-center min-w-[2ch] justify-center tracking-widest">{item.quantity}</span>
          <button 
            onClick={() => onUpdate(item.id, item.variant_id, item.quantity + 1)} 
            className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#E23744] transition-colors shadow-sm active:scale-90"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      <div className="text-right flex flex-col items-end gap-3 justify-between h-full py-1 min-w-[30%]">
        <p className="text-lg font-black text-[#E23744] tracking-tighter italic leading-none">₹{item.price * item.quantity}</p>
        <button 
            onClick={() => onRemove(item.id, item.variant_id)} 
            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-rose-500 transition-colors active:scale-90"
        >
            <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default CartItem;
