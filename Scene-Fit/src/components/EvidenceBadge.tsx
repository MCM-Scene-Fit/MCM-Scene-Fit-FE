import { EVIDENCE_LABEL } from '../data/labels'
import type { EvidenceLevel } from '../types'

export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  return <span className={`verdict-badge verdict-badge--${level}`}>{EVIDENCE_LABEL[level]}</span>
}

export function EvidenceStamp({
  level,
  className = '',
}: {
  level: EvidenceLevel
  className?: string
}) {
  return (
    <span className={`fit-stamp fit-stamp--${level} ${className}`.trim()} aria-hidden="true">
      {EVIDENCE_LABEL[level]}
    </span>
  )
}
