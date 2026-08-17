# Scene Fit Frontend

MCM SCENE FIT의 프론트엔드 앱입니다. 기획·기능 명세는 저장소 루트 [README.md](../README.md)를 참고하세요.

> 현재 단계: **P0 핵심 화면 흐름 구현 / 착용 미리보기(온디바이스 자세·비율) 고도화 중**

---

## 현재 개발 정도

제품 선택 → 착용 미리보기 → 조건 입력 → Fit Check 결과 → 비교 → Store Fit Pass까지 **화면 흐름은 연결**되어 있습니다. 착용 미리보기는 공식 제품 PNG 2D 오버레이를 기준으로, 기기 안에서 자세·사람 마스크를 읽어 실제 치수 비율로 가방을 올립니다.

| 항목                           | 상태                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| 기술 스택 확정                 | 완료 — React 19, TypeScript, Vite 8, React Router, Zustand           |
| 개발 환경 (dev / build / lint) | 완료                                                                 |
| 라우팅 · 화면 흐름             | 완료 — 홈·추천·제품·미리보기·조건·결과·비교·Fit Pass                 |
| 제품 데이터 · UI               | 완료 — P0 제품 목업, 필터·카드·색상 스위처                           |
| P0 서비스 기능                 | 대부분 완료 — 미리보기 비율·자세 합성은 계속 다듬는 중               |
| 백엔드 연동                    | 미착수 — 로컬 상태·목업 데이터만 사용                                |

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

백엔드 API·재고 연동·클라우드 생성형 착용은 아직 없습니다. 전신 사진 분석은 **브라우저(기기) 안**에서만 수행합니다.

---

## MVP 기능 구현 현황

기획서 P0 기준입니다.

| 기능           | 상태    | 비고                                                                 |
| -------------- | ------- | -------------------------------------------------------------------- |
| 제품 선택      | 완료    | 착용 방식·색상 필터, 공식 사양 카드, 제품 1개 선택                   |
| 장면·조건 입력 | 완료    | 필수 4개(장면·이동량·소지품·착용) + 선택 2개                         |
| 착용 미리보기  | 진행 중 | 아래 [착용 미리보기 상세](#착용-미리보기-상세) 참고                  |
| Scene Fit Card | 완료    | Scene Match / Carry Check / Rewear, 근거 수준, 대안 1개              |
| 대안 제품 비교 | 완료    | 선택 제품 vs 대안 비교 화면                                          |
| Store Fit Pass | 완료    | 매장·시간·체험 선택 후 데모 상태(`확인 중`)                          |
| 추천 진입      | 완료    | 조건 선입력 후 후보 추천 (보조 흐름)                                 |
| 60초 빠른 체험 | 완료    | 대표 가방·실루엣·여행 조건으로 결과 바로 진입                        |

P1(색상 매칭 고도화, 수납 시각화, 배경 프리셋 등)과 P2(재고 연동, 생성형 가상 착용 등)는 미착수입니다.

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
└── src/
    ├── App.tsx                 # 라우팅
    ├── main.tsx
    ├── index.css
    ├── types/
    ├── data/                   # products, labels
    ├── store/useFlowStore.ts   # Zustand 플로우 상태
    ├── context/FlowContext.tsx
    ├── lib/
    │   ├── fitCheck.ts
    │   ├── productFilters.ts
    │   ├── previewFit.ts       # 비율 환산
    │   ├── bodyAnalysis.ts     # MediaPipe 자세·마스크
    │   └── wearAnchor.ts       # 착용 위치 앵커
    ├── components/
    │   ├── WearPreview.tsx     # 미리보기 스테이지
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
3. Fit Check 문구·대안 추천 품질 다듬기
4. 행사(부스) 빠른 모드 동선·카피 정리
5. (P1) 수납 시각화, 배경 프리셋 등
6. (후속) 백엔드·재고·지표 수집
