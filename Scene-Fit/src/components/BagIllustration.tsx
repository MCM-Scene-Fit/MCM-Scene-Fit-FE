import type { WearStyle } from '../types'

type BagIllustrationProps = {
  wear: WearStyle
  color: string
  className?: string
}

export function BagIllustration({ wear, color, className }: BagIllustrationProps) {
  if (wear === 'backpack') {
    return (
      <svg viewBox="0 0 80 96" className={className} aria-hidden="true">
        <rect x="22" y="10" width="8" height="22" rx="4" fill={color} opacity="0.7" />
        <rect x="50" y="10" width="8" height="22" rx="4" fill={color} opacity="0.7" />
        <rect x="16" y="24" width="48" height="62" rx="8" fill={color} />
        <rect x="24" y="34" width="32" height="22" rx="4" fill="#111" opacity="0.18" />
        <rect x="28" y="72" width="24" height="6" rx="2" fill="#111" opacity="0.2" />
      </svg>
    )
  }

  if (wear === 'tote') {
    return (
      <svg viewBox="0 0 90 90" className={className} aria-hidden="true">
        <path
          d="M28 28c0-10 8-18 17-18s17 8 17 18"
          fill="none"
          stroke={color}
          strokeWidth="5"
        />
        <path d="M14 32h62l-6 50H20L14 32z" fill={color} />
        <rect x="28" y="44" width="34" height="8" rx="2" fill="#111" opacity="0.15" />
      </svg>
    )
  }

  if (wear === 'shoulder') {
    return (
      <svg viewBox="0 0 90 80" className={className} aria-hidden="true">
        <path
          d="M18 28c8-16 46-16 54 0"
          fill="none"
          stroke={color}
          strokeWidth="4"
        />
        <rect x="16" y="26" width="58" height="42" rx="8" fill={color} />
        <circle cx="45" cy="48" r="5" fill="#111" opacity="0.2" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 80 90" className={className} aria-hidden="true">
      <path
        d="M58 22c-6-14-30-14-36 0"
        fill="none"
        stroke={color}
        strokeWidth="4"
      />
      <rect x="18" y="20" width="44" height="52" rx="7" fill={color} />
      <rect x="26" y="32" width="28" height="16" rx="3" fill="#111" opacity="0.16" />
    </svg>
  )
}
