import { Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LS } from './constants/storage'
import { AppShell }       from './components/layout/AppShell'
import { OnboardingWizard } from './pages/OnboardingWizard'
import { Dashboard }      from './pages/Dashboard'
import { CreateDispatch } from './pages/CreateDispatch'
import { CreateInvoice }  from './pages/CreateInvoice'
import { DispatchHistory } from './pages/DispatchHistory'
import { DispatchDetail } from './pages/DispatchDetail'
import { InvoiceHistory } from './pages/InvoiceHistory'
import { InvoiceDetail }  from './pages/InvoiceDetail'
import { Settings }       from './pages/Settings'
import { RefDocs }        from './pages/RefDocs'

// ── Error Boundary ────────────────────────────────────────────────────────
interface EBState { hasError: boolean; error: Error | null }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-heading text-text">Something went wrong</h1>
            <p className="text-sm text-muted">An unexpected error occurred. Your data is safe.</p>
            {this.state.error && (
              <pre className="text-xs text-danger bg-danger/5 border border-danger/20 rounded p-3 w-full overflow-x-auto text-left">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-accent text-white rounded font-medium text-sm hover:bg-accent/90 transition-colors min-h-[44px]"
            >
              Reload application
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function isSetupComplete(): boolean {
  return localStorage.getItem(LS.SETUP_COMPLETE) === 'true'
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <h1 className="text-4xl font-heading text-text mb-2">404</h1>
      <p className="text-muted mb-4">Page not found.</p>
      <a href="/" className="text-accent underline">Go to dashboard</a>
    </div>
  )
}

export default function App() {
  if (!isSetupComplete()) {
    return (
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="*" element={<OnboardingWizard />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/"                              element={<Dashboard />} />
            <Route path="/create"                        element={<CreateDispatch />} />
            <Route path="/create/:slipId"                element={<CreateDispatch />} />
            <Route path="/history"                       element={<DispatchHistory />} />
            <Route path="/history/:slipId"               element={<DispatchDetail />} />
            <Route path="/invoices"                      element={<CreateInvoice />} />
            <Route path="/invoices/:invoiceId"           element={<CreateInvoice />} />
            <Route path="/invoices/history"              element={<InvoiceHistory />} />
            <Route path="/invoices/history/:invoiceId"   element={<InvoiceDetail />} />
            <Route path="/settings"                      element={<Settings />} />
            <Route path="/refdocs"                       element={<RefDocs />} />
            <Route path="*"                              element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
