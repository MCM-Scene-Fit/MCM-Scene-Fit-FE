import type {
  EvidenceLevel,
  FitPassExperience,
  ItemId,
  Mobility,
  Scene,
  WearStyle,
} from '../types'

export const SCENE_LABEL: Record<Scene, string> = {
  travel: '여행',
  work: '출근',
  culture: '전시·문화생활',
  meetup: '약속·모임',
  daily: '데일리',
}

export const MOBILITY_LABEL: Record<Mobility, string> = {
  indoor: '실내 중심',
  'light-walk': '가벼운 도보',
  'long-walk': '오래 걷기',
}

export const WEAR_LABEL: Record<WearStyle, string> = {
  tote: '토트',
  shoulder: '숄더',
  crossbody: '크로스바디',
  backpack: '백팩',
}

export const ITEM_LABEL: Record<ItemId, string> = {
  phone: '휴대전화',
  wallet: '지갑',
  pouch: '파우치',
  tablet: '태블릿',
  laptop13: '13인치 노트북',
  camera: '소형 카메라',
  bottle: '350mL 물병',
}

export const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  confirmed: '확인됨',
  estimated: '예상됨',
  'store-check': '매장 확인 필요',
  unlikely: '어려움',
}

export const EXPERIENCE_LABEL: Record<FitPassExperience, string> = {
  'fit-ratio': '실제 착용 비율과 스트랩 길이 확인',
  'storage-test': '가져갈 소지품 수납 테스트',
  styling: '내 옷과 어울리는 스타일링 제안',
  'color-compare': '다른 색상과 대안 제품 비교',
  care: '제품 관리와 오래 사용하는 방법 상담',
}

export const STORES = [
  { id: 'hyundai-pangyo', name: '현대백화점 판교' },
  { id: 'shinsegae-gangnam', name: '신세계백화점 강남' },
  { id: 'lotte-bon', name: '롯데백화점 본점' },
  { id: 'mcm-cheongdam', name: 'MCM 청담 플래그십' },
] as const

export const SILHOUETTES = [
  { id: 's160', label: '키 160cm 전후', hint: '슬림 실루엣' },
  { id: 's165', label: '키 165cm 전후', hint: '스탠다드 실루엣' },
  { id: 's170', label: '키 170cm 전후', hint: '롱 실루엣' },
] as const

export function formatPrice(price: number) {
  return `₩${price.toLocaleString('ko-KR')}`
}
