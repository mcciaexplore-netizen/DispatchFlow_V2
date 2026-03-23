# DispatchFlow Manual Testing Guide

This guide is written for manual QA of the full application from first launch to setup, data entry, history, settings, backup, sync, and edge cases.

Use this as a tester script. Follow the steps in order at least once, then run the edge-case scenarios one by one.

## 1. Test Environment

Application folder: `e:\MCCIA\OCRscan\dispatchflow`

Recommended browser:
- Chrome latest
- Edge latest

Recommended device coverage:
- Desktop or laptop
- Mobile viewport in browser devtools

Start the app:

```powershell
cd e:\MCCIA\OCRscan\dispatchflow
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173
```

## 2. Clean Start Before Testing

Use a fresh browser profile, incognito window, or clear site data before first-run testing.

If you want the onboarding wizard to appear again:
1. Open browser settings for the site.
2. Clear local storage / indexed DB / site data for `localhost`.
3. Refresh the app.

## 3. Main Test Data

Flow note:
- Onboarding setup order is `Company identity` -> `Choose a field template` -> `Review & edit fields` -> `Cloud sync setup`.
- Operator data is not entered during onboarding.
- Operator name is entered only after onboarding completes and the dashboard opens.

### 3.1 Company Setup Data

Use these values during onboarding Step 1 or in Settings:

| Field | Value |
|---|---|
| Company Name | `MCCIA Engineering Components Pvt Ltd` |
| GST Number | `27AABCM1234D1Z9` |
| Address | `Plot 18, MIDC Bhosari, Pune, Maharashtra 411026` |
| Admin PIN | `2468` |
| Confirm PIN | `2468` |

### 3.2 Operator Data

Use these names during operator session tests after onboarding is finished and the operator modal appears:

| Scenario | Value |
|---|---|
| Operator 1 | `Rohan Patil` |
| Operator 2 | `OP-02-Sneha` |
| Operator 3 | `QA Test User` |

### 3.3 Onboarding Step 2 Template Selection Data

Use these values during `Choose a field template`:

| Field | Value |
|---|---|
| Template to select for main test flow | `Engineering / Industrial` |
| Alternate template for variation testing | `Generic` |

Expected Engineering / Industrial dispatch fields:

| Order | Field Label |
|---|---|
| 1 | `Customer Name` |
| 2 | `Delivery Address` |
| 3 | `Part Name` |
| 4 | `Part No` |
| 5 | `Drawing No` |
| 6 | `Quantity` |
| 7 | `Unit` |
| 8 | `Material Grade` |
| 9 | `Heat/Lot No` |
| 10 | `Gross Weight` |
| 11 | `Net Weight` |
| 12 | `Vehicle No` |
| 13 | `Dispatch Date` |
| 14 | `Remarks` |

### 3.4 Onboarding Step 3 Field Review Data

Use these sample field edits during `Review & edit fields`.

Dispatch custom field to add:

| Property | Value |
|---|---|
| Label | `Customer PO No` |
| Key | `customer_po_no` |
| OCR Hint | `Customer purchase order number printed on dispatch tag` |
| Type | `Text` |
| Required | `Yes` |

Invoice custom field to add:

| Property | Value |
|---|---|
| Label | `E-Way Bill No` |
| Key | `e_way_bill_no` |
| OCR Hint | `E-Way Bill number printed on invoice or transport copy` |
| Type | `Text` |
| Required | `No` |

Field reorder for dispatch:
- Move `Dispatch Date` above `Vehicle No`

Field delete test:
- Add `Temporary Test Field`
- Then delete it before continuing

### 3.5 Onboarding Step 4 Cloud Sync Data

Use one of the two paths below.

Negative-path test data, safe for failure testing:

| Field | Value |
|---|---|
| Gemini API Key | `INVALID-GEMINI-KEY` |
| Apps Script Web App URL | `https://script.google.com/macros/s/INVALID/exec` |
| Google Sheets API Key | `INVALID-SHEETS-KEY` |
| Spreadsheet ID | `INVALID-SPREADSHEET-ID` |
| Dispatch Sheet Tab Name | `Dispatch` |
| Invoice Sheet Tab Name | `Invoices` |

Skip-path test:
- Click `Skip for now`

Positive-path test:
- Use real credentials from your environment
- Expected:
  - Apps Script `Test connection` should succeed
  - OCR should work only if a valid Gemini API key is configured
  - Read/history from Sheets needs a valid Sheets API key and Spreadsheet ID

### 3.6 Dispatch Happy-Path Data

Use these values for manual entry of a dispatch record:

| Field | Value |
|---|---|
| Customer Name | `Shree Precision Tools` |
| Delivery Address | `Gate 4, Plot 88, Chakan Industrial Area, Pune 410501` |
| Part Name | `Drive Shaft Assembly` |
| Part No | `DSA-4471-A` |
| Drawing No | `DRW-2219-REV03` |
| Quantity | `120` |
| Unit | `PCS` |
| Material Grade | `EN8` |
| Heat/Lot No | `HT-24-0917` |
| Gross Weight | `286.5` |
| Net Weight | `274.2` |
| Vehicle No | `MH12AB1234` |
| Dispatch Date | `18/03/2026` |
| Remarks | `Handle with care. Inspection report enclosed.` |

### 3.7 Dispatch Edge-Case Data

Use these to test invalid, partial, and unusual manual entries:

| Field | Value |
|---|---|
| Customer Name | `A` |
| Delivery Address | `Warehouse B` |
| Part Name | `Rotor Housing` |
| Part No | `RH-0007` |
| Drawing No | `` |
| Quantity | `0` |
| Unit | `pcs` |
| Material Grade | `SS304` |
| Heat/Lot No | `LOT#TEST@01` |
| Gross Weight | `99999.99` |
| Net Weight | `-1` |
| Vehicle No | `MH-INVALID` |
| Dispatch Date | `32/13/2026` |
| Remarks | `Test special chars: ! @ # % ^ & * ( ) / \ " ' , .` |

### 3.8 Invoice Happy-Path Data

Use these values for manual entry of an invoice:

| Field | Value |
|---|---|
| Party Name | `Shree Precision Tools` |
| GST Number | `27AAKCS4455L1Z2` |
| Invoice No | `INV-SPT-2026-0318-01` |
| Invoice Date | `18/03/2026` |
| Item Description | `Drive Shaft Assembly - Machined` |
| HSN/SAC Code | `84831099` |
| Quantity | `120` |
| Unit | `PCS` |
| Rate | `1850` |
| Taxable Amount | `222000` |
| CGST | `19980` |
| SGST | `19980` |
| IGST | `0` |
| Total Amount | `261960` |
| Bank Name | `HDFC Bank` |
| Account No | `50200012345678` |
| IFSC Code | `HDFC0001234` |
| Remarks | `Payment within 30 days.` |

### 3.9 Invoice Edge-Case Data

| Field | Value |
|---|---|
| Party Name | `Cash Customer` |
| GST Number | `INVALIDGST123` |
| Invoice No | `TEST/INV/0001` |
| Invoice Date | `00/00/2026` |
| Item Description | `Very long description test for invoice line item manual validation` |
| HSN/SAC Code | `ABC123` |
| Quantity | `-5` |
| Unit | `KG` |
| Rate | `0` |
| Taxable Amount | `1` |
| CGST | `0.5` |
| SGST | `0.5` |
| IGST | `999999` |
| Total Amount | `1000000` |
| Bank Name | `Test Bank` |
| Account No | `000000000000` |
| IFSC Code | `TEST0000001` |
| Remarks | `Edge-case numeric values and text.` |

### 3.10 Invalid Cloud Config Data

Use these for failure-path testing only:

| Field | Value |
|---|---|
| Gemini API Key | `INVALID-GEMINI-KEY` |
| Apps Script URL | `https://script.google.com/macros/s/INVALID/exec` |
| Sheets API Key | `INVALID-SHEETS-KEY` |
| Spreadsheet ID | `INVALID-SPREADSHEET-ID` |
| Dispatch Sheet Tab | `Dispatch` |
| Invoice Sheet Tab | `Invoices` |

## 4. OCR Test Source Text

The app accepts image upload, not plain text. To test OCR manually:
1. Copy one of the blocks below into Word, Google Docs, or Notepad.
2. Increase font size to 18 to 24.
3. Take a screenshot or save it as an image.
4. Upload that image in the scan area.

Expected OCR may vary because AI extraction is not deterministic, but the main required fields should be attempted.

### 4.1 Dispatch OCR Sample

```text
CUSTOMER NAME: Shree Precision Tools
DELIVERY ADDRESS: Gate 4, Plot 88, Chakan Industrial Area, Pune 410501
PART NAME: Drive Shaft Assembly
PART NO: DSA-4471-A
DRAWING NO: DRW-2219-REV03
QUANTITY: 120 PCS
MATERIAL GRADE: EN8
HEAT/LOT NO: HT-24-0917
GROSS WEIGHT: 286.5 KG
NET WEIGHT: 274.2 KG
VEHICLE NO: MH12AB1234
DISPATCH DATE: 18/03/2026
REMARKS: Handle with care
```

### 4.2 Invoice OCR Sample

```text
PARTY NAME: Shree Precision Tools
GST NUMBER: 27AAKCS4455L1Z2
INVOICE NO: INV-SPT-2026-0318-01
INVOICE DATE: 18/03/2026
ITEM DESCRIPTION: Drive Shaft Assembly - Machined
HSN/SAC CODE: 84831099
QUANTITY: 120
UNIT: PCS
RATE: 1850
TAXABLE AMOUNT: 222000
CGST: 19980
SGST: 19980
IGST: 0
TOTAL AMOUNT: 261960
BANK NAME: HDFC Bank
ACCOUNT NO: 50200012345678
IFSC CODE: HDFC0001234
REMARKS: Payment within 30 days
```

## 5. Full Manual Test Flow

## 5.1 First Launch and Onboarding

### Test Case 1: Onboarding Happy Path

Steps:
1. Open the app on a clean browser session.
2. Confirm the onboarding wizard opens instead of the dashboard.
3. In Step 1, enter the Company Setup Data from section 3.1.
4. Click `Continue`.
5. In Step 2, select `Engineering / Industrial` using section 3.3.
6. Click `Continue`.
7. In Step 3, review the dispatch and invoice fields.
8. For the first run, either:
   - do not change anything, or
   - use the optional sample edits from section 3.4
9. Click `Continue`.
10. In Step 4, either:
   - click `Skip for now`, or
   - use the failure-path cloud config from section 3.5
11. Finish onboarding.

Expected result:
- Onboarding completes.
- You land on the dashboard.
- Company name is visible in header.
- Only after reaching the app, an operator modal appears asking who is operating.

### Test Case 2: Onboarding Validation Errors

Steps:
1. Clear site data again.
2. Open onboarding.
3. Leave `Company Name` blank.
4. Enter GST as `123`.
5. Enter PIN `12`.
6. Enter Confirm PIN `34`.
7. Click `Continue`.

Expected result:
- Company name error shown.
- GST length error shown.
- PIN length error shown.
- PIN mismatch error shown.
- User cannot move to next step.

## 5.2 Operator Session

This section starts only after onboarding is fully completed and the app opens to the main dashboard.

## 5.2A Onboarding Step 2: Choose a Field Template

### Test Case 3A: Template Selection Happy Path

Steps:
1. Complete `Company identity`.
2. On `Choose a field template`, click `Engineering / Industrial`.
3. Verify the card is highlighted.
4. Click `Continue`.

Expected result:
- Selected template is visually highlighted.
- User moves to `Review & edit fields`.

### Test Case 3B: Blank Template Handling

Steps:
1. Open `Choose a field template`.
2. Do not select any template.
3. Check the `Continue` button.
4. Click `Start with blank fields` if you want the blank-schema path.

Expected result:
- `Continue` remains disabled until a template is selected.
- `Start with blank fields` moves to the next step with no prefilled fields.

## 5.2B Onboarding Step 3: Review & Edit Fields

### Test Case 3C: Review Default Fields

Steps:
1. After choosing `Engineering / Industrial`, open `Review & edit fields`.
2. Confirm dispatch fields match section 3.3.
3. Switch to the `Invoice Fields` tab.
4. Confirm invoice fields are present.

Expected result:
- Dispatch and invoice tabs are both available.
- Fields are visible in editable rows.

### Test Case 3D: Add, Edit, Reorder, and Delete Fields

Steps:
1. Stay on `Dispatch Fields`.
2. Click `Add field`.
3. Enter the dispatch custom field data from section 3.4.
4. Drag `Dispatch Date` above `Vehicle No`.
5. Add another field:
   - Label: `Temporary Test Field`
   - Key: `temporary_test_field`
   - OCR Hint: `Temporary field for delete test`
   - Type: `Text`
   - Required: `No`
6. Delete `Temporary Test Field`.
7. Switch to `Invoice Fields`.
8. Add the invoice custom field from section 3.4.
9. Click `Continue`.

Expected result:
- New fields can be added.
- Keys can be auto-generated from labels.
- Rows can be reordered by drag and drop.
- Deleted fields disappear immediately.
- User can continue to cloud setup.

## 5.2C Onboarding Step 4: Cloud Sync Setup

### Test Case 3E: Skip Cloud Setup

Steps:
1. On `Cloud sync setup`, do not enter any data.
2. Click `Skip for now`.

Expected result:
- Onboarding completes.
- App opens normally.
- Dashboard may later warn that cloud sync is not configured.

### Test Case 3F: Invalid Cloud Config During Onboarding

Steps:
1. On `Cloud sync setup`, enter the failure-path values from section 3.5.
2. Click `Test connection`.
3. Observe the result.
4. Click `Finish setup`.

Expected result:
- Test connection should fail.
- Onboarding should still be allowed to finish.
- The app should still work with local storage and local database.

### Test Case 3G: Positive Cloud Config During Onboarding

Steps:
1. On `Cloud sync setup`, enter real working credentials.
2. Click `Test connection`.
3. Confirm success message.
4. Click `Finish setup`.

Expected result:
- Apps Script connection succeeds.
- Onboarding completes.
- New saves should be eligible for sync.

### Test Case 4: Start Operator Session

Steps:
1. When operator modal opens, enter `Rohan Patil`.
2. Click `Start session`.

Expected result:
- Modal closes.
- Footer shows operator name.
- Top bar shows operator initials.

### Test Case 5: Switch Operator

Steps:
1. Click `Switch` in the top bar.
2. Wait for reload.
3. Enter `OP-02-Sneha`.
4. Click `Start session`.

Expected result:
- Operator changes to `OP-02-Sneha`.
- Previous operator names appear as quick chips the next time modal opens.

## 5.3 Settings and Admin PIN

### Test Case 6: PIN Gate Access

Steps:
1. Click `Settings`.
2. In PIN popup, enter `1111`.
3. Click `Unlock`.
4. Then enter `2468`.
5. Click `Unlock`.

Expected result:
- Wrong PIN shows `Incorrect PIN`.
- Correct PIN opens Settings.

## 5.4 Company Identity Settings

### Test Case 7: Edit Company Details

Steps:
1. In Settings, update:
   - Company Name: `MCCIA Advanced Engineering Pvt Ltd`
   - GST Number: `27AABCM1234D1Z9`
   - Address: `Plot 20, MIDC Bhosari, Pune, Maharashtra 411026`
2. Click `Save company details`.
3. Return to dashboard.

Expected result:
- Success alert shown.
- Updated company name appears in navbar/dashboard.

## 5.5 Dispatch Creation

### Test Case 8: Manual Dispatch Happy Path

Steps:
1. Go to `New Dispatch`.
2. Skip scan for now.
3. Fill the form with Dispatch Happy-Path Data from section 3.6.
4. Click `Save record`.

Expected result:
- Record saved screen appears.
- Slip number is generated in format `DS-YYMMDD-####`.
- Preview is shown.
- Created by shows current operator.

### Test Case 9: Required Fields Warning Modal

Steps:
1. Click `+ New slip`.
2. Fill only:
   - Customer Name: `Partial Test Buyer`
   - Quantity: `5`
3. Leave other required fields blank.
4. Click `Save record`.

Expected result:
- Warning modal opens.
- Missing required fields are listed.
- `Go back and fill` closes modal without saving.
- `Save anyway` saves the incomplete record.

### Test Case 10: Dispatch OCR Upload

Steps:
1. Prepare an image from section 4.1.
2. In `New Dispatch`, click `Upload image`.
3. Select the test image.
4. Wait for OCR completion.

Expected result:
- Status changes through optimization and OCR.
- OCR result auto-fills matching fields.
- Raw OCR response can be shown with the debug toggle.
- If some required fields are missed, status should show partial instead of full success.

### Test Case 11: Dispatch Camera Permission Failure

Steps:
1. In `New Dispatch`, click `Open camera`.
2. Deny browser camera permission.

Expected result:
- Status shows camera access denied message.
- Upload image option remains available.

### Test Case 12: Dispatch History and Detail

Steps:
1. Open `Dispatch History`.
2. Search for part of the customer name, for example `Shree`.
3. Open the saved record.
4. Check the audit trail and preview.

Expected result:
- Search filters records correctly.
- Detail page shows all field labels and values.
- Audit trail shows created time, operator, and schema version.

### Test Case 13: Dispatch Edit Within Grace Period

Steps:
1. Open a recently created dispatch record.
2. Click `Edit`.
3. Change `Remarks` to `Updated during grace period`.
4. Save record.

Expected result:
- Record is updated.
- Detail page shows `Edited` badge.
- Audit trail shows modified time and operator.

### Test Case 14: Dispatch Invalid / Edge Data

Steps:
1. Create a new dispatch record.
2. Enter Dispatch Edge-Case Data from section 3.7.
3. Click `Save record`.

Expected result:
- App should not crash.
- Numeric and date fields accept browser-level values only where applicable.
- Record may still save because validation is soft.
- Special characters should display correctly in detail/history/export.

## 5.6 Invoice Creation

### Test Case 15: Manual Invoice Happy Path

Steps:
1. Go to `New Invoice`.
2. Fill the form using Invoice Happy-Path Data from section 3.8.
3. Click `Save record`.

Expected result:
- Invoice saves successfully.
- Invoice ID is generated in format `INV-YYMM-####`.
- Preview is shown.

### Test Case 16: Invoice Required Warning

Steps:
1. Click `+ New invoice`.
2. Fill only:
   - Party Name: `Test Party`
   - Total Amount: `999`
3. Click `Save record`.

Expected result:
- Required fields warning modal opens.
- Save anyway still allows save.

### Test Case 17: Invoice OCR Upload

Steps:
1. Prepare an image from section 4.2.
2. Upload it in `New Invoice`.
3. Wait for OCR result.

Expected result:
- OCR attempts to fill invoice fields.
- Missing required fields produce partial status.
- Form remains editable after OCR.

### Test Case 18: Invoice History, Search, and Detail

Steps:
1. Open `Invoice History`.
2. Search `INV-SPT`.
3. Filter by operator if multiple records exist.
4. Open one invoice detail page.

Expected result:
- Search and filters work.
- Detail page shows full values and preview.

### Test Case 19: Invoice Edge Data

Steps:
1. Create a new invoice.
2. Enter Invoice Edge-Case Data from section 3.9.
3. Save record.

Expected result:
- App should not crash.
- Soft validation means unusual values may still save.
- Detail, history, and preview should render the saved values.

## 5.7 Schema Customization

### Test Case 20: Add Custom Dispatch Field

Steps:
1. Open `Settings`.
2. Unlock with PIN `2468`.
3. Go to `Field schema`.
4. Stay on `Dispatch`.
5. Click `Add field`.
6. Enter:
   - Label: `Customer PO No`
   - Key: auto-generated or `customer_po_no`
   - OCR Hint: `Customer purchase order number printed on the dispatch tag`
   - Type: `Text`
   - Required: checked
7. Click `Save schema`.
8. Open `New Dispatch`.

Expected result:
- New field appears in the dispatch form.
- Field order matches schema editor order.

### Test Case 21: Reorder and Delete Schema Fields

Steps:
1. In `Field schema`, drag `Customer PO No` near the top.
2. Save schema.
3. Confirm the dispatch form order changes.
4. Return to settings.
5. Delete `Customer PO No`.
6. Save schema again.

Expected result:
- Form order updates correctly after reorder.
- Deleted field no longer appears for new records.
- Old records still remain in storage, but detail rendering uses current schema labels only for current fields.

## 5.8 Cloud Config and Sync Failure Paths

### Test Case 22: Invalid Apps Script Config

Steps:
1. Open `Settings`.
2. Enter Invalid Cloud Config Data from section 3.10.
3. Click `Test` for Apps Script.
4. Click `Test` for Sheets.
5. Click `Save API config`.
6. Create a new dispatch or invoice.
7. Return to dashboard and settings sync log.

Expected result:
- Test buttons show failure messages.
- Saved records still save locally.
- Sync status may show pending or failing.
- Sync log should contain failure entries after sync attempts.

### Test Case 23: No Gemini API Key

Steps:
1. In Settings, clear Gemini API key and save.
2. Open `New Dispatch`.
3. Upload an OCR image.

Expected result:
- OCR fails gracefully.
- Failure message indicates no Gemini API key configured.
- Manual entry still works.

### Test Case 24: Force Sync Now

Steps:
1. With invalid Apps Script URL still saved, go to `Settings`.
2. Click `Force sync now`.

Expected result:
- App should not crash.
- Failed sync items remain visible in sync log/state.

## 5.9 Backup and Retention

### Test Case 25: Export Backup

Steps:
1. Open `Settings`.
2. Click `Export backup`.

Expected result:
- A JSON file downloads.
- File name starts with `dispatchflow_backup_`.

### Test Case 26: Import Backup

Steps:
1. Use the exported JSON file from the previous step.
2. Click `Import backup`.
3. Select the file.

Expected result:
- Import complete message appears.
- Records remain available after refresh.

### Test Case 27: Retention Sweep

Steps:
1. In Settings, set `Retain local records (months)` to `1`.
2. Save backup settings.
3. Click `Run retention sweep`.

Expected result:
- Alert shows number of deleted old records.
- Recent records should remain.

Note:
- To fully verify deletion, you need older-than-cutoff records already present in IndexedDB.

## 5.10 Session Lock and Admin Timeout

### Test Case 28: App Lock After Inactivity

Steps:
1. Open `Settings`.
2. Set `App lock after` to `5`.
3. Save session settings.
4. Do not interact with the app for 5 minutes.

Expected result:
- Full-screen session lock appears.
- Correct PIN unlocks the app.
- Wrong PIN shows error.

### Test Case 29: Admin Session Timeout

Steps:
1. In Settings, set `Admin timeout` to `15 minutes`.
2. Save session settings.
3. Leave admin area idle for more than 15 minutes.
4. Try entering Settings again.

Expected result:
- PIN gate should appear again.

## 5.11 History Export

### Test Case 30: Dispatch CSV Export

Steps:
1. Open `Dispatch History`.
2. Click `CSV`.
3. Open the downloaded file.

Expected result:
- CSV includes system fields first:
  - Slip/Invoice No
  - Created At
  - Created By
  - Schema Version
- Then schema field columns.

### Test Case 31: Invoice CSV Export

Steps:
1. Open `Invoice History`.
2. Click `CSV`.
3. Open the downloaded file.

Expected result:
- CSV downloads and values match visible invoice records.

## 6. Extra Edge Cases Checklist

Run these short scenarios after the main flow:

- Try blank operator name and confirm session cannot start.
- Try PIN shorter than 4 digits in PIN gate.
- Try changing PIN with wrong current PIN.
- Try changing PIN with mismatched confirmation.
- Try opening a random invalid route like `/abcxyz`.
- Try search with lowercase and uppercase text in history.
- Try date filter with only `From` date.
- Try date filter with only `To` date.
- Try mobile viewport and confirm navbar and forms remain usable.
- Try saving records with very long remarks.
- Try switching operator and confirming new records use the new operator name.

## 7. Known Behavior to Keep in Mind While Testing

- Required-field validation is soft. The app warns, but still allows save.
- Date fields are plain text inputs with placeholder `DD/MM/YYYY`, not strict date pickers in create forms.
- OCR output can be partial or inconsistent because it depends on image quality and AI output.
- Without valid cloud config, records still save locally.
- Existing detail pages render using current schema, not a historical schema snapshot UI.

## 8. Minimum Acceptance Criteria

Consider the application manually acceptable if all of the following pass:

- First-time setup works from a clean browser state.
- Operator session starts and persists for the day.
- Settings are protected by PIN.
- Dispatch can be created manually and viewed in history/detail.
- Invoice can be created manually and viewed in history/detail.
- OCR failures do not block manual work.
- Schema customization changes the forms for new records.
- Backup export works.
- Invalid sync config fails gracefully without losing local records.
- App lock and PIN unlock work.
