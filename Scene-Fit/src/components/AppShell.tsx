import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAppBootstrap } from '../hooks/useAppBootstrap'
import { useCatalogStore } from '../store/useCatalogStore'
import { useFlowStore } from '../store/useFlowStore'

function ApiStatus() {
  const ready = useCatalogStore((state) => state.ready)
  const source = useCatalogStore((state) => state.source)
  const [visible, setVisible] = useState(true)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!ready) return undefined
    const timer = window.setTimeout(() => setLeaving(true), 3000)
    return () => window.clearTimeout(timer)
  }, [ready, source])

  if (!visible) return null

  const label = !ready ? '서버 확인 중' : source === 'api' ? '서버 연결됨' : '로컬 목업'
  return (
    <p
      className={`api-status api-status--${ready ? source : 'pending'}${leaving ? ' is-leaving' : ''}`}
      onAnimationEnd={(event) => {
        if (leaving && event.animationName === 'api-status-out') setVisible(false)
      }}
    >
      {label}
    </p>
  )
}

export function AppShell() {
  useAppBootstrap()
  return (
    <div className="app-shell">
      <div className="app-frame">
        <ApiStatus />
        <Outlet />
      </div>
    </div>
  )
}

export function RequireProduct({ children }: { children: ReactNode }) {
  const selectedProduct = useFlowStore((state) => state.selectedProduct)
  if (!selectedProduct) {
    return <Navigate to="/products" replace />
  }
  return children
}
