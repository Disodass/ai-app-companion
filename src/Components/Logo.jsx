import React from 'react'

export default function Logo({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const sizeClass = sizeClasses[size] || sizeClasses.md

  return (
    <img 
      src="/bestibule_logo_800x800.png"
      alt="Bestibule Logo"
      className={`${sizeClass} object-contain ${className}`}
    />
  )
}

