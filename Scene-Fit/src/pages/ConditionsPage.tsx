import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import {
  ITEM_LABEL,
  MOBILITY_LABEL,
  SCENE_LABEL,
  WEAR_LABEL,
} from '../data/labels'
import { ITEMS, MOBILITY, SCENES, WEAR_STYLES, type ItemId } from '../types'

export function ConditionsPage() {
  const navigate = useNavigate()
  const { conditions, setConditions, toggleItem, conditionsReady } = useFlow()

  return (
    <main className="page has-sticky">
      <StepHeader
        step={3}
        title="사용할 장면과 조건을 알려 주세요"
        caption="필수 4개만 있으면 Fit Check를 할 수 있습니다."
        backTo="/preview"
      />

      <section className="stack form-grid">
        <Field label="장면" required>
          {SCENES.map((scene) => (
            <Chip
              key={scene}
              on={conditions.scene === scene}
              onClick={() => setConditions({ scene })}
            >
              {SCENE_LABEL[scene]}
            </Chip>
          ))}
        </Field>

        <Field label="이동량" required>
          {MOBILITY.map((mobility) => (
            <Chip
              key={mobility}
              on={conditions.mobility === mobility}
              onClick={() => setConditions({ mobility })}
            >
              {MOBILITY_LABEL[mobility]}
            </Chip>
          ))}
        </Field>

        <Field label="소지품" required wide>
          {ITEMS.map((item: ItemId) => (
            <Chip key={item} on={conditions.items.includes(item)} onClick={() => toggleItem(item)}>
              {ITEM_LABEL[item]}
            </Chip>
          ))}
        </Field>

        <Field label="선호 착용 방식" required>
          {WEAR_STYLES.map((wear) => (
            <Chip
              key={wear}
              on={conditions.wearStyle === wear}
              onClick={() => setConditions({ wearStyle: wear })}
            >
              {WEAR_LABEL[wear]}
            </Chip>
          ))}
        </Field>

        <label className="text-field span-2">
          <span>여행 또는 방문 장소·시기 (선택)</span>
          <input
            value={conditions.destination}
            placeholder="예: 도쿄, 10월"
            onChange={(event) => setConditions({ destination: event.target.value })}
          />
        </label>

        <Field label="이후 다시 사용할 장면 (선택)" wide>
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
        </Field>
      </section>

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
    </main>
  )
}

function Field({
  label,
  required,
  wide,
  children,
}: {
  label: string
  required?: boolean
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={wide ? 'span-2' : undefined}>
      <p className="field-label">
        {label}
        {required ? <em>필수</em> : null}
      </p>
      <div className="chip-row">{children}</div>
    </div>
  )
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" className={`chip ${on ? 'is-on' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}
