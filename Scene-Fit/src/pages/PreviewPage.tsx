import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BagIllustration } from '../components/BagIllustration'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import { SILHOUETTES } from '../data/labels'
import { getColor, getProduct } from '../data/products'

export function PreviewPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    selectedProductId,
    selectedColorId,
    previewMode,
    photoUrl,
    silhouetteId,
    bag,
    setPreviewMode,
    setPhotoUrl,
    setSilhouetteId,
    setBag,
    setColor,
  } = useFlow()

  const product = getProduct(selectedProductId ?? '')
  if (!product || !selectedColorId) return null
  const color = getColor(product, selectedColorId)

  const onUpload = (file: File | undefined) => {
    if (!file) return
    setPhotoUrl(URL.createObjectURL(file))
  }

  return (
    <main className="page has-sticky">
      <StepHeader
        step={2}
        title="내 모습에서 미리 보기"
        caption="정확한 가상 피팅이 아니라, 크기와 분위기를 가늠하는 미리보기입니다."
        backTo="/products"
      />

      <div className="preview-layout">
        <div className="preview-stage">
          {previewMode === 'photo' && photoUrl ? (
            <img src={photoUrl} alt="업로드한 전신 사진" className="preview-photo" />
          ) : (
            <SilhouetteFigure id={silhouetteId} />
          )}
          <div
            className="bag-layer"
            style={{
              left: `${bag.x}%`,
              top: `${bag.y}%`,
              transform: `scale(${bag.scale})`,
            }}
          >
            <BagIllustration wear={product.wearStyles[0]} color={color.hex} />
          </div>
        </div>

        <div className="preview-controls">
          <div className="segment">
            <button
              type="button"
              className={previewMode === 'silhouette' ? 'is-on' : ''}
              onClick={() => setPreviewMode('silhouette')}
            >
              준비된 실루엣
            </button>
            <button
              type="button"
              className={previewMode === 'photo' ? 'is-on' : ''}
              onClick={() => {
                if (photoUrl) setPreviewMode('photo')
                else inputRef.current?.click()
              }}
            >
              내 전신 사진
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => onUpload(event.target.files?.[0])}
          />
          {photoUrl ? (
            <button type="button" className="text-btn" onClick={() => inputRef.current?.click()}>
              사진 다시 고르기
            </button>
          ) : null}

          {previewMode === 'silhouette' ? (
            <div className="chip-row">
              {SILHOUETTES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`chip ${silhouetteId === item.id ? 'is-on' : ''}`}
                  onClick={() => setSilhouetteId(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          <p className="disclaimer">실제 제품 크기와 착용감은 매장에서 확인이 필요합니다.</p>

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

          <label className="slider">
            <span>가방 크기</span>
            <input
              type="range"
              min="0.7"
              max="1.4"
              step="0.02"
              value={bag.scale}
              onChange={(event) => setBag({ scale: Number(event.target.value) })}
            />
          </label>
          <label className="slider">
            <span>좌우 위치</span>
            <input
              type="range"
              min="0"
              max="55"
              value={bag.x}
              onChange={(event) => setBag({ x: Number(event.target.value) })}
            />
          </label>
          <label className="slider">
            <span>높이</span>
            <input
              type="range"
              min="18"
              max="62"
              value={bag.y}
              onChange={(event) => setBag({ y: Number(event.target.value) })}
            />
          </label>
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

function SilhouetteFigure({ id }: { id: string }) {
  const height = id === 's160' ? 86 : id === 's170' ? 96 : 91
  return (
    <svg viewBox="0 0 120 160" className="silhouette" aria-hidden="true">
      <circle cx="60" cy="28" r="14" />
      <rect x="42" y="44" width="36" height="52" rx="16" />
      <rect x="46" y="94" width="12" height={`${height - 70}`} rx="6" />
      <rect x="62" y="94" width="12" height={`${height - 70}`} rx="6" />
    </svg>
  )
}
