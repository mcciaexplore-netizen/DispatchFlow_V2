import { db } from '../db'
import { LS } from '../constants/storage'
import { TEMPLATES } from '../constants/schemaTemplates'
import { saveSchema } from './schema'

export async function populateDemoData(): Promise<void> {
  // Ensure default setup is marked complete
  localStorage.setItem(LS.SETUP_COMPLETE, 'true')

  // Set default MCCIA Company Info if not set
  if (!localStorage.getItem(LS.COMPANY)) {
    localStorage.setItem(
      LS.COMPANY,
      JSON.stringify({
        name: 'MCCIA Manufacturing & Automation Hub',
        gst: '27AAAAA0000A1Z5',
        address: 'MCCIA Bhavan, Senapati Bapat Road, Pune, Maharashtra 411016',
        logoBase64: '/mccia-logo.png',
      })
    )
  }

  // Ensure default schema templates are initialized
  const defaultTemplate = TEMPLATES[2] || TEMPLATES[0] // engineering or textile
  saveSchema('dispatch', defaultTemplate.dispatch)
  saveSchema('invoice', defaultTemplate.invoice)

  // Seed sample dispatches
  const count = await db.dispatch.count()
  if (count === 0) {
    const now = new Date()
    const sampleDispatches = [
      {
        slipNumber: 'DSP-2026-001',
        createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
        createdBy: 'Demo Operator',
        schemaVersion: new Date().toISOString(),
        recordType: 'dispatch' as const,
        payload: {
          party_name: 'Tata Motors Component Div',
          buyer_name: 'Tata Motors Component Div',
          destination: 'Pune MIDC, Bhosari',
          item_description: 'Precision CNC Machined Shafts 45mm',
          part_name_no: 'SHAFT-CNC-45X',
          part_number: 'SHAFT-CNC-45X',
          quantity: '500',
          gross_weight: '350',
          net_weight: '320',
          roll_count: '10',
          vehicle_no: 'MH-12-RN-4821',
          driver_name: 'Suresh Patil',
          dispatch_date: new Date().toLocaleDateString('en-IN'),
          remarks: 'QC Passed - Batch A14',
        },
      },
      {
        slipNumber: 'DSP-2026-002',
        createdAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
        createdBy: 'Demo Operator',
        schemaVersion: new Date().toISOString(),
        recordType: 'dispatch' as const,
        payload: {
          party_name: 'Bharat Forge Ltd',
          buyer_name: 'Bharat Forge Ltd',
          destination: 'Mundhwa Industrial Area, Pune',
          item_description: 'Forged Flanges ANSI 150',
          part_name_no: 'FLANGE-F150',
          part_number: 'FLANGE-F150',
          quantity: '250',
          gross_weight: '820',
          net_weight: '790',
          roll_count: '5',
          vehicle_no: 'MH-14-GH-9932',
          driver_name: 'Rajendra Deshmukh',
          dispatch_date: new Date(now.getTime() - 24 * 3600 * 1000).toLocaleDateString('en-IN'),
          remarks: 'Urgent line delivery',
        },
      },
      {
        slipNumber: 'DSP-2026-003',
        createdAt: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
        createdBy: 'Demo Operator',
        schemaVersion: new Date().toISOString(),
        recordType: 'dispatch' as const,
        payload: {
          party_name: 'Thermax Ltd Engineering',
          buyer_name: 'Thermax Ltd Engineering',
          destination: 'Chinchwad, Pune',
          item_description: 'Heat Exchanger Tube Bundles',
          part_name_no: 'HEX-TB-09',
          part_number: 'HEX-TB-09',
          quantity: '12',
          gross_weight: '1450',
          net_weight: '1380',
          roll_count: '2',
          vehicle_no: 'MH-12-TK-2020',
          driver_name: 'Anil Jadhav',
          dispatch_date: new Date(now.getTime() - 48 * 3600 * 1000).toLocaleDateString('en-IN'),
          remarks: 'Custom fabricated stainless steel 316',
        },
      },
    ]

    for (const d of sampleDispatches) {
      await db.dispatch.add(d)
    }
  }

  // Seed sample invoices
  const invCount = await db.invoice.count()
  if (invCount === 0) {
    const now = new Date()
    const sampleInvoices = [
      {
        slipNumber: 'INV-2026-089',
        createdAt: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(),
        createdBy: 'Demo Operator',
        schemaVersion: new Date().toISOString(),
        recordType: 'invoice' as const,
        payload: {
          party_name: 'Bajaj Auto Ltd',
          gst_number: '27AABCB2018A1Z2',
          invoice_no: 'INV-2026-089',
          invoice_date: new Date().toLocaleDateString('en-IN'),
          item_description: 'Brake Caliper Assemblies & Mounting Brackets',
          hsn_sac_code: '8708',
          quantity: '150',
          unit: 'pcs',
          rate: '1450',
          taxable_amount: '217500',
          cgst: '19575',
          sgst: '19575',
          igst: '0',
          total_amount: '256650',
          bank_name: 'State Bank of India',
          account_no: '38291048201',
          ifsc_code: 'SBIN0001423',
          remarks: 'Payment terms 30 days',
        },
      },
      {
        slipNumber: 'INV-2026-090',
        createdAt: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
        createdBy: 'Demo Operator',
        schemaVersion: new Date().toISOString(),
        recordType: 'invoice' as const,
        payload: {
          party_name: 'Kirloskar Oil Engines Ltd',
          gst_number: '27AAACK1204K1ZV',
          invoice_no: 'INV-2026-090',
          invoice_date: new Date(now.getTime() - 12 * 3600 * 1000).toLocaleDateString('en-IN'),
          item_description: 'Diesel Engine Gasket Sets Grade-A',
          hsn_sac_code: '8409',
          quantity: '300',
          unit: 'sets',
          rate: '480',
          taxable_amount: '144000',
          cgst: '12960',
          sgst: '12960',
          igst: '0',
          total_amount: '169920',
          bank_name: 'HDFC Bank',
          account_no: '50200018294821',
          ifsc_code: 'HDFC0000007',
          remarks: 'Delivered at Khadki facility',
        },
      },
    ]

    for (const inv of sampleInvoices) {
      await db.invoice.add(inv)
    }
  }
}
