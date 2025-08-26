import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Onboarding from './Components/Onboarding.jsx'
import Settings from './Components/Settings.jsx'

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<Navigate to="/onboarding" replace />} />
			<Route path="/onboarding" element={<Onboarding />} />
			<Route path="/settings" element={<Settings />} />
		</Routes>
	)
}