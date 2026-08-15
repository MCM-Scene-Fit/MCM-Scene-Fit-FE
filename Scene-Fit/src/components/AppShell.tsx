import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useFlow } from '../context/FlowContext'

export function AppShell() {
  return (
    <div className="app-shell">
      <div className="app-frame">
        <Outlet />
      </div>
    </div>
  )
}

export function RequireProduct({ children }: { children: ReactNode }) {
  const { selectedProductId } = useFlow()
  if (!selectedProductId) {
    return <Navigate to="/products" replace />
  }
  return children
}
