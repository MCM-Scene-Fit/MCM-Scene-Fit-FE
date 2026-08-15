# Scene Fit Frontend

MCM SCENE FIT의 프론트엔드 앱입니다. 기획·기능 명세는 저장소 루트 [README.md](../README.md)를 참고하세요.

> 현재 단계: **프로젝트 초기 세팅 완료 / 서비스 기능 미구현**

---

## 현재 개발 정도

Vite + React + TypeScript 기본 프로젝트가 구성되어 있으며, 화면은 Vite 공식 스타터 템플릿 그대로입니다. SCENE FIT의 제품 선택, 착용 미리보기, Fit Check, 비교, Store Fit Pass는 아직 없습니다.

| 항목                           | 상태                                |
| ------------------------------ | ----------------------------------- |
| 기술 스택 확정                 | 완료 — React 19, TypeScript, Vite 8 |
| 개발 환경 (dev / build / lint) | 완료                                |
| 라우팅 · 화면 흐름             | 미착수                              |
| 제품 데이터 · UI               | 미착수                              |
| P0 서비스 기능                 | 미착수                              |
| 백엔드 연동                    | 미착수                              |

초기에는 React Native로 시작했으나, 기획의 **모바일 우선 반응형 웹** 방향에 맞춰 Vite + React로 전환했습니다.

---

## 기술 스택

| 구분   | 내용                                                            |
| ------ | --------------------------------------------------------------- |
| UI     | React 19                                                        |
| 언어   | TypeScript                                                      |
| 번들러 | Vite 8                                                          |
| 린트   | ESLint 10 (`typescript-eslint`, `react-hooks`, `react-refresh`) |

아직 도입하지 않은 것: React Router, 상태 관리 라이브러리, CSS 프레임워크, API 클라이언트.

---

## MVP 기능 구현 현황

기획서 P0 기준입니다.

| 기능           | 상태   | 비고                                      |
| -------------- | ------ | ----------------------------------------- |
| 제품 선택      | 미구현 | 가방 목록·필터·카드 UI 없음               |
| 장면·조건 입력 | 미구현 | 장면, 이동량, 소지품, 착용 방식 입력 없음 |
| 착용 미리보기  | 미구현 | 사진 업로드·실루엣·2D 레이어 없음         |
| Scene Fit Card | 미구현 | 결과 화면 없음                            |
| 대안 제품 비교 | 미구현 | 비교 화면 없음                            |
| Store Fit Pass | 미구현 | 매장 체험 요청 화면 없음                  |

P1(추천 진입, 색상 매칭, 수납 시각화, 배경 프리셋, 매장 확인 상태)과 P2(재고 연동, 정교한 가상 착용 등)도 모두 미착수입니다.

---

## 현재 코드 구조

```
Scene-Fit/
├── index.html
├── package.json
├── vite.config.ts
├── eslint.config.js
├── public/
│   └── icons.svg
└── src/
    ├── main.tsx      # React 진입점
    ├── App.tsx       # Vite 기본 카운터 화면
    ├── App.css
    ├── index.css
    └── assets/       # Vite 템플릿 이미지
```

`App.tsx`는 Vite 스타터의 로고·카운터·문서 링크만 렌더링합니다. 서비스 컴포넌트, 페이지, 데이터 레이어는 없습니다.

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

---

## 다음 구현 순서

기획서 14-4절 기준입니다.

1. 제품 10개 데이터 수집과 태그 기준 확정
2. 제품 선택 · 조건 입력 · Fit Check 규칙 구현
3. Scene Fit Card 결과 화면 구현
4. 사진 또는 실루엣 위 2D 제품 미리보기 구현
5. 대안 비교 구현
6. Store Fit Pass 구현
7. 행사 빠른 모드와 지표 수집 구현
