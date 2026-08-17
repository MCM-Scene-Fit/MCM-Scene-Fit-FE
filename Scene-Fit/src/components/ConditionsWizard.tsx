import type { ReactNode } from 'react'
import { ChoiceCard } from './ChoiceCard'
import { Chip } from './Chip'
import {
  ITEM_ICON,
  ITEM_LABEL,
  MOBILITY_HINT,
  MOBILITY_ICON,
  MOBILITY_LABEL,
  SCENE_HINT,
  SCENE_ICON,
  SCENE_LABEL,
  WEAR_HINT,
  WEAR_ICON,
  WEAR_LABEL,
} from '../data/labels'
import {
  canReachWizardStep,
  CONDITION_STEPS,
  isWizardStepComplete,
} from '../lib/conditionsWizard'
import {
  ITEMS,
  MOBILITY,
  SCENES,
  WEAR_STYLES,
  type Conditions,
  type ItemId,
} from '../types'

type ConditionsWizardProps = {
  value: Conditions
  step: number
  onStepChange: (step: number) => void
  onChange: (patch: Partial<Conditions>) => void
  onToggleItem: (item: ItemId) => void
  children?: ReactNode
}

export function ConditionsWizard({
  value,
  step,
  onStepChange,
  onChange,
  onToggleItem,
  children,
}: ConditionsWizardProps) {
  const goNextFrom = (from: number) => {
    if (step === from) onStepChange(from + 1)
  }

  return (
    <section className="wizard">
      <ol className="form-stepper" aria-label="조건 입력 단계">
        {CONDITION_STEPS.map((item) => {
          const current = step === item.id
          const done = !current && isWizardStepComplete(value, item.id)
          const reachable = canReachWizardStep(value, item.id)

          return (
            <li
              key={item.id}
              className={`${current ? 'is-current' : ''} ${done ? 'is-done' : ''}`}
            >
              <button
                type="button"
                disabled={!reachable}
                aria-current={current ? 'step' : undefined}
                onClick={() => onStepChange(item.id)}
              >
                <span className="form-stepper__dot">{done ? '✓' : item.id}</span>
                <span className="form-stepper__label">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ol>

      {step === 1 ? (
        <div className="choice-grid choice-grid-2">
          {SCENES.map((scene) => (
            <ChoiceCard
              key={scene}
              on={value.scene === scene}
              icon={SCENE_ICON[scene]}
              title={SCENE_LABEL[scene]}
              hint={SCENE_HINT[scene]}
              onClick={() => {
                onChange({ scene })
                goNextFrom(1)
              }}
            />
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="choice-grid choice-grid-stack">
          {MOBILITY.map((mobility) => (
            <ChoiceCard
              key={mobility}
              on={value.mobility === mobility}
              icon={MOBILITY_ICON[mobility]}
              title={MOBILITY_LABEL[mobility]}
              hint={MOBILITY_HINT[mobility]}
              onClick={() => {
                onChange({ mobility })
                goNextFrom(2)
              }}
            />
          ))}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="chip-row chip-icon-row">
          {ITEMS.map((item: ItemId) => (
            <Chip
              key={item}
              icon={ITEM_ICON[item]}
              on={value.items.includes(item)}
              onClick={() => onToggleItem(item)}
            >
              {ITEM_LABEL[item]}
            </Chip>
          ))}
        </div>
      ) : null}

      {step === 4 ? (
        <>
          <div className="choice-grid choice-grid-2">
            {WEAR_STYLES.map((wear) => (
              <ChoiceCard
                key={wear}
                on={value.wearStyle === wear}
                icon={WEAR_ICON[wear]}
                title={WEAR_LABEL[wear]}
                hint={WEAR_HINT[wear]}
                onClick={() => onChange({ wearStyle: wear })}
              />
            ))}
          </div>
          {children}
        </>
      ) : null}
    </section>
  )
}
