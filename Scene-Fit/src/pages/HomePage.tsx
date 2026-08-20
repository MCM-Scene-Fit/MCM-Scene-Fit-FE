import { useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { useFlow } from '../context/FlowContext'

export function HomePage() {
  const navigate = useNavigate()
  const { startQuickDemo } = useFlow()

  return (
    <main className="page home">
      <section className="home-copy">
        <BrandLogo to={null} />
        <h1>
          이 가방,
          <br />
          내 장면에서도 맞을까?
        </h1>
        <p className="lede">
          내 모습과 소지품, 이동 장면으로 먼저 확인하고
          매장에서 확신하세요.
        </p>
      </section>

      <div className="home-bottom">
        <section className="home-guide">
          <ol className="home-route" aria-label="검증 구간">
            <li>
              <span className="home-route__code">SCN</span>
              <span className="home-route__name">장면</span>
            </li>
            <li>
              <span className="home-route__code">CRY</span>
              <span className="home-route__name">수납</span>
            </li>
            <li>
              <span className="home-route__code">RWR</span>
              <span className="home-route__name">재사용</span>
            </li>
          </ol>
          <ol className="home-steps">
            <li>원하는 가방을 고른다</li>
            <li>내 모습에 적용해 본다</li>
            <li>장면과 조건으로 검증한다</li>
            <li>비교한 뒤 Fit Pass로 매장 체험을 요청한다</li>
          </ol>
        </section>

        <section className="home-panel">
          <div className="home-actions">
            <button type="button" className="btn btn-primary" onClick={() => navigate('/products')}>
              궁금한 가방이 있어요
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/recommend')}>
              어떤 가방이 맞을지 모르겠어요
            </button>
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                startQuickDemo()
                navigate('/result')
              }}
            >
              60초 빠른 체험
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
