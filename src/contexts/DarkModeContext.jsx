import React, { createContext, useContext, useEffect, useState } from 'react';

const DarkModeContext = createContext();
const KEY = 'bb-theme'; // 'dark' | 'light'

export function useDarkMode() {
  const ctx = useContext(DarkModeContext);
  if (!ctx) throw new Error('useDarkMode must be used within a DarkModeProvider');
  return ctx;
}

export function DarkModeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem(KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode: () => setDarkMode(v => !v) }}>
      {children}
    </DarkModeContext.Provider>
  );
}
