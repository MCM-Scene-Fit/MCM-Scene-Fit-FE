import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { WearPreview } from '../components/WearPreview'
import { useFlow } from '../context/FlowContext'
import { BUILD_LABEL, WEAR_LABEL } from '../data/labels'
import { getColor } from '../data/products'
import { HEIGHT_MAX_CM, HEIGHT_MIN_CM } from '../lib/previewFit'
import { BUILDS } from '../types'

export function PreviewPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    selectedProduct,
    selectedColorId,
    previewMode,
    photoUrl,
    body,
    bag,
    conditions,
    setPreviewMode,
    setPhotoUrl,
    setBody,
    setBag,
    setConditions,
    setColor,
  } = useFlow()

  const product = selectedProduct
  if (!product || !selectedColorId) return null
  const color = getColor(product, selectedColorId)
  const wearStyle = conditions.wearStyle ?? product.wearStyles[0]

  const onUpload = (file: File | undefined) => {
    if (!file) return
    setPhotoUrl(URL.createObjectURL(file))
  }

  return (
    <main className="page has-sticky">
      <StepHeader
        step={2}
        title="내 모습에서 미리 보기"
        caption="실제 키를 입력하면, 공식 치수 비율로 가방 크기가 고정됩니다."
        backTo="/products"
      />

      <div className="preview-layout">
        <WearPreview
          product={product}
          colorId={color.id}
          mode={previewMode}
          photoUrl={photoUrl}
          body={body}
          wearStyle={wearStyle}
          bag={bag}
          onBagChange={setBag}
          onUploadClick={() => inputRef.current?.click()}
        />

        <div className="preview-controls">
          <div className="segment">
            <button
              type="button"
              className={previewMode === 'photo' ? 'is-on' : ''}
              onClick={() => setPreviewMode('photo')}
            >
              내 사진 올리기
            </button>
            <button
              type="button"
              className={previewMode === 'silhouette' ? 'is-on' : ''}
              onClick={() => setPreviewMode('silhouette')}
            >
              실루엣으로 보기
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              onUpload(event.target.files?.[0])
              event.currentTarget.value = ''
            }}
          />
          {previewMode === 'photo' ? (
            <>
              <button type="button" className="text-btn" onClick={() => inputRef.current?.click()}>
                {photoUrl ? '사진 다시 고르기' : '전신 사진 선택'}
              </button>
              <label className="slider">
                <span>내 키 {body.heightCm}cm</span>
                <input
                  type="range"
                  min={HEIGHT_MIN_CM}
                  max={HEIGHT_MAX_CM}
                  step="1"
                  value={body.heightCm}
                  onChange={(event) => setBody({ heightCm: Number(event.target.value) })}
                />
              </label>
              <p className="muted preview-note">
                내 키를 바꾸면 가방 크기도 함께 바뀝니다. 실제 치수 가방을 메었을 때의 비율을
                보기 위함입니다.
              </p>
            </>
          ) : (
            <>
              <p className="muted preview-note">
                키를 바꾸면 사람과 가방 비율이 함께 바뀝니다. 실제 치수 가방을 메었을 때의
                비율을 보기 위함입니다.
              </p>

              <label className="slider">
                <span>실루엣 키 {body.heightCm}cm</span>
                <input
                  type="range"
                  min={HEIGHT_MIN_CM}
                  max={HEIGHT_MAX_CM}
                  step="1"
                  value={body.heightCm}
                  onChange={(event) => setBody({ heightCm: Number(event.target.value) })}
                />
              </label>

              <p className="field-label">체형</p>
              <div className="chip-row">
                {BUILDS.map((build) => (
                  <button
                    key={build}
                    type="button"
                    className={`chip ${body.build === build ? 'is-on' : ''}`}
                    onClick={() => setBody({ build })}
                  >
                    {BUILD_LABEL[build]}
                  </button>
                ))}
              </div>
            </>
          )}

          <p className="field-label">착용 위치</p>
          <div className="chip-row">
            {product.wearStyles.map((wear) => (
              <button
                key={wear}
                type="button"
                className={`chip ${wearStyle === wear ? 'is-on' : ''}`}
                onClick={() => setConditions({ wearStyle: wear })}
              >
                {WEAR_LABEL[wear]}
              </button>
            ))}
          </div>

          <p className="disclaimer">
            대략적인 비율 확인용이며 실제 착용감은 매장 확인이 필요합니다
          </p>

          <div className="color-row">
            {product.colors.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`swatch ${selectedColorId === item.id ? 'is-on' : ''}`}
                style={{ background: item.hex }}
                aria-label={item.name}
                onClick={() => setColor(item.id)}
              />
            ))}
            <span className="muted">{color.name}</span>
          </div>
        </div>
      </div>

      <StickyBar>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/conditions')}>
          장면과 조건 입력하기
        </button>
      </StickyBar>
    </main>
  )
}
