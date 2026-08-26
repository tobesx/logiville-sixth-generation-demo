// Deterministic, seeded demo data for the Forecast Detail page.
// Same numbers on every reload — no Math.random at runtime.

export type Category = 'Beverages' | 'Snacks' | 'Dairy' | 'Household' | 'Frozen'

export const CATEGORIES: Category[] = ['Beverages', 'Snacks', 'Dairy', 'Household', 'Frozen']

export const WEEK_LABELS = [
  '31/08', '07/09', '14/09', '21/09', '28/09', '05/10', '12/10', '19/10',
  '26/10', '02/11', '09/11', '16/11', '23/11', '30/11', '07/12', '14/12',
]

export const SEASONALITY = [
  1.24, 1.28, 0.92, 0.99, 0.96, 1.03, 0.86, 0.81,
  0.88, 0.83, 0.85, 0.57, 0.63, 0.61, 0.47, 0.43,
]

const PREFIX: Record<Category, string> = {
  Beverages: 'BEV',
  Snacks: 'SNK',
  Dairy: 'DRY',
  Household: 'HOU',
  Frozen: 'FRZ',
}

const NAMES: Record<Category, string[]> = {
  Beverages: [
    'Sparkling water 1L', 'Cola 1.5L', 'Orange juice 1L', 'Still water 6×0.5L',
    'Energy drink 250ml', 'Iced tea 1L', 'Tonic water 4×0.2L', 'Apple juice 1L',
    'Lemonade 1.5L', 'Cold brew coffee 250ml',
  ],
  Snacks: [
    'Salted crisps 175g', 'Tortilla chips 200g', 'Roasted peanuts 300g', 'Chocolate bar 100g',
    'Salted pretzels 250g', 'Popcorn 90g', 'Mixed nuts 250g', 'Rice crackers 100g',
    'Fruit gums 150g', 'Granola bar 6-pack',
  ],
  Dairy: [
    'Semi-skim milk 1L', 'Greek yogurt 500g', 'Butter 250g', 'Gouda cheese 400g',
    'Whipping cream 200ml', 'Cottage cheese 200g', 'Whole milk 1L', 'Mozzarella 125g',
    'Fruit yogurt 4×125g', 'Sour cream 200ml',
  ],
  Household: [
    'Dish soap 500ml', 'Laundry pods 24-pack', 'Kitchen roll 4-pack', 'Toilet paper 8-pack',
    'All-purpose cleaner 750ml', 'Trash bags 30L 20-pack', 'Sponges 6-pack', 'Fabric softener 1L',
    'Glass cleaner 500ml', 'Aluminium foil 30m',
  ],
  Frozen: [
    'Pizza margherita', 'Frozen fries 1kg', 'Fish fingers 15-pack', 'Vanilla ice cream 1L',
    'Frozen peas 750g', 'Chicken nuggets 500g', 'Frozen berries 400g', 'Spinach portions 600g',
    'Frozen lasagne 400g', 'Garlic bread 2-pack',
  ],
}

export type Sku = {
  id: string
  code: string
  name: string
  category: Category
  values: number[] // 16 weekly forecast quantities
  prevYear: number[] // 16
  budget: number[] // 16
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const SKU_COUNT = 72

let cached: Sku[] | null = null

export function buildSkus(): Sku[] {
  if (cached) return cached
  const skus: Sku[] = []
  for (let r = 0; r < SKU_COUNT; r++) {
    const category = CATEGORIES[r % 5] as Category
    const rand = mulberry32(r * 7919 + 12345)
    const base = 20 + rand() * 120 // 20 – 140
    const promoWeek = Math.floor(rand() * 16)
    const promoMult = 1.9 + rand() * 0.5 // 1.9 – 2.4

    const values: number[] = []
    const prevYear: number[] = []
    const budget: number[] = []
    for (let w = 0; w < 16; w++) {
      const noise = 0.82 + rand() * 0.36 // 0.82 – 1.18
      let v = base * (SEASONALITY[w] as number) * noise
      if (w === promoWeek) v *= promoMult
      const val = Math.max(1, Math.round(v))
      values.push(val)
      prevYear.push(Math.round(val * (0.78 + rand() * 0.08))) // 78 – 86 %
      budget.push(Math.round(val * (0.9 + rand() * 0.06))) // 90 – 96 %
    }

    const nameList = NAMES[category]
    const name = nameList[Math.floor(r / 5) % nameList.length] as string
    skus.push({
      id: `sku-${r}`,
      code: `${PREFIX[category]}-${10000 + r * 20}`,
      name,
      category,
      values,
      prevYear,
      budget,
    })
  }
  cached = skus
  return skus
}

// ---- helpers ----

const THIN = '\u2009'

export function fmt(n: number): string {
  const rounded = Math.round(n)
  const sign = rounded < 0 ? '-' : ''
  const digits = Math.abs(rounded).toString()
  const withSep = digits.replace(/\B(?=(\d{3})+(?!\d))/g, THIN)
  return sign + withSep
}

export function fmtPct(n: number, signed = true): string {
  const rounded = Math.round(n * 10) / 10
  const sign = signed && rounded > 0 ? '+' : rounded < 0 ? '\u2212' : signed ? '+' : ''
  return `${sign}${Math.abs(rounded).toFixed(1)}${THIN}%`
}

export function editKey(skuId: string, week: number): string {
  return `${skuId}:${week}`
}

// value with edits applied
export function cellValue(sku: Sku, week: number, edits: Record<string, number>): number {
  const key = editKey(sku.id, week)
  const edited = edits[key]
  return edited === undefined ? (sku.values[week] as number) : edited
}

export function rowTotal(sku: Sku, edits: Record<string, number>): number {
  let t = 0
  for (let w = 0; w < 16; w++) t += cellValue(sku, w, edits)
  return t
}

export function rowMax(sku: Sku, edits: Record<string, number>): number {
  let m = 0
  for (let w = 0; w < 16; w++) m = Math.max(m, cellValue(sku, w, edits))
  return m
}

export function rowAvg(sku: Sku, edits: Record<string, number>): number {
  return rowTotal(sku, edits) / 16
}

// Alert = value greater than 1.75× the row average (promo spike)
export function isAlert(sku: Sku, week: number, edits: Record<string, number>): boolean {
  return cellValue(sku, week, edits) > 1.75 * rowAvg(sku, edits)
}
