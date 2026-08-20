import { useEffect, useState, type CSSProperties } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getFitPass, isMockMode } from '../api'
import { ProductImage } from '../components/ProductImage'
import { TicketBarcode, TicketQr } from '../components/TicketMark'
import { useFlow } from '../context/FlowContext'
import {
  EXPERIENCE_LABEL,
  FIT_PASS_STATUS_LABEL,
  FIT_PASS_STATUSES,
  formatPrice,
  formatVisitTime,
} from '../data/labels'
import { bagImageRatio, getColor } from '../data/products'
import { useCatalogStore } from '../store/useCatalogStore'

export function FitPassDonePage() {
  const navigate = useNavigate()
  const {
    selectedProduct,
    selectedColorId,
    fitPass,
    fitPassIssued,
    fitPassStatus,
    setFitPassIssued,
    setFitPassStatus,
    resetFlow,
  } = useFlow()
  const stores = useCatalogStore((state) => state.stores)
  const [liveStatus, setLiveStatus] = useState(false)
  const issuedId = fitPassIssued?.id

  useEffect(() => {
    if (!issuedId || isMockMode()) return undefined
    let cancelled = false
    const poll = async () => {
      try {
        const next = await getFitPass(issuedId)
        if (cancelled) return
        setLiveStatus(true)
        setFitPassIssued(next)
      } catch {
        if (!cancelled) setLiveStatus(false)
      }
    }
    void poll()
    const interval = window.setInterval(() => void poll(), 2500)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [issuedId, setFitPassIssued])

  useEffect(() => {
    if (liveStatus) return undefined
    if (fitPassStatus === 'requested') {
      const timer = window.setTimeout(() => setFitPassStatus('checking'), 2500)
      return () => window.clearTimeout(timer)
    }
    if (fitPassStatus === 'checking') {
      const timer = window.setTimeout(() => setFitPassStatus('confirmed'), 3000)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [fitPassStatus, liveStatus, setFitPassStatus])

  if (!selectedProduct) return null
  if (!fitPassIssued || !fitPassStatus) {
    return <Navigate to="/fit-pass" replace />
  }

  const color = getColor(selectedProduct, selectedColorId ?? selectedProduct.colors[0].id)
  const store =
    fitPassIssued.store ?? stores.find((item) => item.id === fitPass.storeId)
  const storeChecks = fitPassIssued.snapshot?.storeChecks.length
    ? fitPassIssued.snapshot.storeChecks
    : fitPassIssued.storeChecks
  const experiences = fitPassIssued.experiences?.length
    ? fitPassIssued.experiences
    : fitPass.experiences
  const visitTime = fitPassIssued.visitTime || fitPass.visitTime
  const customNote = fitPassIssued.customNote || fitPass.customNote

  return (
    <main className="page pass-page">
      <p className="brand-mark">STORE FIT PASS</p>
      <h1>확인 요청이 접수되었습니다</h1>
      <p className="lede">
        실시간 재고를 확정하지 않습니다. 매장에서 체험 가능 여부를 확인하는 요청만 남깁니다.
      </p>

      <article className="pass-ticket pass-ticket--print" aria-label="Fit Pass 디지털 티켓">
        {/* 상태는 매장 확인에 따라 넘어간다. 스탬프도 같이 따라가야 서로 어긋나지 않는다. */}
        <span className="pass-stamp">{FIT_PASS_STATUS_LABEL[fitPassStatus]}</span>
        <span className="fit-card__punch" aria-hidden="true" />

        <header className="pass-ticket__head">
          <p className="eyebrow">Store Fit Pass</p>
          <strong>{fitPassIssued.id}</strong>
        </header>

        <ol className="pass-status" aria-label="매장 확인 상태">
          {FIT_PASS_STATUSES.map((status) => (
            <li
              key={status}
              className={
                status === fitPassStatus
                  ? 'is-current'
                  : FIT_PASS_STATUSES.indexOf(status) < FIT_PASS_STATUSES.indexOf(fitPassStatus)
                    ? 'is-done'
                    : undefined
              }
            >
              {FIT_PASS_STATUS_LABEL[status]}
            </li>
          ))}
        </ol>

        <div className="pass-ticket__cut" aria-hidden="true" />

        <section className="pass-product">
          <div
            className="pass-product__visual"
            style={{ '--bag-ratio': bagImageRatio(selectedProduct, color.id) } as CSSProperties}
          >
            <ProductImage product={selectedProduct} colorId={color.id} decorative />
          </div>
          <div className="pass-product__copy">
            <p className="eyebrow">{selectedProduct.category}</p>
            <h2>{selectedProduct.name}</h2>
            <p className="muted">
              {color.name} · {color.sku}
            </p>
            <p className="price">{formatPrice(selectedProduct.price)}</p>
          </div>
        </section>

        <dl className="pass-meta">
          <div>
            <dt>
              탑승객
              <span>Passenger</span>
            </dt>
            <dd>방문 예정 고객</dd>
          </div>
          <div>
            <dt>
              목적지
              <span>Destination</span>
            </dt>
            <dd>{store?.name ?? '미선택'}</dd>
          </div>
          <div>
            <dt>
              게이트
              <span>Gate</span>
            </dt>
            <dd>
              {experiences[0]
                ? EXPERIENCE_LABEL[experiences[0]]
                : '매장 체험'}
            </dd>
          </div>
          <div>
            <dt>
              일시
              <span>Time</span>
            </dt>
            <dd>{formatVisitTime(visitTime ?? '')}</dd>
          </div>
        </dl>

        <section className="pass-block">
          <h3>체험 목적</h3>
          <ul className="pass-chips">
            {experiences.map((experience) => (
              <li key={experience}>{EXPERIENCE_LABEL[experience]}</li>
            ))}
          </ul>
        </section>

        <section className="pass-block">
          <h3>확인 필요 항목</h3>
          <ul>
            {storeChecks.length ? (
              storeChecks.map((line) => <li key={line}>{line}</li>)
            ) : (
              <li>지금 단계에서 따로 확인할 항목은 없습니다.</li>
            )}
          </ul>
        </section>

        {customNote ? (
          <section className="pass-block">
            <h3>직접 확인하고 싶은 항목</h3>
            <p>{customNote}</p>
          </section>
        ) : null}

        <p className="pass-disclaimer">
          {fitPassIssued.disclaimer ??
            '데모 상태입니다. 재고 있음이나 예약 확정을 뜻하지 않습니다.'}
        </p>

        <footer className="pass-ticket__foot">
          <TicketQr seed={fitPassIssued.id} />
          <TicketBarcode label={fitPassIssued.id} />
        </footer>
      </article>

      <div className="pass-actions">
        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
          처음으로
        </button>
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            resetFlow()
            navigate('/')
          }}
        >
          세션 초기화
        </button>
      </div>
    </main>
  )
}
