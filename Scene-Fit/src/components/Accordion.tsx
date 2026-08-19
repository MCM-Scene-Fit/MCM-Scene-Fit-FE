import { useId, useState, type ReactNode } from 'react'

type AccordionProps = {
  title: string
  hint?: string
  defaultOpen?: boolean
  children: ReactNode
}

export function Accordion({ title, hint, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <div className={`accordion ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="accordion__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="accordion__copy">
          <strong>{title}</strong>
          {hint ? <em>{hint}</em> : null}
        </span>
        <span className="accordion__chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div id={panelId} className="accordion__panel" role="region">
          {children}
        </div>
      ) : null}
    </div>
  )
}
