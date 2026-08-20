import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Accordion } from '../components/Accordion'
import { Chip } from '../components/Chip'
import { ConditionsWizard } from '../components/ConditionsWizard'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import { SCENE_LABEL } from '../data/labels'
import { CONDITION_STEPS, initialWizardStep } from '../lib/conditionsWizard'
import { SCENES } from '../types'

export function ConditionsPage() {
  const navigate = useNavigate()
  const { conditions, setConditions, toggleItem, setItemPreset, conditionsReady } = useFlow()
  const [step, setStep] = useState(() => initialWizardStep(conditions))
  const current = CONDITION_STEPS[step - 1]
  const destination = conditions.destination.trim()
  const hasOptionalValues = Boolean(destination || conditions.rewearScene)
  const optionalHint = [
    destination || null,
    conditions.rewearScene ? SCENE_LABEL[conditions.rewearScene] : null,
  ]
    .filter(Boolean)
    .join(' · ') || '장소/시기와 재사용 장면을 더할 수 있어요.'

  return (
    <main className={`page ${step >= 3 ? 'has-sticky' : ''}`}>
      <StepHeader
        variant="catalog"
        step={3}
        title={current.title}
        caption={current.caption}
        onBack={() => (step === 1 ? navigate('/preview') : setStep(step - 1))}
      />

      <ConditionsWizard
        value={conditions}
        step={step}
        onStepChange={setStep}
        onChange={setConditions}
        onToggleItem={toggleItem}
        onSetPreset={setItemPreset}
      >
        <Accordion
          title="옵션 입력"
          hint={optionalHint}
          defaultOpen={hasOptionalValues}
        >
          <div className="wizard-extras">
            <label className="text-field">
              <span>장소/시기</span>
              <input
                value={conditions.destination}
                placeholder="예: 도쿄, 10월"
                onChange={(event) => setConditions({ destination: event.target.value })}
              />
            </label>

            <div>
              <p className="field-label">재사용 장면</p>
              <div className="chip-row chip-row-fill">
                {SCENES.map((scene) => (
                  <Chip
                    key={scene}
                    on={conditions.rewearScene === scene}
                    onClick={() =>
                      setConditions({
                        rewearScene: conditions.rewearScene === scene ? null : scene,
                      })
                    }
                  >
                    {SCENE_LABEL[scene]}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </Accordion>
      </ConditionsWizard>

      {step === 3 ? (
        <StickyBar>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!conditions.items.length}
            onClick={() => setStep(4)}
          >
            다음
          </button>
        </StickyBar>
      ) : null}

      {step === 4 ? (
        <StickyBar>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!conditionsReady}
            onClick={() => navigate('/result')}
          >
            Scene Fit 결과 보기
          </button>
        </StickyBar>
      ) : null}
    </main>
  )
}
