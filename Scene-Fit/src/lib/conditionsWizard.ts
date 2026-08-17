import type { Conditions } from '../types'

export const CONDITION_STEPS = [
  {
    id: 1,
    label: '장면',
    title: '어떤 장면에서 쓰나요?',
    caption: '선택하면 다음으로 넘어갑니다.',
  },
  {
    id: 2,
    label: '이동량',
    title: '그날 얼마나 움직이나요?',
    caption: '선택하면 다음으로 넘어갑니다.',
  },
  {
    id: 3,
    label: '소지품',
    title: '가져갈 소지품을 골라 주세요',
    caption: '여러 개 고른 뒤 다음을 눌러 주세요.',
  },
  {
    id: 4,
    label: '착용',
    title: '어떤 착용 방식이 편한가요?',
    caption: '필수 마지막 항목입니다.',
  },
] as const

export function initialWizardStep(conditions: Conditions) {
  if (!conditions.scene) return 1
  if (!conditions.mobility) return 2
  if (!conditions.items.length) return 3
  return 4
}

export function canReachWizardStep(conditions: Conditions, target: number) {
  if (target <= 1) return true
  if (target === 2) return Boolean(conditions.scene)
  if (target === 3) return Boolean(conditions.scene && conditions.mobility)
  return Boolean(conditions.scene && conditions.mobility && conditions.items.length)
}

export function isWizardStepComplete(conditions: Conditions, id: number) {
  if (id === 1) return Boolean(conditions.scene)
  if (id === 2) return Boolean(conditions.mobility)
  if (id === 3) return conditions.items.length > 0
  return Boolean(conditions.wearStyle)
}
