import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './Components/ErrorBoundary.jsx'

const Onboarding = lazy(() => import('./Components/Onboarding.jsx'))
const Settings = lazy(() => import('./Components/Settings.jsx'))

export default function App() {
	return (
		<ErrorBoundary>
			<Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
				<Routes>
					<Route path="/" element={<Navigate to="/onboarding" replace />} />
					<Route path="/onboarding" element={<Onboarding />} />
					<Route path="/settings" element={<Settings />} />
				</Routes>
			</Suspense>
		</ErrorBoundary>
	)
}