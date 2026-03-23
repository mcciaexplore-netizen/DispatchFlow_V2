MODULE 1: App Shell & Router Guard
COMPLEXITY: merged
CONTAINS: App router setup, setup-complete guard (redirect to onboarding if flag absent), top navigation bar, operator name display, "Switch Operator" nav link, global error boundary, 404 page
TECH: React Router v6, Zustand, Tailwind CSS
INPUT: `setupComplete` flag from localStorage; active operator session from Zustand
OUTPUT: Routed application shell with guarded navigation; unauthenticated routes blocked until onboarding complete
DEPENDS ON: none
INTEGRATIONS: none
APPROVALS: no
AUTOMATIONS: no
HAS_UI: yes
MANUAL SETUP: none

---

MODULE 2: Onboarding Wizard
COMPLEXITY: complex
CONTAINS: n/a
TECH: React Hook Form, Zustand, localStorage, fetch() for Apps Script and Sheets test connection calls
INPUT: None — first-run state; schema template selection from Step 2 pre-fills Step 3
OUTPUT: `setupComplete: true` in localStorage; company identity (name, GST, address, logo base64), adminPinHash, dispatchSchema, invoiceSchema, Apps Script URL, Sheets API key written to localStorage
DEPENDS ON: 3 (schema editor embedded in Step 3), 4 (PIN creation in Step 1)
INTEGRATIONS: Google Apps Script (one-off test connection fetch in Step 4); Google Sheets API (one-off test read in Step 4)
APPROVALS: no
AUTOMATIONS: no
HAS_UI: yes
MANUAL SETUP: Client must have Apps Script deployed and Sheets API key ready before Step 4; setup instructions with screenshots provided inline in wizard

---

MODULE 3: Schema Definition System
COMPLEXITY: complex
CONTAINS: n/a
TECH: dnd-kit (drag-to-reorder rows), React Hook Form (field row CRUD), localStorage (dispatchSchema, invoiceSchema, schemaVersion timestamp)
INPUT: Existing schema from localStorage (edit mode); industry template preset JSON (if selected during onboarding Step 2)
OUTPUT: Updated dispatchSchema and invoiceSchema JSON arrays in localStorage; updated schemaVersion timestamp; locked system fields (slipNumber, createdAt, createdBy, schemaVersion) displayed read-only — never editable
DEPENDS ON: none
INTEGRATIONS: none
APPROVALS: no
AUTOMATIONS: no
HAS_UI: yes
MANUAL SETUP: none

---

MODULE 4: Admin PIN & Session Management
COMPLEXITY: complex
CONTAINS: n/a
TECH: Web Crypto API — SHA-256 PIN hashing (browser-native, zero dependencies); Zustand (isAdminUnlocked, currentOperator, sessionExpiry); localStorage (adminPinHash, adminSessionStart, lastActivity, lastOperatorSession { name, date })
INPUT: PIN digits on setup or verification; operator name string from daily modal
OUTPUT: Zustand session state (isAdminUnlocked, currentOperator); /settings route guard; operator name stamped on all records created in session
DEPENDS ON: none
INTEGRATIONS: none
APPROVALS: no
AUTOMATIONS: yes — admin session cleared after 15 min of admin inactivity (configurable: 15/30/60 min); app-level lock screen after 30 min of total inactivity (configurable); operator name modal shown on app load when lastOperatorSession.date < today
HAS_UI: yes
MANUAL SETUP: none

---

MODULE 5: OCR Scanner & Image Pipeline
COMPLEXITY: complex
CONTAINS: n/a
TECH: Browser MediaDevices API (camera live preview + capture); browser-image-compression + Canvas API (fast/high compression profiles); @google/generative-ai (Gemini JS SDK); Zustand (reads active schema for prompt construction)
INPUT: Camera frame or uploaded image file; active dispatch or invoice schema from localStorage (determines field list injected into prompt)
OUTPUT: Parsed JSON object keyed by schema field keys; OCR status (success / partial / failed with which fields missing); raw model response retained for debug display
DEPENDS ON: 3 (schema must exist to construct OCR prompt)
INTEGRATIONS: Gemini API (Google AI Studio) — ordered model fallback: gemini-2.0-flash-lite → gemini-1.5-flash → gemini-1.5-pro; automatic failover on quota or availability error
APPROVALS: no
AUTOMATIONS: yes — automatic model fallback triggered on API error response
HAS_UI: yes
MANUAL SETUP: Client supplies Gemini API key from aistudio.google.com; key stored in localStorage via Onboarding Step 4 or Settings; HTTP referrer restriction on key documented in onboarding inline instructions

---

MODULE 6: Dispatch Slip Form & Save
COMPLEXITY: merged
CONTAINS: Dynamic form field rendering from dispatchSchema, OCR JSON auto-fill with amber highlight animation on filled fields, mandatory-field validation modal (list missing required fields; "Save anyway" or "Go back"), grace-period edit lock (compares now to createdAt against configured window), record save to Dexie dispatch table with all system fields, unique slip number generation, slip preview with print layout
TECH: React Hook Form (dynamic field array), Dexie.js (dispatch table write), Zustand (schema read, sync queue trigger), CSS print media queries, React Router v6
INPUT: OCR JSON from Module 5 (or empty object for manual entry); dispatchSchema from localStorage; existing dispatch record if editing within grace period
OUTPUT: Dispatch record written to Dexie dispatch table (key-value payload + system fields + schemaVersion); record ID appended to Dexie syncQueue; slip preview rendered; print triggered on demand
DEPENDS ON: 3 (schema), 5 (OCR output), 10 (syncQueue table appended on save)
INTEGRATIONS: none
APPROVALS: no
AUTOMATIONS: no
HAS_UI: yes
MANUAL SETUP: none

---

MODULE 7: Invoice Form & Save
COMPLEXITY: merged
CONTAINS: Dynamic form field rendering from invoiceSchema, OCR JSON auto-fill with amber highlight, mandatory-field validation modal, grace-period edit lock, record save to Dexie invoice table with system fields, unique invoice ID generation, invoice preview with print layout
TECH: React Hook Form, Dexie.js (invoice table write), Zustand (schema read, sync queue trigger), CSS print media queries, React Router v6
INPUT: OCR JSON from Module 5 (or empty for manual entry); invoiceSchema from localStorage; existing invoice record if editing within grace period
OUTPUT: Invoice record written to Dexie invoice table; record ID appended to Dexie syncQueue; invoice preview rendered; print triggered on demand
DEPENDS ON: 3 (schema), 5 (OCR output), 10 (syncQueue table appended on save)
INTEGRATIONS: none
APPROVALS: no
AUTOMATIONS: no
HAS_UI: yes
MANUAL SETUP: none

---

MODULE 8: Dispatch History & Detail
COMPLEXITY: merged
CONTAINS: Dispatch history list with Dexie indexed queries (filters: date range, operator name, free-text search on payload fields), dispatch detail view with schema-version-aware field rendering, CSV export button (Dexie dispatch table dump → .csv download), print trigger from detail view
TECH: Dexie.js (indexed queries on createdAt, createdBy, schemaVersion), React Router v6, Zustand (schema version map for historical rendering), File API (CSV download)
INPUT: Dexie dispatch table; active filter state (date, operator, text); schema version map for rendering historical records with correct field labels
OUTPUT: Filtered dispatch record list; single record detail view; CSV file download; print output
DEPENDS ON: 3 (schema versioning for historical rendering), 6 (records produced here), 11 (optional Sheets records supplement local results)
INTEGRATIONS: none (Sheets read is a data service in Module 11, consumed optionally here)
APPROVALS: no
AUTOMATIONS: no
HAS_UI: yes
MANUAL SETUP: none

---

MODULE 9: Invoice History & Detail
COMPLEXITY: merged
CONTAINS: Invoice history list with Dexie indexed queries (filters: date range, operator name, free-text search), invoice detail view with schema-version-aware field rendering, CSV export button (invoice table dump → .csv download), print trigger from detail view
TECH: Dexie.js, React Router v6, Zustand (schema version map), File API (CSV download)
INPUT: Dexie invoice table; active filter state; schema version map for historical rendering
OUTPUT: Filtered invoice list; single record detail view; CSV file download; print output
DEPENDS ON: 3 (schema versioning), 7 (records produced here), 11 (optional Sheets supplement)
INTEGRATIONS: none
APPROVALS: no
AUTOMATIONS: no
HAS_UI: yes
MANUAL SETUP: none

---

MODULE 10: Sync Queue & Sheets Write
COMPLEXITY: complex
CONTAINS: n/a
TECH: Dexie.js (syncQueue table — fields: recordId, recordType, payload, retryCount, lastAttempted, status); Zustand (syncStatus: all-synced / pending-N / failing); fetch() POST to Apps Script with text/plain JSON body; setInterval (5-minute worker); Dexie sync attempt log table (last 20 entries)
INPUT: Record IDs and payloads pushed to syncQueue by Modules 6 and 7 on save; Apps Script URL from localStorage
OUTPUT: Records written to client's Google Sheet via Apps Script proxy; syncQueue entries removed on success; retryCount incremented and record left in queue on failure; Zustand syncStatus updated after every worker run; sync attempt log entries written to Dexie
DEPENDS ON: none (standalone worker; triggered externally when Modules 6/7 append to queue)
INTEGRATIONS: Google Apps Script (client-hosted Web App) — POST with text/plain JSON body; CORS bypass is the purpose of the proxy
APPROVALS: no
AUTOMATIONS: yes — worker runs on app load; worker runs immediately after each save (triggered by Modules 6/7); 5-minute setInterval while app is open; automatic retry with configurable max attempts (default 5) before record marked as permanently failed
HAS_UI: no
MANUAL SETUP: Client must open Google Apps Script, paste provided script code, deploy as Web App with "Anyone" access, copy the Web App URL into Onboarding Step 4 or Settings

---

MODULE 11: Sheets History Read
COMPLEXITY: complex
CONTAINS: n/a
TECH: Google Sheets REST API v4 (fetch() direct from browser); localStorage (Sheets API key, spreadsheet ID, sheet tab names for dispatch and invoice)
INPUT: Sheets API key and spreadsheet ID from localStorage; optional record type (dispatch/invoice), date range, and operator filter params passed as query parameters
OUTPUT: Array of dispatch or invoice records from Sheets; consumed optionally by Modules 8 and 9 to supplement local Dexie results (used when local records are absent — e.g. after localStorage clear or device change)
DEPENDS ON: none
INTEGRATIONS: Google Sheets API v4 — GET requests; free tier 100 req/100s per user; read-only API key
APPROVALS: no
AUTOMATIONS: no
HAS_UI: no
MANUAL SETUP: Client must enable Google Sheets API in Google Cloud Console, generate a read-only API key with HTTP referrer restriction, and store key + spreadsheet ID in Settings or Onboarding Step 4

---

MODULE 12: Backup & Data Management
COMPLEXITY: complex
CONTAINS: n/a
TECH: Dexie.js (full database export via dexie-export-import plugin); localStorage (pendingBackup flag, lastBackupDate, retentionMonths); File API (programmatic download trigger, file input for import); app-load hook and setInterval for schedule check
INPUT: All Dexie dispatch and invoice records; retentionMonths config; lastBackupDate; pendingBackup flag; imported .json file (restore flow)
OUTPUT: Timestamped .json file downloaded to device (export); records merged into Dexie on import (deduplication by slipNumber/invoiceId — no overwrites); Dexie records older than retentionMonths deleted (retention sweep); pendingBackup flag set in localStorage (consumed as banner by Module 14)
DEPENDS ON: none
INTEGRATIONS: none
APPROVALS: no
AUTOMATIONS: yes — on every app load: check if lastBackupDate is 7+ days ago, set pendingBackup: true if due; run retention sweep and delete Dexie records older than configured N months (default 6)
HAS_UI: no
MANUAL SETUP: none

---

MODULE 13: Settings Page
COMPLEXITY: merged
CONTAINS: Company identity form (name, GST, address, logo re-upload), API configuration section (Gemini key, Apps Script URL with test connection, Sheets API key with test read), session configuration (admin PIN change, grace period selector, session timeout duration, app lock duration), data management section (export backup now, import from backup, force sync now, sync attempt log display, retention period), link to schema editor (Module 3)
TECH: React Hook Form, localStorage, Dexie.js (sync log read from Module 10 table), Web Crypto API (PIN re-hash on change), fetch() (test connection calls to Apps Script and Sheets)
INPUT: All existing config from localStorage; sync attempt log from Dexie; adminPinHash for PIN change verification
OUTPUT: Updated config written to localStorage; new PIN hashed via Web Crypto API and stored; test connection result shown inline; export/import/force-sync delegated to Module 12 and Module 10
DEPENDS ON: 4 (PIN gate — all settings routes require admin session), 3 (schema editor link/embed), 10 (sync log display, force sync trigger), 12 (export/import/retention controls)
INTEGRATIONS: Google Apps Script (one-off test fetch); Google Sheets API (one-off test read)
APPROVALS: no
AUTOMATIONS: no
HAS_UI: yes
MANUAL SETUP: none

---

MODULE 14: Dashboard
COMPLEXITY: merged
CONTAINS: Sync status indicator (green all-synced / amber pending-N / red failing — links to Settings sync log), pending backup banner (shown when pendingBackup: true; one-tap download via Module 12; persists across refreshes until actioned), cloud sync warning banner (shown when Apps Script URL absent in localStorage), recent activity summary (last 5 dispatch + last 5 invoice records from Dexie), quick-action buttons (New Dispatch Slip → /create, New Invoice → /invoices)
TECH: Zustand (syncStatus from Module 10), Dexie.js (recent records query), localStorage (pendingBackup flag, Apps Script URL presence check)
INPUT: Zustand syncStatus; Dexie recent dispatch and invoice records; pendingBackup flag; Apps Script URL from localStorage
OUTPUT: Dashboard view; backup download triggered on banner tap (delegates to Module 12 export); navigation to /create and /invoices
DEPENDS ON: 10 (sync status state), 12 (pendingBackup flag and export trigger), 6 (dispatch records in Dexie), 7 (invoice records in Dexie)
INTEGRATIONS: none
APPROVALS: no
AUTOMATIONS: no
HAS_UI: yes
MANUAL SETUP: none
