type ChoiceCardProps = {
  on: boolean
  onClick: () => void
  icon: string
  title: string
  hint: string
}

export function ChoiceCard({ on, onClick, icon, title, hint }: ChoiceCardProps) {
  return (
    <button
      type="button"
      className={`choice-card ${on ? 'is-on' : ''}`}
      aria-pressed={on}
      onClick={onClick}
    >
      <span className="choice-card__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="choice-card__body">
        <strong>{title}</strong>
        <em>{hint}</em>
      </span>
    </button>
  )
}
