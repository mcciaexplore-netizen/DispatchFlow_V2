import type { SchemaField } from '../types'

function f(label: string, description: string, type: SchemaField['type'] = 'text', required = false): SchemaField {
  const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  return { id: crypto.randomUUID(), label, key, description, type, required }
}

export type TemplateId = 'textile' | 'pharma' | 'engineering' | 'food' | 'generic'

export interface Template {
  id: TemplateId
  name: string
  icon: string
  dispatch: SchemaField[]
  invoice: SchemaField[]
}

const genericInvoiceFields: SchemaField[] = [
  f('Party Name',    'Name of the buyer or seller printed at the top', 'text', true),
  f('GST Number',    'GSTIN of the party (15-character alphanumeric)', 'text', true),
  f('Invoice No',    'Invoice or bill number', 'text', true),
  f('Invoice Date',  'Date the invoice was issued (DD/MM/YYYY)', 'date', true),
  f('Item Description', 'Short description of goods or services'),
  f('HSN/SAC Code',  'HSN code for goods or SAC code for services'),
  f('Quantity',      'Total quantity or units billed', 'number'),
  f('Unit',          'Unit of measurement (kg, pcs, mtrs, etc.)'),
  f('Rate',          'Rate per unit', 'number'),
  f('Taxable Amount','Amount before tax', 'number'),
  f('CGST',          'Central GST amount', 'number'),
  f('SGST',          'State GST amount', 'number'),
  f('IGST',          'Integrated GST amount (inter-state)', 'number'),
  f('Total Amount',  'Final invoice total including tax', 'number', true),
  f('Bank Name',     'Bank name for payment'),
  f('Account No',    'Bank account number'),
  f('IFSC Code',     'IFSC code of the bank branch'),
  f('Remarks',       'Any additional notes on the invoice'),
]

export const TEMPLATES: Template[] = [
  {
    id: 'textile',
    name: 'Textile / Garment',
    icon: '🧵',
    dispatch: [
      f('Buyer Name',      'Name of the buyer or consignee at the top of the tag', 'text', true),
      f('Destination',     'City or location the shipment is going to', 'text', true),
      f('Fabric Type',     'Type of fabric (cotton, polyester, silk, etc.)'),
      f('Color',           'Color or shade of the fabric/garment'),
      f('Design/Article No', 'Article number, design code, or style reference'),
      f('Roll Count',      'Number of rolls or pieces in this dispatch', 'number', true),
      f('Gross Weight',    'Total gross weight in kg including packaging', 'number', true),
      f('Net Weight',      'Net weight in kg excluding packaging', 'number', true),
      f('Bale/Bundle No',  'Bale number or bundle identifier'),
      f('Vehicle No',      'Vehicle registration number'),
      f('Driver Name',     'Name of the driver'),
      f('Dispatch Date',   'Date of dispatch from the facility (DD/MM/YYYY)', 'date', true),
      f('Remarks',         'Any additional notes or instructions'),
    ],
    invoice: genericInvoiceFields,
  },
  {
    id: 'pharma',
    name: 'Pharma',
    icon: '💊',
    dispatch: [
      f('Party Name',      'Name of the receiving party or stockist', 'text', true),
      f('Destination',     'City or location the shipment is going to', 'text', true),
      f('Product Name',    'Name of the pharmaceutical product', 'text', true),
      f('Batch No',        'Manufacturing batch or lot number', 'text', true),
      f('Mfg Date',        'Date of manufacture (MM/YYYY or DD/MM/YYYY)', 'date', true),
      f('Expiry Date',     'Expiry date of the product (MM/YYYY)', 'date', true),
      f('Quantity (Units)', 'Number of units, strips, or vials', 'number', true),
      f('Pack Size',       'Pack configuration (e.g. 10x10, 1x30)'),
      f('Invoice No',      'Accompanying invoice or challan number'),
      f('Transport Mode',  'Mode of transport (road, air, courier, etc.)'),
      f('Cold Chain Required', 'Whether cold chain is required (Yes / No)'),
      f('Dispatch Date',   'Date of dispatch (DD/MM/YYYY)', 'date', true),
      f('Remarks',         'Special handling instructions or notes'),
    ],
    invoice: genericInvoiceFields,
  },
  {
    id: 'engineering',
    name: 'Engineering / Industrial',
    icon: '⚙️',
    dispatch: [
      f('Customer Name',   'Name of the customer or end-user', 'text', true),
      f('Delivery Address','Full delivery address or plant location', 'text', true),
      f('Part Name',       'Name or description of the part', 'text', true),
      f('Part No',         'Part number or item code', 'text', true),
      f('Drawing No',      'Engineering drawing or revision number'),
      f('Quantity',        'Number of pieces or assemblies', 'number', true),
      f('Unit',            'Unit of measurement (pcs, sets, kg, etc.)'),
      f('Material Grade',  'Material specification or grade (e.g. EN8, SS304)'),
      f('Heat/Lot No',     'Heat number or production lot identifier'),
      f('Gross Weight',    'Gross weight in kg including packaging', 'number'),
      f('Net Weight',      'Net weight in kg of the parts only', 'number'),
      f('Vehicle No',      'Vehicle registration number'),
      f('Dispatch Date',   'Date of dispatch (DD/MM/YYYY)', 'date', true),
      f('Remarks',         'Quality remarks, special instructions, or certifications'),
    ],
    invoice: genericInvoiceFields,
  },
  {
    id: 'food',
    name: 'Food & Agri',
    icon: '🌾',
    dispatch: [
      f('Buyer Name',      'Name of the buyer or mandi trader', 'text', true),
      f('Destination',     'Destination mandi, city, or warehouse', 'text', true),
      f('Commodity',       'Commodity name (wheat, rice, onion, etc.)', 'text', true),
      f('Variety',         'Variety or grade of the commodity'),
      f('Grade',           'Quality grade (A, B, FAQ, etc.)'),
      f('Quantity (Bags/Units)', 'Number of bags, crates, or units', 'number', true),
      f('Gross Weight',    'Total gross weight in kg or quintal', 'number', true),
      f('Net Weight',      'Net weight excluding packaging', 'number', true),
      f('Truck No',        'Truck or vehicle registration number'),
      f('Driver Name',     'Name of the driver'),
      f('Mandi/Origin',    'Name of the originating mandi or farm location'),
      f('FSSAI No',        'FSSAI license number of the consignor'),
      f('Dispatch Date',   'Date of dispatch (DD/MM/YYYY)', 'date', true),
      f('Remarks',         'Moisture content, storage instructions, or notes'),
    ],
    invoice: genericInvoiceFields,
  },
  {
    id: 'generic',
    name: 'Generic',
    icon: '📦',
    dispatch: [
      f('Party Name',      'Name of the receiving party', 'text', true),
      f('Destination',     'City or address of the destination', 'text', true),
      f('Item Description','Short description of the goods', 'text', true),
      f('Quantity',        'Number of units or pieces', 'number', true),
      f('Unit',            'Unit of measurement (pcs, kg, boxes, etc.)'),
      f('Weight',          'Total weight in kg', 'number'),
      f('Reference No',    'Purchase order, challan, or reference number'),
      f('Vehicle No',      'Vehicle registration number'),
      f('Dispatch Date',   'Date of dispatch (DD/MM/YYYY)', 'date', true),
      f('Remarks',         'Any special instructions or notes'),
    ],
    invoice: genericInvoiceFields,
  },
]

export function getTemplate(id: TemplateId): Template {
  return TEMPLATES.find(t => t.id === id) ?? TEMPLATES[TEMPLATES.length - 1]
}
