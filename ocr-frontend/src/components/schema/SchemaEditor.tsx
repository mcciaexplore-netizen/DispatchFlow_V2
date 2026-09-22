import { useCallback } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SchemaField, FieldType } from '../../types'
import { Button } from '../ui/Button'

interface Props {
  fields: SchemaField[]
  onChange: (fields: SchemaField[]) => void
  readOnly?: boolean
}

const SYSTEM_FIELDS = [
  { label: 'Slip / Invoice Number', key: 'slipNumber' },
  { label: 'Created At', key: 'createdAt' },
  { label: 'Created By', key: 'createdBy' },
  { label: 'Schema Version', key: 'schemaVersion' },
]

const TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text',   label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date',   label: 'Date' },
]

function toKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

// ── Sortable row ──────────────────────────────────────────────────────────
function SortableRow({ field, onChange, onDelete, readOnly }: {
  field: SchemaField
  onChange: (id: string, patch: Partial<SchemaField>) => void
  onDelete: (id: string) => void
  readOnly?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[24px_1fr_1fr_2fr_80px_60px_44px] gap-2 items-center bg-surface border border-border rounded px-3 py-2"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted touch-none"
        aria-label="Drag to reorder"
        disabled={readOnly}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-6 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </button>

      {/* Label */}
      <input
        className="rounded border border-border bg-bg px-2 py-1 text-sm font-body text-text focus:outline-none focus:border-accent w-full"
        placeholder="Label"
        value={field.label}
        disabled={readOnly}
        onChange={e => {
          const label = e.target.value
          onChange(field.id, { label, key: toKey(label) })
        }}
      />

      {/* Key */}
      <input
        className="rounded border border-border bg-bg px-2 py-1 text-sm font-mono text-muted focus:outline-none focus:border-accent w-full"
        placeholder="key"
        value={field.key}
        disabled={readOnly}
        onChange={e => onChange(field.id, { key: e.target.value })}
      />

      {/* OCR description */}
      <input
        className="rounded border border-border bg-bg px-2 py-1 text-sm font-body text-text focus:outline-none focus:border-accent w-full"
        placeholder="OCR hint (plain English)"
        value={field.description}
        disabled={readOnly}
        onChange={e => onChange(field.id, { description: e.target.value })}
      />

      {/* Type */}
      <select
        className="rounded border border-border bg-bg px-2 py-1 text-sm font-body text-text focus:outline-none focus:border-accent"
        value={field.type}
        disabled={readOnly}
        onChange={e => onChange(field.id, { type: e.target.value as FieldType })}
      >
        {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Required */}
      <label className="flex items-center justify-center gap-1 text-sm text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={field.required}
          disabled={readOnly}
          className="accent-accent w-4 h-4"
          onChange={e => onChange(field.id, { required: e.target.checked })}
        />
        Req
      </label>

      {/* Delete */}
      <button
        onClick={() => onDelete(field.id)}
        disabled={readOnly}
        className="text-danger hover:text-danger/70 transition-colors disabled:opacity-30 flex items-center justify-center min-h-touch"
        aria-label="Delete field"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

// ── Main SchemaEditor ─────────────────────────────────────────────────────
export function SchemaEditor({ fields, onChange, readOnly = false }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex(f => f.id === active.id)
      const newIndex = fields.findIndex(f => f.id === over.id)
      onChange(arrayMove(fields, oldIndex, newIndex))
    }
  }, [fields, onChange])

  const handleChange = useCallback((id: string, patch: Partial<SchemaField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...patch } : f))
  }, [fields, onChange])

  const handleDelete = useCallback((id: string) => {
    onChange(fields.filter(f => f.id !== id))
  }, [fields, onChange])

  const addField = () => {
    const newField: SchemaField = {
      id: crypto.randomUUID(),
      label: '',
      key: '',
      description: '',
      type: 'text',
      required: false,
    }
    onChange([...fields, newField])
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Column headers */}
      <div className="grid grid-cols-[24px_1fr_1fr_2fr_80px_60px_44px] gap-2 px-3 text-xs font-mono text-muted uppercase tracking-wide">
        <span />
        <span>Label</span>
        <span>Key</span>
        <span>OCR Hint</span>
        <span>Type</span>
        <span>Req?</span>
        <span />
      </div>

      {/* Sortable field rows */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {fields.map(field => (
              <SortableRow
                key={field.id}
                field={field}
                onChange={handleChange}
                onDelete={handleDelete}
                readOnly={readOnly}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {fields.length === 0 && (
        <p className="text-sm text-muted text-center py-4">
          No fields defined. Add a field or select a template above.
        </p>
      )}

      {/* Add field button */}
      {!readOnly && (
        <Button variant="ghost" size="sm" onClick={addField} className="self-start">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add field
        </Button>
      )}

      {/* Locked system fields */}
      <div className="mt-4 border-t border-border pt-3">
        <p className="text-xs font-mono text-muted uppercase tracking-wide mb-2">System fields (always stored, not editable)</p>
        <div className="flex flex-col gap-1">
          {SYSTEM_FIELDS.map(sf => (
            <div key={sf.key} className="grid grid-cols-[24px_1fr_1fr] gap-2 items-center px-3 py-1.5 bg-bg rounded border border-border/50 opacity-60">
              <svg className="w-3 h-3 text-muted" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" /></svg>
              <span className="text-sm font-body text-muted">{sf.label}</span>
              <span className="text-sm font-mono text-muted">{sf.key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
