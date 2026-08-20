import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAppBootstrap } from '../hooks/useAppBootstrap'
import { useFlowStore } from '../store/useFlowStore'

export function AppShell() {
  useAppBootstrap()
  return (
    <div className="app-shell">
      <div className="app-frame">
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
