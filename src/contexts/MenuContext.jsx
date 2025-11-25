import React, {createContext, useContext, useEffect, useState} from 'react';

const MenuCtx = createContext(null);

export function useMenu() {
  const v = useContext(MenuCtx);
  if (!v) throw new Error('useMenu must be used within <MenuProvider>');
  return v;
}

export function MenuProvider({children}) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(v => !v);
  const close = () => setOpen(false);
  const openMenu = () => setOpen(true);
  const setMenuOpen = (value) => setOpen(value);

  // prevent body scroll when open
  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', open);
  }, [open]);

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <MenuCtx.Provider value={{open, toggle, close, openMenu, setMenuOpen}}>
      {children}
    </MenuCtx.Provider>
  );
}
