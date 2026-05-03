// ContextAPI/ThemeContext.tsx
import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext({
  colors: {
    primary: '#059669',
    background: '#ffffff',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
  },
  dark: false,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(false);
  
  const lightColors = {
    primary: '#f7931e',
    background: '#ffffff',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
  };
  
  const darkColors = {
    primary: '#10b981',
    background: '#1f2937',
    text: '#f9fafb',
    textSecondary: '#9ca3af',
    border: '#374151',
  };
  
  const toggleTheme = () => {
    setDark(!dark);
  };
  
  return (
    <ThemeContext.Provider value={{ colors: dark ? darkColors : lightColors, dark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);