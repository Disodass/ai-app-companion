import React, { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import MenuIcon from '@mui/icons-material/Menu'

export default function HamburgerMenu({ onSignOut }) {
	const [anchorEl, setAnchorEl] = useState(null)
	const open = Boolean(anchorEl)
	return (
		<AppBar position="static" color="transparent" elevation={0}>
			<Toolbar>
				<IconButton
					edge="start"
					color="inherit"
					aria-label="menu"
					onClick={(e) => setAnchorEl(e.currentTarget)}
				>
					<MenuIcon />
				</IconButton>
				<Typography variant="h6" sx={{ flexGrow: 1 }} />
				<Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
					{onSignOut && (
						<MenuItem onClick={() => { setAnchorEl(null); onSignOut && onSignOut(); }}>
							Sign out
						</MenuItem>
					)}
				</Menu>
			</Toolbar>
		</AppBar>
	)
} 