const encryptionManager = {
	isReady() {
		return false
	},
	encrypt(data) {
		try {
			return JSON.stringify(data)
		} catch {
			return ''
		}
	},
	decrypt(payload) {
		if (typeof payload === 'string') {
			return JSON.parse(payload)
		}
		return payload || {}
	}
}

export default encryptionManager