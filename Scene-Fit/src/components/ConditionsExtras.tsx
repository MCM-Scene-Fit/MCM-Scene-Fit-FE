import { Accordion } from './Accordion'
import { Chip } from './Chip'
import { SCENE_LABEL } from '../data/labels'
import { SCENES, type Conditions } from '../types'

type ConditionsExtrasProps = {
  conditions: Conditions
  onChange: (patch: Partial<Conditions>) => void
}

/**
 * 장소/시기(destination)와 재사용 장면. ConditionsPage·RecommendPage 둘 다 씁니다.
 * 여기서 목적지를 넣어야 장면 시각화(배경·AI 인물)가 만들어집니다 — 없으면 안 만듭니다.
 */
export function ConditionsExtras({ conditions, onChange }: ConditionsExtrasProps) {
  const destination = conditions.destination.trim()
  const optionalHint =
    [destination || null, conditions.rewearScene ? SCENE_LABEL[conditions.rewearScene] : null]
      .filter(Boolean)
      .join(' · ') || '장소/시기를 적으면 그 장면으로 착용샷을 만들어 드려요.'

  return (
    <Accordion title="장소·시기 (선택)" hint={optionalHint} defaultOpen>
      <div className="wizard-extras">
        <label className="text-field">
          <span>장소/시기</span>
          <input
            value={conditions.destination}
            placeholder="예: 도쿄, 10월"
            onChange={(event) => onChange({ destination: event.target.value })}
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
                  onChange({ rewearScene: conditions.rewearScene === scene ? null : scene })
                }
              >
                {SCENE_LABEL[scene]}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </Accordion>
  )
}
