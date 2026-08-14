interface IconProps {
  className?: string
}

export function IconPlay({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l11.02-6.86a1.04 1.04 0 0 0 0-1.76L9.56 4.26A1.04 1.04 0 0 0 8 5.14z" />
    </svg>
  )
}

export function IconPause({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <rect x="6" y="4" width="4.5" height="16" rx="1" />
      <rect x="13.5" y="4" width="4.5" height="16" rx="1" />
    </svg>
  )
}

export function IconPrev({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6 5.5a1 1 0 0 1 2 0v13a1 1 0 0 1-2 0v-13z" />
      <path d="M18.5 6.9c0-1.03-1.13-1.66-2.01-1.12L9 9.88v4.24l7.49 4.1c.88.54 2.01-.09 2.01-1.12V6.9z" />
    </svg>
  )
}

export function IconNext({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16 5.5a1 1 0 0 1 2 0v13a1 1 0 0 1-2 0v-13z" />
      <path d="M5.5 6.9c0-1.03 1.13-1.66 2.01-1.12L15 9.88v4.24l-7.49 4.1A1.27 1.27 0 0 1 5.5 17.1V6.9z" />
    </svg>
  )
}

export function IconMenu({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

export function IconFolder({ className = 'w-5 h-5', open = false }: IconProps & { open?: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
        <path d="M4 5h6l2 2h8a1 1 0 0 1 1 1v2H3V6a1 1 0 0 1 1-1z" />
        <path d="M3.16 10.42A1 1 0 0 1 4.12 9.5h15.76a1 1 0 0 1 .96 1.24l-1.5 6.5a1 1 0 0 1-.96.76H4.62a1 1 0 0 1-.96-.76l-1.5-6.82z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M4 5h6l2 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    </svg>
  )
}

export function IconMusic({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9 3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v11.5a3.5 3.5 0 1 1-2-3.16V6h-5v11.5a3.5 3.5 0 1 1-2-3.16V3z" />
    </svg>
  )
}

export function IconChevron({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function IconFolderSelect({ className = 'w-10 h-10' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M12 10.5v5M9.5 13h5" strokeLinecap="round" />
    </svg>
  )
}

export function IconX({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function IconRefresh({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
      <path d="M20 11a8 8 0 1 0-3.1 6.24" />
      <path d="M20 4v7h-7" />
    </svg>
  )
}
