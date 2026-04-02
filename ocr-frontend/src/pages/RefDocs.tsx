import { useRef } from 'react'

export function RefDocs() {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  function handleDownload() {
    iframeRef.current?.contentWindow?.print()
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 88px)' }}>

      {/* Action bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text">MSME Guide — DispatchFlow</span>
          <span className="text-xs text-muted">User guide &amp; setup manual for business owners</span>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-semibold rounded hover:bg-accent/90 active:scale-95 transition-all min-h-touch"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
          </svg>
          Download as PDF
        </button>
      </div>

      {/* Guide iframe */}
      <iframe
        ref={iframeRef}
        src="/MSME_Guide_DispatchFlow.html"
        title="Reference Document — MSME Guide"
        className="w-full flex-1 border-0"
        style={{ minHeight: 0 }}
      />
    </div>
  )
}
