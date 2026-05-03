import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load cart from AsyncStorage on component mount
  useEffect(() => {
    loadCart();
  }, []);

  // Save cart to AsyncStorage whenever cart changes
  useEffect(() => {
    if (!loading) {
      saveCart();
    }
  }, [cart, loading]);

  const loadCart = async () => {
    try {
      const savedCart = await AsyncStorage.getItem('cart');
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        const sanitizedCart = parsedCart.map(item => ({
          ...item,
          sapPrice: typeof item.sapPrice === 'number' && !isNaN(item.sapPrice) ? item.sapPrice : 0,
          gstRate: item.gstRate || 18,
          taxcode: item.taxcode || '',
        }));
        setCart(sanitizedCart);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCart = async () => {
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addToCart = (product) => {
    const sanitizedProduct = {
      ...product,
      sapPrice: typeof product.sapPrice === 'number' && !isNaN(product.sapPrice) ? product.sapPrice : 0,
      gstRate: product.gstRate || 18,
      taxcode: product.taxcode || '',
    };
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) =>
          item.code === sanitizedProduct.code &&
          (item.color || '') === (sanitizedProduct.color || '') &&
          (item.suctionType || '') === (sanitizedProduct.suctionType || '')
      );
      if (existingIndex !== -1) {
        return prevCart.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: (item.quantity || 1) + (sanitizedProduct.quantity || 1) }
            : item
        );
      }
      return [...prevCart, sanitizedProduct];
    });
  };

  const removeFromCart = (uniqueNumber) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.uniqueNumber !== uniqueNumber)
    );
  };

  const clearCart = async () => {
    try {
      setCart([]);
      await AsyncStorage.removeItem('cart');
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const updateCartItem = (uniqueNumber, updatedData) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.uniqueNumber === uniqueNumber
          ? { ...item, ...updatedData }
          : item
      )
    );
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      return total + ((item.sapPrice || 0) * (item.quantity || 1));
    }, 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => {
      return count + (item.quantity || 1);
    }, 0);
  };

  const isInCart = (uniqueNumber) => {
    return cart.some((item) => item.uniqueNumber === uniqueNumber);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        updateCartItem,
        getCartTotal,
        getCartItemCount,
        isInCart,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};