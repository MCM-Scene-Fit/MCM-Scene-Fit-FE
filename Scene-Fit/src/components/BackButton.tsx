type BackButtonProps = {
  onClick: () => void
}

export function BackButton({ onClick }: BackButtonProps) {
  return (
    <button type="button" className="icon-btn" onClick={onClick} aria-label="뒤로">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M10.25 3.25 4.75 8l5.5 4.75"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
