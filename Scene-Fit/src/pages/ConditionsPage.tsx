import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { ConditionsWizard } from '../components/ConditionsWizard'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import { SCENE_LABEL } from '../data/labels'
import { CONDITION_STEPS, initialWizardStep } from '../lib/conditionsWizard'
import { SCENES } from '../types'

export function ConditionsPage() {
  const navigate = useNavigate()
  const { conditions, setConditions, toggleItem, conditionsReady } = useFlow()
  const [step, setStep] = useState(() => initialWizardStep(conditions))
  const current = CONDITION_STEPS[step - 1]

  return (
    <main className={`page ${step >= 3 ? 'has-sticky' : ''}`}>
      <StepHeader
        step={3}
        title={current.title}
        caption={`필수 ${step}/4 · ${current.caption}`}
        onBack={() => (step === 1 ? navigate('/preview') : setStep(step - 1))}
      />

      <ConditionsWizard
        value={conditions}
        step={step}
        onStepChange={setStep}
        onChange={setConditions}
        onToggleItem={toggleItem}
      >
        <div className="wizard-extras">
          <label className="text-field">
            <span>여행 또는 방문 장소·시기 (선택)</span>
            <input
              value={conditions.destination}
              placeholder="예: 도쿄, 10월"
              onChange={(event) => setConditions({ destination: event.target.value })}
            />
          </label>

          <div>
            <p className="field-label">이후 다시 사용할 장면 (선택)</p>
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
