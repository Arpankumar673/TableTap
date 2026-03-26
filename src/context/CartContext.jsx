import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [tableId, setTableId] = useState(null);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('tabletap_cart');
    if (saved) {
        try {
            setCart(JSON.parse(saved));
        } catch (e) {
            setCart([]);
        }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tabletap_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item, variant) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.id === item.id && i.variant_id === variant?.id
      );

      if (existingIndex > -1) {
        const newCart = [...prev];
        newCart[existingIndex].quantity += 1;
        return newCart;
      }

      return [
        ...prev, 
        { 
            id: item.id, 
            name: item.name, 
            variant_id: variant?.id, 
            variant_name: variant?.name || 'Standard',
            price: variant?.price || 0,
            quantity: 1 
        }
      ];
    });
  };

  const removeFromCart = (itemId, variantId) => {
    setCart(prev => prev.filter(i => !(i.id === itemId && i.variant_id === variantId)));
  };

  const updateQuantity = (itemId, variantId, newQty) => {
    if (newQty < 1) {
        removeFromCart(itemId, variantId);
        return;
    }
    setCart(prev => prev.map(i => 
        (i.id === itemId && i.variant_id === variantId) ? { ...i, quantity: newQty } : i
    ));
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        tableId,
        setTableId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
