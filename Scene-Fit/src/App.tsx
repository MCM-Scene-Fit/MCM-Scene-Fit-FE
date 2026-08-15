import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell, RequireProduct } from './components/AppShell'
import { FlowProvider } from './context/FlowContext'
import { ComparePage } from './pages/ComparePage'
import { ConditionsPage } from './pages/ConditionsPage'
import { FitPassDonePage } from './pages/FitPassDonePage'
import { FitPassPage } from './pages/FitPassPage'
import { HomePage } from './pages/HomePage'
import { PreviewPage } from './pages/PreviewPage'
import { ProductsPage } from './pages/ProductsPage'
import { RecommendPage } from './pages/RecommendPage'
import { ResultPage } from './pages/ResultPage'

export default function App() {
  return (
    <BrowserRouter>
      <FlowProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/recommend" element={<RecommendPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route
              path="/preview"
              element={
                <RequireProduct>
                  <PreviewPage />
                </RequireProduct>
              }
            />
            <Route
              path="/conditions"
              element={
                <RequireProduct>
                  <ConditionsPage />
                </RequireProduct>
              }
            />
            <Route
              path="/result"
              element={
                <RequireProduct>
                  <ResultPage />
                </RequireProduct>
              }
            />
            <Route
              path="/compare"
              element={
                <RequireProduct>
                  <ComparePage />
                </RequireProduct>
              }
            />
            <Route
              path="/fit-pass"
              element={
                <RequireProduct>
                  <FitPassPage />
                </RequireProduct>
              }
            />
            <Route
              path="/fit-pass/done"
              element={
                <RequireProduct>
                  <FitPassDonePage />
                </RequireProduct>
              }
            />
          </Route>
        </Routes>
      </FlowProvider>
    </BrowserRouter>
  )
}
