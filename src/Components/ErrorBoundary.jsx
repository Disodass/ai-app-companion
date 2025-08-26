import React from 'react'

export default class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props)
		this.state = { hasError: false, message: '' }
	}

	static getDerivedStateFromError(error) {
		return { hasError: true, message: error?.message || 'Something went wrong.' }
	}

	componentDidCatch(error, info) {
		// Optionally log error to an external service
		if (typeof window !== 'undefined' && window?.console) {
			console.error('UI Error:', error, info)
		}
	}

	render() {
		if (this.state.hasError) {
			return (
				<div style={{ padding: 24, fontFamily: 'sans-serif' }}>
					<h2>Something went wrong</h2>
					<p>{this.state.message}</p>
					<button onClick={() => window.location.reload()}>Reload</button>
				</div>
			)
		}
		return this.props.children
	}
}