import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConditionsExtras } from '../components/ConditionsExtras'
import { ConditionsWizard } from '../components/ConditionsWizard'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import { CONDITION_STEPS, initialWizardStep } from '../lib/conditionsWizard'

export function ConditionsPage() {
  const navigate = useNavigate()
  const { conditions, setConditions, toggleItem, setItemPreset, conditionsReady } = useFlow()
  const [step, setStep] = useState(() => initialWizardStep(conditions))
  const current = CONDITION_STEPS[step - 1]

  return (
    <main className="page has-sticky">
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
        onSetPreset={setItemPreset}
      >
        <ConditionsExtras conditions={conditions} onChange={setConditions} />
      </ConditionsWizard>

      {step === 1 ? (
        <StickyBar>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!conditions.scene}
            onClick={() => setStep(2)}
          >
            다음
          </button>
        </StickyBar>
      ) : null}

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
