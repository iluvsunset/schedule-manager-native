import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext({});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');

  const colors = theme === 'dark' ? {
    background: '#000000',
    card: '#1c1c1e',
    text: '#ffffff',
    textSecondary: 'rgba(235, 235, 245, 0.6)', // iOS Secondary Label
    accent: '#ffffff',
    border: 'rgba(255, 255, 255, 0.1)',
    success: '#32d74b',
    danger: '#ff453a',
    warning: '#ffd60a',
    glass: 'rgba(28, 28, 30, 0.7)', // iOS Liquid Glass Dark
    glassProminent: 'rgba(44, 44, 46, 0.9)',
    vibrant: 'rgba(255, 255, 255, 0.8)',
    shadow: 'rgba(0, 0, 0, 0.5)',
  } : {
    background: '#f2f2f7', // iOS System Background
    card: '#ffffff',
    text: '#000000',
    textSecondary: 'rgba(60, 60, 67, 0.6)', // iOS Secondary Label Light
    accent: '#000000',
    border: 'rgba(0, 0, 0, 0.1)',
    success: '#34c759',
    danger: '#ff3b30',
    warning: '#ffcc00',
    glass: 'rgba(255, 255, 255, 0.7)', // iOS Liquid Glass Light
    glassProminent: 'rgba(242, 242, 247, 0.9)',
    vibrant: 'rgba(0, 0, 0, 0.8)',
    shadow: 'rgba(0, 0, 0, 0.1)',
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
