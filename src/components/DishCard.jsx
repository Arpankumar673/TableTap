import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const DishCard = ({ item, onClick }) => {
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(item)}
      className="bg-white rounded-[1.5rem] overflow-hidden shadow-sm border-2 border-gray-100 flex flex-col h-full active:shadow-xl hover:shadow-2xl transition-all cursor-pointer group"
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        <img 
          src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'} 
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute top-3 right-3">
            <div className="bg-white px-3 py-1.5 rounded-xl shadow-2xl border border-gray-50 flex items-center justify-center">
                <p className="text-sm font-black text-[#E23744] tracking-tighter leading-none italic">
                    ₹{item.price || item.menu_item_variants?.[0]?.price || '0'}
                </p>
            </div>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow justify-between gap-4 font-inter italic">
        <div className="space-y-1">
          <h3 className="text-sm md:text-base font-black text-[#1C1C1C] leading-tight uppercase tracking-tight line-clamp-1">
            {item.name}
          </h3>
          <p className="text-[10px] md:text-[11px] font-bold text-gray-400 line-clamp-2 leading-relaxed h-[32px] overflow-hidden">
            {item.description || "The authentic taste of Punjab, prepared fresh with our secret spices."}
          </p>
        </div>

        <button className="w-full h-11 md:h-12 bg-white text-[#E23744] border-2 border-[#E23744] hover:bg-[#E23744] hover:text-white rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 font-black text-[10px] uppercase tracking-widest shadow-sm">
           <Plus className="w-4 h-4" />
           ADD DISH
        </button>
      </div>
    </motion.div>
  );
};

export default DishCard;
