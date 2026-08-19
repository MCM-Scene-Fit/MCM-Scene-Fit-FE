# Scene Fit Frontend

MCM SCENE FIT의 프론트엔드 앱입니다. 기획·기능 명세는 저장소 루트 [README.md](../../README.md), 백엔드 계약은 [API.md](./API.md)를 참고하세요.

> 현재 단계: **P0 화면 흐름 완료 / Carry Check 4단계 판정 완료 / 백엔드 연동 전(로컬 목업) / 착용 미리보기 UX 고도화 중**  
> 기준일: 2026-08-18

---

## 현재 개발 정도

제품 선택 → 착용 미리보기 → 조건 입력(위저드) → Fit Check 결과 → 비교 → Store Fit Pass까지 **P0 화면 흐름은 연결**되어 있습니다. Scene Fit Card의 Carry Check는 가방 공식 수납·치수와 소지품 스펙을 대조해 4단계 배지와 수납 지표 점수를 보여 줍니다. 착용 미리보기는 공식 제품 이미지 2D 오버레이를 기준으로, 기기 안에서 자세·사람 마스크를 읽어 실제 치수 비율로 가방을 올립니다. 서버 API는 아직 붙이지 않았고, 제품·Fit Check·Fit Pass는 모두 프론트 로컬에서 동작합니다.

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| 기술 스택 확정 | 완료 | React 19, TypeScript, Vite 8, React Router 7, Zustand |
| 개발 환경 | 완료 | `dev` / `build` / `lint` |
| 라우팅 · 화면 흐름 | 완료 | 홈 · 추천 · 제품 · 미리보기 · 조건 · 결과 · 비교 · Fit Pass |
| 제품 데이터 · UI | 완료 | 공식몰 검수 P0 가방 10개, 착용·색상·가격 필터, 색상 스위처 |
| P0 서비스 기능 | 대부분 완료 | 조건 위저드·Carry Check 4단계·Fit Card·비교·Fit Pass 완료. 미리보기 비율·자세 합성은 다듬는 중 |
| Carry Check Engine | 완료 | 공식 수납 / 치수 85%·100% 임계 / 수납 지표 점수·품목 배지 |
| API 명세 | 완료 | [API.md](./API.md) v1.2 — 프론트 타입과 enum 맞춤 |
| 백엔드 연동 | 미착수 | Zustand + `src/data` 목업만 사용. 세션·Fit Check·Fit Pass API 미연결 |
| P1 / P2 | 미착수 | 수납 **시각화**(배치 그림), 배경 프리셋, 재고 연동, 생성형 착용 등 |

---

## 기술 스택

| 구분     | 내용                                                                      |
| -------- | ------------------------------------------------------------------------- |
| UI       | React 19                                                                  |
| 언어     | TypeScript                                                                |
| 번들러   | Vite 8                                                                    |
| 라우팅   | React Router 7                                                            |
| 상태     | Zustand                                                                   |
| 온디바이스 비전 | `@mediapipe/tasks-vision` (Pose Landmarker + segmentation)           |
| 린트     | ESLint 10 (`typescript-eslint`, `react-hooks`, `react-refresh`)           |

백엔드 구현·재고 연동·클라우드 생성형 착용은 아직 없습니다. API 계약만 [API.md](./API.md)에 정리되어 있습니다. 전신 사진 분석은 **브라우저(기기) 안**에서만 수행합니다.

---

## MVP 기능 구현 현황

기획서 P0 기준입니다.

| 기능 | 상태 | 비고 |
| --- | --- | --- |
| 제품 선택 | 완료 | 착용 방식·색상·가격 필터, 공식 사양 카드, 제품 1개 선택 |
| 장면·조건 입력 | 완료 | 필수 4단계 위저드 + 소지품 카탈로그·카테고리 칩·간이 부피/무게 |
| 착용 미리보기 | 진행 중 | 온디바이스 자세·마스크·비율 합성은 동작. 촬영 가이드·나쁜 사진 경고는 남음 |
| Scene Fit Card | 완료 | Scene Match / Carry Check / Rewear, 수납 지표 점수, 품목별 4단계 배지, 대안 1개 |
| Carry Check Engine | 완료 | 공식 수납 우선, 축 점유율 85%/100% 판정, 점수 평균(100·80·50·0) |
| 대안 제품 비교 | 완료 | 선택 제품 vs 대안을 동일 세 축·수납 점수·4단계 태그·가격으로 비교 |
| Store Fit Pass | 완료 | 매장·시간·체험 선택 후 데모 상태(`확인 중`). 실시간 재고 없음 |
| 추천 진입 | 완료 | 조건 선입력 후 후보 최대 3개 (보조 흐름, P1이지만 화면은 구현됨) |
| 60초 빠른 체험 | 완료 | 대표 가방·실루엣·여행 조건으로 `/result` 바로 진입 |
| 백엔드 API | 명세만 | [API.md](./API.md). 호출 코드 없음 |

P1 나머지(옷 색상 매칭, 수납 **시각화**, 배경 프리셋)와 P2(재고 연동, 생성형 가상 착용 등)는 미착수입니다. 규칙 기반 수납 **판정**은 P0로 완료했고, P1 시각화는 가방 안 배치를 그림으로 보여주는 별도 작업입니다.

---

## Carry Check Engine

`/result` Scene Fit Card — 가방 스펙(공식 수납 품목, 가로/세로/폭)과 선택한 소지품 스펙을 프론트 규칙으로 대조합니다. 서버 호출 없이 `src/lib/itemFit.ts` · `src/lib/fitCheck.ts`에서 동작합니다.

| 단계 | 배지 | 기준 |
| --- | --- | --- |
| 확인됨 (`confirmed`) | 🟢 | `officialStorage`에 해당 품목이 있음. 치수 추측으로 뒤집지 않음 |
| 예상됨 (`estimated`) | 🔵 | 축 정렬 회전 후 가장 빡센 축 점유율 ≤ 85% |
| 매장 확인 필요 (`store-check`) | 🟡 | 점유율 85% 초과 ~ 100% 이하 (입구·셰이프·유연성 경계) |
| 어려움 (`unlikely`) | 🔴 | 점유율 100% 초과 (가방 AABB를 넘김) |

수납 지표 점수는 품목 점수의 평균입니다. 확인됨 100 / 예상됨 80 / 매장 확인 50 / 어려움 0. 소지품이 없으면 점수를 숨깁니다. 결과 카드에는 점수(`/100`)와 품목별 배지·점유율을 붙이고, 비교 화면에도 같은 4단계 태그를 씁니다.

---

## 착용 미리보기 상세

`/preview` — **내 사진 올리기** / **실루엣으로 보기**

### 구현된 것

| 항목 | 내용 |
| --- | --- |
| 입력 전환 | 전신 사진 업로드 ↔ 키·체형 실루엣 아바타 |
| 비율 공식 | `공식 치수 : 내 키 = 화면 가방 : 사진(또는 실루엣) 속 키` |
| 온디바이스 분석 | MediaPipe로 자세·사람 마스크 추출 (사진 서버 미전송) |
| 픽셀 키 | 사람 마스크 위~아래 우선, 없으면 관절(머리~발) 보조 |
| 가방 배치 | 착용 방식별 어깨·손·허리·등(백팩) 앵커 + 드래그 미세 이동 |
| 레이어 합성 | 원본 사진 → (백팩 시 가방) → 사람 컷아웃 → (그 외 가방) |
| 사진 비율 | 업로드 이미지 원본 가로·세로 비율 유지 (`object-fit: contain`) |
| 모드 전환 | 사진/실루엣 가방 크기 분리 저장 — 왕복 시 크기 유지 |
| 안내 | 키 조절 시 가방 비율이 바뀌는 이유 도움말, 매장 확인 디스클레이머 |

### 의도적으로 하지 않는 것

- 생성형 AI로 나를 다시 그리거나 가방을 재생성하는 것 (로고·패턴 왜곡·개인정보 리스크)
- 사진만으로 실제 cm 키를 추정하는 것 (거리·화각 불명 → 사용자가 **내 키** 입력)

### 남은 개선 후보

1. 전신 촬영 가이드(머리~발, 서서, 프레임 채우기)
2. 반신·앉은 자세 등 나쁜 사진 경고
3. 비율이 어색할 때만 쓰는 선택적 미세 조절(±)

---

## 화면 흐름

```
홈
 ├─ 궁금한 가방이 있어요 → /products → /preview → /conditions → /result → /compare → /fit-pass
 ├─ 어떤 가방이 맞을지 모르겠어요 → /recommend → (제품 선택 후 동일)
 └─ 60초 빠른 체험 → /result (데모 데이터)
```

| 경로 | 화면 |
| --- | --- |
| `/` | 홈·진입 |
| `/products` | 제품 선택 |
| `/preview` | 2D 착용 미리보기 |
| `/conditions` | 장면·조건 입력 |
| `/result` | Scene Fit Card |
| `/compare` | 대안 비교 |
| `/fit-pass` | Store Fit Pass |
| `/fit-pass/done` | 요청 완료 |
| `/recommend` | 조건 기반 추천 |

---

## 현재 코드 구조

```
Scene-Fit/
├── package.json
├── vite.config.ts
├── public/
│   ├── items/                  # 소지품 단색 라인 SVG
│   └── products/
├── docs/
│   ├── README.md               # 프론트 개발 현황
│   └── API.md                  # 백엔드 계약
└── src/
    ├── App.tsx                 # 라우팅
    ├── main.tsx
    ├── index.css
    ├── types/
    ├── data/                   # products, items, labels
    ├── store/useFlowStore.ts   # Zustand 플로우 상태
    ├── context/FlowContext.tsx
    ├── lib/
    │   ├── fitCheck.ts         # 규칙 기반 Scene Fit (Carry 점수·4단계 문장)
    │   ├── productFilters.ts
    │   ├── conditionsWizard.ts # 필수 4단계 위저드
    │   ├── itemFit.ts          # 점유율·공식 수납 대조, 4단계 판정
    │   ├── previewFit.ts       # 비율 환산
    │   ├── bodyAnalysis.ts     # MediaPipe 자세·마스크
    │   └── wearAnchor.ts       # 착용 위치 앵커
    ├── components/
    │   ├── WearPreview.tsx     # 미리보기 스테이지
    │   ├── ConditionsWizard.tsx
    │   ├── ChoiceCard.tsx
    │   ├── Chip.tsx
    │   ├── ItemLoadSummary.tsx
    │   ├── ProductCard.tsx
    │   ├── ProductFilters.tsx
    │   ├── ProductImage.tsx
    │   ├── AppShell.tsx
    │   └── StepHeader.tsx
    └── pages/
        ├── HomePage.tsx
        ├── ProductsPage.tsx
        ├── PreviewPage.tsx
        ├── ConditionsPage.tsx
        ├── ResultPage.tsx
        ├── ComparePage.tsx
        ├── FitPassPage.tsx
        ├── FitPassDonePage.tsx
        └── RecommendPage.tsx
```

---

## 시작하기

```bash
npm install
npm run dev
```

| 명령              | 설명               |
| ----------------- | ------------------ |
| `npm run dev`     | 개발 서버 실행     |
| `npm run build`   | 프로덕션 빌드      |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint`    | ESLint 검사        |

착용 미리보기 첫 분석 시 MediaPipe 모델·WASM을 CDN에서 받습니다. **인터넷 연결**이 필요하며, 추론 자체는 기기에서 실행됩니다.

---

## 다음 구현 순서

1. 착용 미리보기 UX 보강 — 전신 촬영 가이드, 나쁜 사진 경고
2. 제품 로컬 이미지·데이터 검수 마무리
3. 대안 추천 품질·Fit Check 카피 다듬기
4. 행사(부스) 빠른 모드 동선·카피 정리
5. (후속) [API.md](./API.md) 기준 백엔드 연동 — 지금은 로컬 목업
6. (P1) 수납 시각화(배치 그림), 배경 프리셋 등
7. (P2) 실시간 재고·생성형 착용은 범위 밖
