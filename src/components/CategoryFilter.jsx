import React from 'react';
import { motion } from 'framer-motion';

const CategoryFilter = ({ categories, selected, onSelect }) => {
  return (
    <div className="flex overflow-x-auto gap-3 py-3 no-scrollbar -mx-4 px-4 sticky top-[64px] z-30 bg-white border-b border-gray-100 shadow-sm transition-all duration-300">
      {['All', ...categories.map(c => c.name)].map(cat => (
        <motion.button 
          whileTap={{ scale: 0.95 }}
          key={cat}
          onClick={() => onSelect(cat)}
          className={`whitespace-nowrap px-6 h-9 rounded-full text-xs font-semibold uppercase tracking-wide transition-all duration-200 border-2 ${
            selected === cat 
            ? 'bg-[#E23744] text-white border-[#E23744] shadow-lg shadow-[#E23744]/20' 
            : 'bg-gray-50 text-gray-500 border-gray-50 active:bg-gray-100'
          }`}
        >
          {cat}
        </motion.button>
      ))}
    </div>
  );
};

export default CategoryFilter;
