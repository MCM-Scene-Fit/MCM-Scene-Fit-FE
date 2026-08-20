import { useFlow } from '../context/FlowContext'
import { EXPERIENCE_LABEL } from '../data/labels'
import { useCatalogStore } from '../store/useCatalogStore'
import type { FitPassExperience } from '../types'

const EXPERIENCES = Object.keys(EXPERIENCE_LABEL) as FitPassExperience[]

export function FitPassFields() {
  const { fitPass, setFitPass, toggleExperience } = useFlow()
  const stores = useCatalogStore((state) => state.stores)

  return (
    <div className="stack form-grid">
      <label className="text-field">
        <span>희망 매장</span>
        <select
          required
          value={fitPass.storeId}
          onChange={(event) => setFitPass({ storeId: event.target.value })}
        >
          <option value="">매장을 선택하세요</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-field">
        <span>
          방문 희망 시간 <em>선택</em>
        </span>
        <input
          type="datetime-local"
          value={fitPass.visitTime}
          onChange={(event) => setFitPass({ visitTime: event.target.value })}
        />
      </label>

      <fieldset className="span-2 check-fieldset">
        <legend className="field-label">매장에서 받고 싶은 경험</legend>
        <div className="stack tight">
          {EXPERIENCES.map((experience) => {
            const checked = fitPass.experiences.includes(experience)
            return (
              <label key={experience} className={`check-option ${checked ? 'is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleExperience(experience)}
                />
                <span>{EXPERIENCE_LABEL[experience]}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <label className="text-field span-2">
        <span>
          직접 확인하고 싶은 항목 <em>선택</em>
        </span>
        <textarea
          rows={3}
          placeholder="예: 카메라와 물병이 함께 들어가는지, 제 키에서 크로스바디 길이가 맞는지"
          value={fitPass.customNote}
          onChange={(event) => setFitPass({ customNote: event.target.value })}
        />
      </label>
    </div>
  )
}
