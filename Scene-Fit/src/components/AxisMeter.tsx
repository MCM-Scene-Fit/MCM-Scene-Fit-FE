import { AXIS_STATUS_LABEL } from '../data/labels'
import type { AxisStatus } from '../types'

const METER_FILL: Record<AxisStatus, number> = {
  weak: 1,
  check: 2,
  match: 3,
}

export function AxisMeter({ status, label }: { status: AxisStatus; label: string }) {
  const fill = METER_FILL[status]
  return (
    <div
      className={`axis-meter axis-meter--${status}`}
      role="meter"
      aria-label={`${label} ${AXIS_STATUS_LABEL[status]}`}
      aria-valuemin={1}
      aria-valuemax={3}
      aria-valuenow={fill}
      aria-valuetext={AXIS_STATUS_LABEL[status]}
    >
      {[1, 2, 3].map((step) => (
        <span key={step} className={step <= fill ? 'is-on' : undefined} />
      ))}
    </div>
  )
}

export function AxisPill({ status }: { status: AxisStatus }) {
  return <span className={`axis-pill axis-pill--${status}`}>{AXIS_STATUS_LABEL[status]}</span>
}
