DESIGN_BRIEF_START
THEME: warm-industrial

PERSONALITY: precise grounded

FONTS:
  Heading: Barlow Semi Condensed 700
  Body:    Source Sans 3 400
  Accent:  JetBrains Mono 500

COLORS (CSS variables — all hex values):
  --color-bg:          #F4F1EC   ← warm unbleached paper — daylight readable
  --color-surface:     #FDFCF9   ← slightly lighter, cards and panels
  --color-border:      #DDD8CF   ← warm grey dividers, not cold
  --color-text:        #1E1B17   ← near-black with warmth
  --color-text-muted:  #706A62   ← labels, secondary text
  --color-primary:     #2C2824   ← deep charcoal-brown — grounded, industrial
  --color-accent:      #E07B00   ← amber — CTAs, active states, warnings
  --color-success:     #2D7A4F
  --color-warning:     #C4780A
  --color-danger:      #B83232

BACKGROUND:  Flat warm off-white (#F4F1EC) with 2% opacity fine paper grain noise overlay applied via SVG filter — no gradients, no geometric patterns.
MOTION:      150ms ease-out stagger on list/table rows at page load (20ms delay per row); 180ms ease-out scale(1.01) lift on card focus; instant 80ms snap on form auto-fill field highlight (amber left-border flash).
LAYOUT:      Compact high-density — 8px base grid, 12px row padding in tables, cards used only for scan/preview contexts, tables/lists for history; minimum 44px touch targets on all interactive elements for tablet use.
AVOID:       Pill-shaped gradient buttons with box shadows (consumer fintech), frosted glass panels (mismatched to factory context), animated loading skeletons on a localStorage-first app that loads instantly.
REFERENCE:   Linear issue tracker information density meets a Mettler Toledo weighbridge terminal display — precision instrument aesthetics, warm neutral base, amber as the only expressive color.
DESIGN_BRIEF_END
