import { useRef } from 'react'
import { Button } from '../ui/Button'
import { exportToCsv } from '../../lib/csvExport'
import type { SchemaField, SystemFields, CompanyConfig } from '../../types'

interface Props {
  slipId: string
  fields: SchemaField[]
  payload: Record<string, string>
  system: SystemFields
  company: CompanyConfig
  kind: 'dispatch' | 'invoice'
}

const printStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Source Sans 3', 'Segoe UI', sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; }
  .slip-page { max-width: 780px; margin: 0 auto; padding: 24px; }

  /* ── Top accent bar ───────────────────────────── */
  .accent-bar { height: 6px; background: linear-gradient(90deg, #2563eb 0%, #1e40af 100%); border-radius: 3px 3px 0 0; }

  /* ── Header ───────────────────────────────────── */
  .slip-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px 16px; border: 1px solid #e2e2e2; border-top: none; background: #fafbfc; }
  .company-block { display: flex; align-items: flex-start; gap: 14px; }
  .company-logo { height: 48px; width: auto; object-fit: contain; }
  .company-name { font-family: 'Barlow Semi Condensed', 'Segoe UI', sans-serif; font-size: 20px; font-weight: 700; color: #111; letter-spacing: -0.01em; }
  .company-meta { font-size: 11px; color: #666; line-height: 1.5; margin-top: 2px; }
  .company-gst { font-family: 'JetBrains Mono', 'Consolas', monospace; font-size: 11px; color: #555; letter-spacing: 0.02em; }

  .doc-badge { text-align: right; }
  .doc-type { display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #fff; background: #2563eb; padding: 3px 10px; border-radius: 3px; }
  .doc-id { font-family: 'JetBrains Mono', 'Consolas', monospace; font-size: 15px; font-weight: 600; color: #1e40af; margin-top: 6px; }
  .doc-date { font-size: 11px; color: #888; margin-top: 2px; }

  /* ── Separator ────────────────────────────────── */
  .sep { height: 1px; background: #e2e2e2; margin: 0; }

  /* ── Fields table ─────────────────────────────── */
  .fields-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e2e2; border-top: none; }
  .fields-table tr { border-bottom: 1px solid #eee; }
  .fields-table tr:last-child { border-bottom: none; }
  .fields-table tr:nth-child(even) { background: #fafbfc; }
  .fields-table td { padding: 9px 16px; vertical-align: top; }
  .field-label { width: 38%; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #777; border-right: 1px solid #eee; }
  .field-value { font-size: 13.5px; font-weight: 500; color: #1a1a1a; word-break: break-word; }

  /* ── Signature strip ──────────────────────────── */
  .sig-strip { display: flex; border: 1px solid #e2e2e2; border-top: none; }
  .sig-box { flex: 1; padding: 14px 20px; text-align: center; }
  .sig-box + .sig-box { border-left: 1px solid #e2e2e2; }
  .sig-line { width: 70%; margin: 28px auto 6px; border-bottom: 1px solid #bbb; }
  .sig-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; }

  /* ── Footer ───────────────────────────────────── */
  .slip-footer { display: flex; justify-content: space-between; align-items: center; padding: 10px 24px; border: 1px solid #e2e2e2; border-top: none; background: #fafbfc; border-radius: 0 0 3px 3px; font-size: 10px; color: #999; }
  .slip-footer .copy-label { font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #aaa; }

  @media print {
    @page { margin: 12mm 10mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .slip-page { padding: 0; }
  }
`

export function SlipPreview({ slipId, fields, payload, system, company, kind }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const docLabel = kind === 'dispatch' ? 'Dispatch Slip' : 'Invoice'

  const handleExportCsv = () => {
    const data = [{ ...payload, slipNumber: slipId, createdAt: system.createdAt, createdBy: system.createdBy, schemaVersion: system.schemaVersion }]
    exportToCsv(data, fields, `${slipId}_${system.createdAt.slice(0, 10)}.csv`)
  }

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=850,height=700')
    if (!win || !printRef.current) return
    win.document.write(`
      <html><head><title>${slipId}</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@600;700&family=Source+Sans+3:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
      <style>${printStyles}</style></head><body>
      ${printRef.current.innerHTML}
      <script>window.print(); window.close();</script>
      </body></html>
    `)
    win.document.close()
  }

  const createdDate = new Date(system.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-3">
      {/* ── Preview card (mirrors print layout) ─── */}
      <div ref={printRef}>
        <style>{printStyles}</style>
        <div className="slip-page">
          {/* Accent bar */}
          <div className="accent-bar" />

          {/* Header */}
          <div className="slip-header">
            <div className="company-block">
              {company.logoBase64 && (
                <img src={company.logoBase64} alt="logo" className="company-logo" />
              )}
              <div>
                <div className="company-name">{company.name}</div>
                {company.gst && <div className="company-gst">GSTIN: {company.gst}</div>}
                {company.address && <div className="company-meta">{company.address}</div>}
              </div>
            </div>
            <div className="doc-badge">
              <div className="doc-type">{docLabel}</div>
              <div className="doc-id">{slipId}</div>
              <div className="doc-date">{createdDate}</div>
            </div>
          </div>

          {/* Fields table */}
          <table className="fields-table">
            <tbody>
              {fields.map(f => (
                <tr key={f.key}>
                  <td className="field-label">{f.label}</td>
                  <td className="field-value">{payload[f.key] || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signature strip */}
          <div className="sig-strip">
            <div className="sig-box">
              <div className="sig-line" />
              <div className="sig-label">Prepared By</div>
            </div>
            <div className="sig-box">
              <div className="sig-line" />
              <div className="sig-label">Checked By</div>
            </div>
            <div className="sig-box">
              <div className="sig-line" />
              <div className="sig-label">Received By</div>
            </div>
          </div>

          {/* Footer */}
          <div className="slip-footer">
            <span>Created by: {system.createdBy}</span>
            <span className="copy-label">Original Copy</span>
            <span>Printed: {new Date().toLocaleDateString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 self-end no-print">
        <Button variant="secondary" size="md" onClick={handleExportCsv}>↓ CSV</Button>
        <Button variant="secondary" size="md" onClick={handlePrint}>Print / Export PDF</Button>
      </div>
    </div>
  )
}
