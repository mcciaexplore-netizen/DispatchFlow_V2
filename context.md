## 1) Application Context (Whole App)

DispatchFlow is a web application for Indian MSME dispatch operations. It digitizes dispatch tags and invoices using vision OCR, then stores structured records locally and optionally syncs them to Google Sheets.

Primary goals:
- Reduce manual typing time during dispatch and invoice entry.
- Reduce data-entry errors from handwritten/smudged labels.
- Keep printable records and searchable history.
- Provide low-cost, mobile-friendly workflows without ERP complexity.


Main routes:
- / : Dashboard
- /create : Create dispatch slip (scan + form + preview + save)
- /history : Dispatch history
- /history/:slipNumber : Dispatch detail
- /invoices : Invoice scan and digitization
- /invoices/history : Invoice history
- /invoices/history/:invoiceId : Invoice detail
- /settings : API keys, storage configuration, company metadata

Core modules:
- Scanner flow: camera capture, image upload, and OCR orchestration hooks.
- Dispatch OCR: dispatch-tag extraction service.
- Invoice OCR: invoice extraction service.
- Data sync: cloud read/write services with an Apps Script write proxy.
- App-level configuration: runtime settings provider and environment-backed defaults.

## 2) End-to-End Functional Flow

Dispatch slip flow:
1. User scans/uploads tag in ScanZone.
2. Image is optimized (fast/high profile).
3. OCR request is sent.
4. Parsed JSON auto-fills slip form fields.
5. User edits/validates data.
6. Slip preview generated with unique slip number.
7. Save to localStorage; if cloud enabled, sync to Google Sheets.

Invoice flow:
1. User scans/uploads invoice image.
2. Invoice OCR extracts GST, party, line item, tax, and bank fields.
3. User reviews/edits form.
4. Preview and save with generated invoice ID.
5. Save to localStorage; optional Google Sheets sync.

## 3) MCP Features (Model Context Protocol)

Current implementation status in this repository:
- No explicit MCP server/client implementation is present in application runtime code.
- No MCP transport, server manifest, or MCP tool exposure is currently integrated into DispatchFlow.

MCP-relevant capabilities already in place (MCP-ready architecture traits):
- Structured extraction outputs from OCR (JSON-first payloads).
- Clear domain services (OCR, parsing, persistence) that can be wrapped as tools.
- Deterministic ID generation and validation utilities suitable for tool outputs.
- Configurable external integration points (Google Sheets + Apps Script).

Potential MCP feature set for next phase (if MCP is added):
- Tool: scan_dispatch_tag(image) -> structured dispatch JSON.
- Tool: scan_invoice(image) -> structured invoice JSON.
- Tool: generate_slip_number(prefix) and generate_invoice_id(prefix).
- Tool: append_slip_record(record) and append_invoice_record(record) via Sheets.
- Resource: recent dispatch/invoice history with filters.
- Prompt template tools for OCR instructions and domain-specific extraction.

## 4) Problem Statement and Solution Mapping

1. Problem: Manual dispatch and invoice entry is slow and repetitive.
   Solution: Camera/upload OCR with auto-fills form data; users only review and correct.

2. Problem: Handwritten/smudged document text causes frequent entry mistakes.
   Solution: OCR prompt engineering for industrial and Indian GST contexts + manual correction before save.

3. Problem: Small operations need records but cannot afford complex ERP systems.
   Solution: Lightweight browser app with offline-first localStorage and optional cloud sync.

4. Problem: Cloud writes from browser to Google Sheets face CORS/auth complexity.
   Solution: Google Apps Script Web App write proxy; browser posts rows as text/plain JSON.

5. Problem: AI model availability and response reliability can vary by account/region/quota.
   Solution: Dynamic model discovery and ordered fallback (2.5 Flash Lite prioritized, then alternatives).

6. Problem: Users need a fallback when keys/config are missing.
   Solution: Manual-entry workflow remains functional without OCR or Sheets config.

7. Problem: Teams need searchable historical records.
   Solution: Built-in history pages with text/date filtering and detail views for both slips and invoices.

8. Problem: Operations require print-ready output, not only digital forms.
   Solution: Preview and print-friendly document layout components/styles.

## 5) Current Gaps and Next Logical Improvements

- Add explicit MCP server layer if AI agents or external clients must call DispatchFlow capabilities as tools.
- Align project documentation model badges and wording with current fallback priority in code.
- Add tests around OCR parsing, ID generators, and storage rollback behavior.
- Add observability for OCR failures, Sheets sync failures, and fallback model selection.

## 6) Quick Operational Notes

- localStorage keys are centralized in a shared constants layer.
- Settings merge priority is localStorage over environment defaults.
- Dispatch and invoice storage configs are independent but can share credentials.
- Apps Script URL is required for write sync; Sheets API key is used for read history.


But some this application should be bit SAAS type application because we will be giving this application to them, like deploying it from there account or device and the data feilds extraction may vary company to company as per industry so, doing particular customizations for each company is bit difficult, I want that there should be setup steps (like company name, other details, columns head names and data which they want to get extracted from image) in application which are fully functional so that the deployed application can be configured according to their need. It should be implemented with reliablility and can sustain till long term as it will be used in industry for real and practical use. Also suggest more features without increasing complexity for user and making ease of task.  
