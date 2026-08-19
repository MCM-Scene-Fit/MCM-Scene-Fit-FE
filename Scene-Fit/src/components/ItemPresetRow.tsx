import { Chip } from './Chip'
import {
  activePresetId,
  ITEM_PRESETS,
  PRESET_KIND_LABEL,
  type PresetKind,
} from '../data/itemPresets'
import type { ItemPresets } from '../types'

type ItemPresetRowProps = {
  kind: PresetKind
  presets: ItemPresets
  onChange: (kind: PresetKind, presetId: string) => void
}

export function ItemPresetRow({ kind, presets, onChange }: ItemPresetRowProps) {
  const current = activePresetId(kind, presets)
  const active = ITEM_PRESETS[kind].find((preset) => preset.id === current)

  return (
    <div className="preset-row">
      <p className="preset-row__label">{PRESET_KIND_LABEL[kind]} 크기</p>
      <div className="chip-row">
        {ITEM_PRESETS[kind].map((preset) => (
          <Chip key={preset.id} on={preset.id === current} onClick={() => onChange(kind, preset.id)}>
            {preset.label}
          </Chip>
        ))}
      </div>
      {active ? <p className="muted preset-row__hint">{active.hint}</p> : null}
    </div>
  )
}
