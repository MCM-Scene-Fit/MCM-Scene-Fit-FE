# MCM SCENE FIT API v1.0

프론트엔드(`Scene-Fit/`)와 백엔드가 공유하는 계약서입니다. 기획서 MVP 범위인 **제품 선택 → 조건 검증 → 대안 비교 → Store Fit Pass**를 서버에서 지원하기 위한 명세입니다.

현재 프론트는 로컬 목업과 Zustand로 동일 흐름을 이미 구현했습니다. 필드명·enum 값은 [`../src/types/index.ts`](../src/types/index.ts)와 맞춥니다.

| 항목 | 내용 |
| --- | --- |
| Base URL | `https://{host}/v1` |
| 형식 | JSON, UTF-8 |
| 필드명 | camelCase |
| 인증 | MVP는 비회원 세션. 로그인 없음 |
| 시간 | ISO 8601 (`2026-10-12T14:00:00+09:00`) |
| 금액 | KRW 정수 (원) |
| 치수 | mm 정수 |

---

## 0. 설계 원칙

기획서 9절·14절을 서버 규칙으로 고정합니다.

1. **사실과 설명을 분리한다.** 수납·착용·크기 판정은 규칙 엔진이 하고, AI는 그 결과를 문장으로만 정리한다.
2. **공식 정보가 없으면 확정하지 않는다.** 감점보다 `store-check`(매장 확인 필요)로 표시한다.
3. **외부 치수로 내부 용량을 계산하지 않는다.** `90% 찼다` 같은 표현을 만들지 않는다.
4. **실시간 재고를 확정 표시하지 않는다.** Fit Pass는 `재고 및 체험 가능 여부 확인 요청`이다.
5. **생성형 착용 이미지를 만들지 않는다.** 제품 PNG는 공식 이미지를 그대로 제공한다. 사진 위 배치·자세 분석은 브라우저(온디바이스)에서 수행한다.
6. **총점 하나로 순위를 고정하지 않는다.** Fit Check 응답은 Scene Match / Carry Check / Rewear Potential 세 축이다.

### 온디바이스 vs 서버

| 처리 | 위치 | 이유 |
| --- | --- | --- |
| 전신 사진 자세·마스크 분석 | 브라우저 (MediaPipe) | 민감정보 미전송, 생성형 왜곡 없음 |
| 가방 2D 레이어 크기·위치 | 브라우저 | 공식 치수 : 사용자 키 비율 |
| 제품·태그·수납 판정 | 서버 | 공식 데이터와 규칙의 단일 출처 |
| AI 설명·Fit Pass 질문 정리 | 서버 | 규칙 결과를 사람이 읽기 쉽게 변환 |
| 사진 임시 저장 | 서버 (선택) | 세션 복원용. 기본은 즉시 삭제 가능 |

---

## 1. 공통

### 1-1. 성공 응답

단건:

```json
{
  "data": {}
}
```

목록:

```json
{
  "data": [],
  "meta": {
    "count": 10
  }
}
```

MVP 제품 수는 10~15개라 페이지네이션은 두지 않습니다.

### 1-2. 실패 응답

HTTP 상태 코드와 함께 아래 본문을 반환합니다.

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "제품을 찾을 수 없습니다.",
    "details": {
      "productId": "unknown-bag"
    }
  }
}
```

| HTTP | code | 언제 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 필수 필드 누락, enum 불일치 |
| 404 | `PRODUCT_NOT_FOUND` | 제품 ID 없음 |
| 404 | `FIT_PASS_NOT_FOUND` | Fit Pass ID 없음 |
| 404 | `SESSION_NOT_FOUND` | 세션 없음 또는 만료 |
| 409 | `CONDITIONS_INCOMPLETE` | 필수 조건 4개가 채워지기 전 Fit Check 요청 |
| 413 | `IMAGE_TOO_LARGE` | 업로드 용량 초과 |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | jpeg/png/webp 외 |
| 429 | `RATE_LIMITED` | AI 설명 과다 호출 |
| 501 | `NOT_IMPLEMENTED` | 재고 확정 등 MVP 비범위 요청 |

`message`는 사용자에게 보여도 되는 한국어 문장으로 둡니다.

### 1-3. 세션

로그인 없이 브라우저가 `X-Session-Id` 헤더를 보냅니다. 없으면 서버가 새 세션을 만들고 응답 헤더 `X-Session-Id`로 돌려줍니다.

- 세션 TTL: 24시간
- 저장 내용: 선택 제품·색상, 조건, Fit Check 결과 캐시, Fit Pass ID
- 전신 사진은 기본 저장하지 않음. 업로드 API를 쓴 경우에만 object key를 임시 보관

### 1-4. 공통 enum

프론트 `src/types/index.ts`와 동일합니다.

| 이름 | 값 | 화면 라벨 |
| --- | --- | --- |
| `Scene` | `travel` `work` `culture` `meetup` `daily` | 여행 / 출근 / 전시·문화생활 / 약속·모임 / 데일리 |
| `Mobility` | `indoor` `light-walk` `long-walk` | 실내 중심 / 가벼운 도보 / 오래 걷기 |
| `WearStyle` | `tote` `shoulder` `crossbody` `backpack` | 토트 / 숄더 / 크로스바디 / 백팩 |
| `ItemId` | `phone` `wallet` `pouch` `tablet` `laptop13` `camera` `bottle` | 휴대전화 / 지갑 / 파우치 / 태블릿 / 13인치 노트북 / 소형 카메라 / 350mL 물병 |
| `EvidenceLevel` | `confirmed` `estimated` `store-check` `unlikely` | 확인됨 / 예상됨 / 매장 확인 필요 / 어려움 |
| `AxisStatus` | `match` `check` `weak` | 맞음 / 확인 필요 / 약함 |
| `FitPassExperience` | `fit-ratio` `storage-test` `styling` `color-compare` `care` | 아래 체험 선택지 |
| `FitPassStatus` | `requested` `checking` `confirmed` | 요청 접수 / 확인 중 / 확인 완료(데모) |
| `BodyBuild` | `slim` `standard` `broad` | 슬림 / 스탠다드 / 볼륨 |

체험 선택지 라벨:

- `fit-ratio` — 실제 착용 비율과 스트랩 길이 확인
- `storage-test` — 가져갈 소지품 수납 테스트
- `styling` — 내 옷과 어울리는 스타일링 제안
- `color-compare` — 다른 색상과 대안 제품 비교
- `care` — 제품 관리와 오래 사용하는 방법 상담

데모 매장 ID:

| id | name |
| --- | --- |
| `hyundai-pangyo` | 현대백화점 판교 |
| `shinsegae-gangnam` | 신세계백화점 강남 |
| `lotte-bon` | 롯데백화점 본점 |
| `mcm-cheongdam` | MCM 청담 플래그십 |

---

## 2. 엔드포인트 목록

| 우선순위 | Method | Path | 설명 |
| --- | --- | --- | --- |
| P0 | `GET` | `/products` | 제품 목록·필터 |
| P0 | `GET` | `/products/{productId}` | 제품 상세 |
| P0 | `GET` | `/stores` | 데모 매장 목록 |
| P0 | `POST` | `/sessions` | 세션 생성 |
| P0 | `GET` | `/sessions/me` | 현재 세션 조회 |
| P0 | `PATCH` | `/sessions/me` | 선택·조건 저장 |
| P0 | `DELETE` | `/sessions/me` | 세션·임시 이미지 삭제 |
| P0 | `POST` | `/fit-check` | 규칙 기반 Scene Fit |
| P0 | `POST` | `/fit-check/compare` | 선택 제품 vs 대안 비교 |
| P0 | `POST` | `/fit-passes` | Store Fit Pass 요청 접수 |
| P0 | `GET` | `/fit-passes/{fitPassId}` | Fit Pass 조회 |
| P0 | `POST` | `/ai/explain` | 규칙 결과 → 설명 문장 |
| P1 | `POST` | `/recommend` | 조건 기반 후보 3개 |
| P1 | `POST` | `/ai/parse-conditions` | 자연어 → 구조화 조건 |
| P1 | `GET` | `/weather` | 목적지·시기 참고 날씨 |
| P1 | `POST` | `/uploads` | 전신 사진 임시 업로드 |
| P1 | `DELETE` | `/uploads/{uploadId}` | 즉시 삭제 |
| — | — | 재고 확정, 생성형 착용, Street View | **제공하지 않음** |

---

## 3. 스키마

### 3-1. Product

```ts
type ProductColor = {
  id: string          // cognac | black | cream | pink ...
  name: string        // Cognac
  hex: string         // #9A6546
  sku: string         // MYZGATA01CO001
  image: string       // 공식 정면 이미지 URL (투명 배경 우선)
  imageWidth: number
  imageHeight: number
}

type Product = {
  id: string
  name: string
  sku: string
  category: string    // 크로스바디 | 숄더 | 토트 | 백팩 | 위켄더
  colors: ProductColor[]
  price: number
  officialUrl: string
  widthMm: number
  heightMm: number
  depthMm: number
  sizeLabel: string   // Mini | S | M | XL | 41cm ...
  wearStyles: WearStyle[]
  strapAdjustable: boolean
  officialStorage: ItemId[]   // 공식 페이지에 명시된 품목만
  likelyStorage: ItemId[]     // 치수상 가능성. 확정 아님
  pockets: number
  material: string
  sceneTags: Scene[]
  mood: string[]
  rewearTags: Scene[]
  weightG?: number            // 공식 무게가 있을 때만. 없으면 이동 적합도 판단 안 함
  careNotes?: string
  evidence: {
    sourceUrl: string
    verifiedAt: string        // YYYY-MM-DD
    officialConfirmed: boolean
  }
}
```

규칙:

- `officialStorage`에는 공식 상세에 **해당 품목 수납이 명시된 경우만** 넣습니다.
- 외부 부피를 수납 용량으로 환산한 필드를 두지 않습니다.
- 이미지는 공식 컷 URL입니다. 서버가 제품을 다시 그리지 않습니다.

### 3-2. Conditions

```ts
type Conditions = {
  scene: Scene                 // 필수
  mobility: Mobility           // 필수
  items: ItemId[]              // 필수, 1개 이상
  wearStyle: WearStyle         // 필수
  destination?: string         // 선택. 예: "도쿄, 10월"
  rewearScene?: Scene          // 선택. 없으면 서버가 daily로 참고
}
```

Fit Check 요청 시 필수 4개(`scene`, `mobility`, `items`, `wearStyle`)가 없으면 `409 CONDITIONS_INCOMPLETE`입니다.

### 3-3. FitResult

```ts
type ItemVerdict = {
  item: ItemId
  level: EvidenceLevel
  message: string
}

type Axis = {
  headline: string
  detail?: string
  positive?: boolean
  status: AxisStatus
}

type FitResult = {
  productId: string
  sceneMatch: Axis
  carryCheck: {
    headline: string
    items: ItemVerdict[]
    status: AxisStatus
  }
  rewearPotential: Axis
  matches: string[]        // 잘 맞는 점, 최대 3
  mismatches: string[]     // 잘 맞지 않는 점, 최대 3
  storeChecks: string[]    // 매장 확인 항목, 최대 3
  alternativeId: string | null
  allConditionsMet: boolean
}
```

`allConditionsMet`이 `false`이면 화면 카피는 다음을 사용합니다.

> 현재 선택한 조건을 모두 만족하는 제품을 찾지 못했습니다.

대표 제품을 근거 없이 추천하지 않습니다. `alternativeId`는 조건 점수가 양수인 경우에만 채웁니다.

---

## 4. 제품

### `GET /v1/products`

제품 선택 화면용 목록입니다.

Query:

| 이름 | 값 | 기본 |
| --- | --- | --- |
| `wear` | `all` 또는 `WearStyle` | `all` |
| `color` | `all` `cognac` `black` `cream` `pink` | `all` |
| `price` | `all` `under-100` `100-130` `over-130` | `all` |

가격 구간은 프론트 필터와 동일합니다.

- `under-100`: 0 ~ 999,999
- `100-130`: 1,000,000 ~ 1,300,000
- `over-130`: 1,300,001 이상

응답:

```json
{
  "data": [
    {
      "id": "aren-mini-pouch",
      "name": "Aren 비세토스 크로스바디 파우치",
      "sku": "MYZGATA01CO001",
      "category": "크로스바디",
      "price": 690000,
      "sizeLabel": "Mini",
      "wearStyles": ["crossbody"],
      "colors": [
        {
          "id": "cognac",
          "name": "Cognac",
          "hex": "#9A6546",
          "sku": "MYZGATA01CO001",
          "image": "https://cdn.example/products/MYZGATA01CO001.webp",
          "imageWidth": 720,
          "imageHeight": 373
        }
      ]
    }
  ],
  "meta": { "count": 10 }
}
```

목록은 카드 렌더에 필요한 요약 필드만 내려도 됩니다. 상세 사양은 `GET /products/{id}`에 둡니다. 해커톤에서는 목록·상세 모두 전체 `Product`를 내려도 무방합니다.

### `GET /v1/products/{productId}`

없는 ID면 `404 PRODUCT_NOT_FOUND`.

---

## 5. 세션

### `POST /v1/sessions`

빈 세션을 만듭니다.

응답 `201`:

```json
{
  "data": {
    "sessionId": "ses_01J...",
    "expiresAt": "2026-08-18T20:00:00+09:00",
    "selectedProductId": null,
    "selectedColorId": null,
    "conditions": null,
    "fitPassId": null
  }
}
```

### `GET /v1/sessions/me`

`X-Session-Id` 필수.

### `PATCH /v1/sessions/me`

부분 갱신입니다. 보낸 필드만 덮어씁니다.

```json
{
  "selectedProductId": "aren-nova-crossbody",
  "selectedColorId": "black",
  "conditions": {
    "scene": "travel",
    "mobility": "light-walk",
    "items": ["phone", "wallet", "camera"],
    "wearStyle": "crossbody",
    "destination": "도쿄, 10월",
    "rewearScene": "daily"
  }
}
```

사진은 이 API로 받지 않습니다. 바이너리는 `/uploads`만 사용합니다.

### `DELETE /v1/sessions/me`

세션과 연결된 임시 이미지를 삭제합니다. 응답 `204`.

---

## 6. Fit Check (규칙 엔진)

AI가 아니라 **서버 규칙**입니다. 프론트 `src/lib/fitCheck.ts`와 같은 판정을 서버가 단일 출처로 제공합니다.

### `POST /v1/fit-check`

```json
{
  "productId": "aren-nova-crossbody",
  "conditions": {
    "scene": "travel",
    "mobility": "light-walk",
    "items": ["phone", "wallet", "camera"],
    "wearStyle": "crossbody",
    "destination": "도쿄, 10월",
    "rewearScene": "daily"
  }
}
```

응답 `200`:

```json
{
  "data": {
    "productId": "aren-nova-crossbody",
    "sceneMatch": {
      "headline": "여행 장면과 잘 어울림",
      "detail": "제품 스타일 태그가 선택한 장면과 맞습니다.",
      "positive": true,
      "status": "match"
    },
    "carryCheck": {
      "headline": "휴대전화·지갑은 확인됨 / 소형 카메라는 확인 필요",
      "status": "check",
      "items": [
        {
          "item": "phone",
          "level": "estimated",
          "message": "크기상 가능성이 있으나 실제 배치는 달라질 수 있습니다."
        },
        {
          "item": "camera",
          "level": "store-check",
          "message": "소형 카메라 수납은 매장에서 확인해 주세요."
        }
      ]
    },
    "rewearPotential": {
      "headline": "데일리에 반복 활용 가능",
      "detail": "특별한 일정 이후에도 같은 제품 태그가 이어집니다.",
      "positive": true,
      "status": "match"
    },
    "matches": [
      "여행 장면에 맞는 스타일 태그를 가지고 있습니다.",
      "크로스바디 착용이 가능합니다."
    ],
    "mismatches": [],
    "storeChecks": [
      "소형 카메라 수납은 매장에서 확인해 주세요."
    ],
    "alternativeId": "aren-mini-pouch",
    "allConditionsMet": false
  }
}
```

### 6-1. 수납 판정

품목마다 하나만 부여합니다. 동시 수납은 공식 근거가 없으면 확정하지 않습니다.

| level | 기준 | message 예시 |
| --- | --- | --- |
| `confirmed` | `officialStorage`에 해당 품목이 있음 | `13인치 노트북 수납이 공식 확인되었습니다.` |
| `unlikely` | 명백히 불가. MVP는 `laptop13`이고 `widthMm < 320` | `선택한 노트북 크기보다 가방 폭이 작습니다.` |
| `estimated` | `likelyStorage`에 있음 | `크기상 가능성이 있으나 실제 배치는 달라질 수 있습니다.` |
| `store-check` | 그 외 | `{품목} 수납은 매장에서 확인해 주세요.` |

`confirmed`보다 `unlikely`를 먼저 보지 않습니다. 공식 수납이 있으면 치수 추측으로 뒤집지 않습니다.

### 6-2. 세 축 계산

1. **필수 조건:** 착용 방식이 제품 `wearStyles`에 있는지, 수납 `unlikely`가 있는지
2. **Scene Match:** `conditions.scene` ∈ `product.sceneTags` 이면 `match`, 아니면 `weak`. 장면 미선택이면 요청 자체를 거절
3. **Carry Check:**
   - `unlikely` 또는 착용 방식 불일치 → `weak`
   - 모든 품목 `confirmed`이고 착용 가능 → `match`
   - 그 외 → `check`
4. **이동 적합도:** `mobility === long-walk`일 때만 참고
   - 토트만 가능하고 크로스바디·백팩이 없으면 mismatch
   - `weightG >= 850`이면 store-check. **공식 무게가 없으면 무게 판단을 하지 않음**
5. **Rewear Potential:** `rewearScene`(없으면 `daily`) ∈ `rewearTags` 이면 `match`, 아니면 `weak`
6. **대안:** 선택 제품을 제외하고 착용(+4) · 장면(+3) · 공식 수납 품목 수(+1) · 착용 불일치(-5) · 노트북 폭 부족(-4). 최고점 `> 0`일 때만 `alternativeId`

방수·내구성·기후 적합성은 `careNotes` 등 **공식 관리 정보가 있을 때만** 문장에 넣을 수 있습니다. 없으면 침묵합니다.

### `POST /v1/fit-check/compare`

```json
{
  "productId": "aren-nova-crossbody",
  "alternativeId": "stark-backpack-m",
  "conditions": { }
}
```

`alternativeId`를 생략하면 서버가 Fit Check와 같은 규칙으로 대안 1개를 고릅니다. 대안이 없으면:

```json
{
  "data": {
    "selected": { },
    "alternative": null,
    "message": "현재 선택한 조건을 모두 만족하는 제품을 찾지 못했습니다."
  }
}
```

대안이 있으면 `selected`와 `alternative` 모두 `FitResult`입니다. 화면은 크기·세 축·확인 항목·가격·공식 URL을 같은 표로 보여 줍니다.

---

## 7. 추천 (P1, 보조 진입)

기본 진입은 제품 선택입니다. 이 API는 `어떤 가방이 맞을지 모르겠어요` 흐름 전용입니다.

### `POST /v1/recommend`

요청 body는 `Conditions`와 같습니다. 필수 4개 필요.

응답:

```json
{
  "data": {
    "candidates": [
      {
        "productId": "stark-backpack-m",
        "fit": { }
      }
    ],
    "emptyReason": null
  }
}
```

규칙:

- 최대 **3개**
- 총점으로 한 명을 대표 추천하지 않음. 후보는 FitResult를 함께 내려 세 축을 보여 줌
- 점수 양수인 제품만. 0이하면 `candidates: []`
- `emptyReason` 예시: `"현재 선택한 조건을 모두 만족하는 제품을 찾지 못했습니다."`
- 빈 목록일 때 바꿀 수 있는 조건 힌트와 `storeChecks`를 함께 제공할 수 있음

점수 참고 (프론트 `RecommendPage`와 맞춤):

```
+3  sceneMatch.positive
+1  품목 confirmed 개수
+1  rewearPotential.positive
-4  품목 unlikely 개수
-6  착용 방식 불일치
```

---

## 8. AI

규칙 결과를 **설명**만 합니다. 수납 가능 여부, 방수, 재고, 제품 외형을 새로 만들지 않습니다.

시스템 제약 (프롬프트에 고정):

- 입력으로 받은 `FitResult`의 `level`을 바꾸지 말 것
- `confirmed`가 아닌 항목을 가능한 것처럼 단정하지 말 것
- 공식 정보에 없는 소재 성능을 주장하지 말 것
- 재고·예약 확정을 말하지 말 것
- 출력은 지정 JSON 스키마만

### `POST /v1/ai/explain`

Scene Fit Card·비교 화면 카피용입니다.

```json
{
  "productId": "aren-nova-crossbody",
  "conditions": { },
  "fit": { }
}
```

`fit`을 생략하면 서버가 먼저 규칙 Fit Check를 돌린 뒤 그 결과만 설명합니다. 클라이언트가 `fit`을 보내면 그 판정을 사실로 취급하고 문장만 생성합니다.

응답:

```json
{
  "data": {
    "matches": ["여행 장면에 맞는 스타일 태그를 가지고 있습니다."],
    "mismatches": [],
    "storeChecks": ["소형 카메라와 물병을 함께 넣을 수 있는지는 매장에서 확인해 주세요."],
    "storeQuestions": [
      "이 가방에 소형 카메라가 들어가는지 확인하고 싶어요.",
      "제 키에서 크로스바디 스트랩 길이가 맞는지 보고 싶어요."
    ]
  }
}
```

`storeQuestions`는 Fit Pass에 자동으로 넣을 매장 확인 질문입니다. 사용자 `customNote`가 있으면 그것을 우선하고, AI 질문은 보완으로만 붙입니다.

### `POST /v1/ai/parse-conditions` (P1)

사용자가 목적지를 문장으로 적은 경우입니다. 날씨 문항을 사용자에게 묻지 않고, 장소·시기만 구조화합니다.

```json
{
  "text": "10월 도쿄 여행, 카메랑이랑 보조배터리 들고 오래 걸을 예정"
}
```

응답:

```json
{
  "data": {
    "scene": "travel",
    "mobility": "long-walk",
    "items": ["phone", "wallet", "camera"],
    "destination": "도쿄, 10월",
    "rewearScene": null,
    "confidence": 0.74,
    "unparsed": ["보조배터리는 소지품 목록에 없어 반영하지 않음"]
  }
}
```

없는 enum으로 추측해 채우지 않습니다. 확신이 낮으면 `null`과 `unparsed`로 돌려 사용자가 직접 고르게 합니다.

---

## 9. Store Fit Pass

실제 예약 확정·재고 차감은 하지 않습니다. 데모에서는 생성 직후 `checking`으로 두고, 조회 시 예시 상태만 보여 줍니다.

### `POST /v1/fit-passes`

```json
{
  "productId": "aren-nova-crossbody",
  "colorId": "black",
  "alternativeId": "stark-backpack-m",
  "storeId": "mcm-cheongdam",
  "visitTime": "2026-08-20T15:00:00+09:00",
  "experiences": ["fit-ratio", "storage-test"],
  "customNote": "카메라와 물병이 함께 들어가는지, 제 키에서 크로스바디 길이가 맞는지",
  "conditions": { }
}
```

검증:

- `productId`, `storeId`, `experiences`(1개 이상) 필수
- `visitTime`은 비워도 됨. 비우면 응답에 `visitTimeStatus: "reschedule"`
- 서버는 같은 조건으로 Fit Check를 다시 돌려 `matches` / `storeChecks` / `storeQuestions`를 Fit Pass에 스냅샷으로 저장합니다. 이후 제품 태그가 바뀌어도 요청 당시 내용이 유지됩니다.

응답 `201`:

```json
{
  "data": {
    "id": "fp_01J...",
    "status": "checking",
    "demo": true,
    "disclaimer": "실시간 재고를 확정하지 않습니다. 재고 및 체험 가능 여부 확인 요청만 접수했습니다.",
    "productId": "aren-nova-crossbody",
    "colorId": "black",
    "alternativeId": "stark-backpack-m",
    "store": {
      "id": "mcm-cheongdam",
      "name": "MCM 청담 플래그십"
    },
    "visitTime": "2026-08-20T15:00:00+09:00",
    "experiences": ["fit-ratio", "storage-test"],
    "customNote": "카메라와 물병이 함께 들어가는지, 제 키에서 크로스바디 길이가 맞는지",
    "snapshot": {
      "matches": [],
      "storeChecks": [],
      "storeQuestions": []
    },
    "createdAt": "2026-08-17T20:10:00+09:00"
  }
}
```

`demo: true`는 항상 포함합니다. 클라이언트가 재고 확정처럼 보이지 않게 하는 표시입니다.

허용 status (MVP):

| status | 의미 | 재고 의미 |
| --- | --- | --- |
| `requested` | 요청 접수 | 없음 |
| `checking` | 확인 중 (데모 기본값) | 없음 |
| `confirmed` | 확인 완료 예시 | **재고 있음을 뜻하지 않음** |

`in_stock` / `available_now` 같은 필드를 만들지 않습니다.

### `GET /v1/fit-passes/{fitPassId}`

고객용 조회입니다. 직원 화면은 MVP 범위 밖입니다.

해커톤 데모에서는 생성 후 N초가 지나면 `checking` → `confirmed`로 바꿔 보여도 됩니다. 응답에 `demo: true`와 disclaimer를 유지합니다.

---

## 10. 매장 · 날씨 · 업로드

### `GET /v1/stores`

```json
{
  "data": [
    { "id": "hyundai-pangyo", "name": "현대백화점 판교" }
  ]
}
```

실시간 영업시간·재고는 없습니다.

### `GET /v1/weather` (P1)

Query: `destination`, `period` (예: `도쿄`, `2026-10`).

소재 방수·기후 적합성을 확정하지 않습니다. Fit Check에 자동 반영하지 말고, 참고 문구만 반환합니다.

```json
{
  "data": {
    "summary": "10월 도쿄는 선선하고 비가 올 수 있습니다.",
    "usableForMaterialJudgement": false
  }
}
```

공식 관리 정보가 없는 한 `usableForMaterialJudgement`는 `false`입니다.

### `POST /v1/uploads` (P1)

`multipart/form-data`, 필드명 `file`.

- 허용: `image/jpeg` `image/png` `image/webp`
- 최대 8MB
- TTL 1시간. 세션 삭제 또는 `DELETE` 시 즉시 제거
- 서버는 사람 분석·생성형 편집을 하지 않음. object URL만 반환
- 기본 권장: 프론트가 온디바이스 분석 후 업로드하지 않음

```json
{
  "data": {
    "uploadId": "upl_01J...",
    "url": "https://cdn.example/tmp/upl_01J.jpg",
    "expiresAt": "2026-08-17T21:10:00+09:00"
  }
}
```

### `DELETE /v1/uploads/{uploadId}`

응답 `204`. 이미 만료·삭제여도 `204`.

---

## 11. 제공하지 않는 API

기획서 P2 · 리스크 대응과 같습니다. 요청이 오면 `501 NOT_IMPLEMENTED`입니다.

| 하지 않는 것 | 이유 |
| --- | --- |
| 실시간 매장 재고 조회 | MCM 재고 API·운영 합의 없음. 재고 확정 표시 0건이 신뢰 지표 |
| 예약 슬롯 확정·결제 | Fit Pass는 확인 요청만 |
| 생성형 가상 착용 / 제품 재생성 | 로고·패턴·색상 왜곡 |
| 사진으로 키·성격·감정 추정 | 민감정보, 부정확 |
| 외부 치수 → 내부 용량·적재율 | 수납 오판 |
| Google Street View 캡처·캐시 | 콘텐츠 정책 |
| 직원용 Fit Pass 화면 | Phase 2 |
| SCENE MATE / NFC / DPP | 구매 후 별도 서비스 |

---

## 12. 화면 ↔ API 매핑

```
홈
 ├─ 궁금한 가방이 있어요
 │    GET /products → GET /products/{id}
 │    (미리보기는 온디바이스, API 없음)
 │    POST /fit-check
 │    POST /ai/explain
 │    POST /fit-check/compare
 │    POST /fit-passes → GET /fit-passes/{id}
 │
 └─ 어떤 가방이 맞을지 모르겠어요
      POST /recommend → 이후 동일
```

| 화면 | 경로 | API |
| --- | --- | --- |
| 제품 선택 | `/products` | `GET /products` |
| 착용 미리보기 | `/preview` | 없음 (온디바이스) |
| 조건 입력 | `/conditions` | `PATCH /sessions/me` (선택) |
| Scene Fit Card | `/result` | `POST /fit-check`, `POST /ai/explain` |
| 비교 | `/compare` | `POST /fit-check/compare` |
| Fit Pass | `/fit-pass` | `GET /stores`, `POST /fit-passes` |
| 요청 완료 | `/fit-pass/done` | `GET /fit-passes/{id}` |
| 추천 진입 | `/recommend` | `POST /recommend` |
| 60초 빠른 체험 | 홈 → `/result` | 동일 Fit Check. 조건은 데모 프리셋 |

부스 데모 프리셋 예:

```json
{
  "productId": "aren-nova-crossbody",
  "conditions": {
    "scene": "travel",
    "mobility": "light-walk",
    "items": ["phone", "wallet", "camera"],
    "wearStyle": "crossbody",
    "destination": "도쿄, 10월",
    "rewearScene": "daily"
  }
}
```

---

## 13. 구현 순서 (백엔드)

기획서 14-4와 맞춥니다.

1. 제품 10개 시드 (공식 URL, 치수, `officialStorage` 검수) + `GET /products`
2. `POST /fit-check` 규칙 엔진 (`confirmed` 오판 0건이 목표)
3. `POST /fit-check/compare`, `POST /recommend`
4. `POST /ai/explain` — 규칙 결과를 입력으로만 사용
5. `POST /fit-passes` — `demo: true`, status는 확인 요청만
6. 세션·업로드 삭제
7. (P1) 날씨 참고, 자연어 조건 파싱

---

## 14. 신뢰 지표와 테스트 포인트

기획서 12-1 신뢰 지표를 API 테스트로 옮깁니다.

- [ ] `officialStorage`에 없는 품목을 `confirmed`로 내린 사례 0건
- [ ] 재고 수량·`inStock: true` 필드를 내려 준 사례 0건
- [ ] 필수 조건 미충족 제품을 근거 없이 1위로 고정한 사례 0건
- [ ] `weightG` 없는 제품에 무게 기반 문장을 붙인 사례 0건
- [ ] Fit Pass 응답에 `demo: true`와 재고 비확정 disclaimer가 있음
- [ ] AI explain이 `unlikely`를 `들어갈 수 있습니다`로 바꾸지 않음

예시 픽스처:

1. `laptop13` + `widthMm < 320` → 해당 품목 `unlikely`
2. 공식 페이지에 노트북 수납 명시는 있고 폭이 충분한 Stark 백팩 → `laptop13` = `confirmed`
3. 카메라+물병 동시 수납 → 각각 판정. 동시 수납을 `confirmed`로 합치지 않음
4. 착용 `crossbody` 요청 + 토트만 가능한 제품 → Carry `weak`, 대안 탐색
