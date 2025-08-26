import React, { createContext, useContext, useMemo, useState } from 'react'

const ThemeContext = createContext({
	currentTheme: 'light',
	themes: ['light', 'dark', 'ocean', 'forest'],
	changeTheme: () => {}
})

export function ThemeProvider({ children }) {
	const [currentTheme, setCurrentTheme] = useState('light')
	const value = useMemo(() => ({
		currentTheme,
		themes: ['light', 'dark', 'ocean', 'forest'],
		changeTheme: setCurrentTheme
	}), [currentTheme])
	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
	return useContext(ThemeContext)
}