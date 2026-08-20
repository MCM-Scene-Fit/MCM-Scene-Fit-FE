import type { ReactNode } from 'react'
import { ChoiceCard } from './ChoiceCard'
import { Chip } from './Chip'
import { ItemLoadSummary } from './ItemLoadSummary'
import { ItemPresetRow } from './ItemPresetRow'
import {
  kindSelected,
  PICKER_ITEMS_BY_CATEGORY,
  presetKindOf,
  PRESET_KINDS,
  type PresetKind,
} from '../data/itemPresets'
import {
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
  onSetPreset: (kind: PresetKind, presetId: string) => void
  children?: ReactNode
}

export function ConditionsWizard({
  value,
  step,
  onStepChange,
  onChange,
  onToggleItem,
  onSetPreset,
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
        <>
          <div className="choice-grid choice-grid-scenes">
            {SCENES.map((scene) => (
              <ChoiceCard
                key={scene}
                on={value.scene === scene}
                icon={SCENE_ICON[scene]}
                title={SCENE_LABEL[scene]}
                hint={SCENE_HINT[scene]}
                onClick={() => onChange({ scene })}
              />
            ))}
          </div>
          {children}
        </>
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
        <div className="item-picker">
          {PICKER_ITEMS_BY_CATEGORY.map((group) => {
            const kinds = PRESET_KINDS.filter(
              (kind) =>
                group.items.some((item) => presetKindOf(item.id) === kind) &&
                kindSelected(kind, value.items),
            )

            return (
              <section key={group.category} className="item-picker__cat">
                <h3>{group.label}</h3>
                <div className="chip-row chip-icon-row">
                  {group.items.map((item) => {
                    const kind = presetKindOf(item.id)
                    const on = kind
                      ? kindSelected(kind, value.items)
                      : value.items.includes(item.id)
                    return (
                      <Chip
                        key={item.id}
                        icon={<img src={item.icon} alt="" />}
                        on={on}
                        onClick={() => onToggleItem(item.id)}
                      >
                        {item.label}
                      </Chip>
                    )
                  })}
                </div>
                {kinds.map((kind) => (
                  <ItemPresetRow
                    key={kind}
                    kind={kind}
                    presets={value.itemPresets}
                    onChange={onSetPreset}
                  />
                ))}
              </section>
            )
          })}
          <ItemLoadSummary items={value.items} presets={value.itemPresets} />
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
        </>
      ) : null}
    </section>
  )
}
