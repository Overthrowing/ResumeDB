/** Model choices offered anywhere the user picks one. */
export const MODELS = ['haiku', 'sonnet', 'opus', 'fable']

/** Recommended model per task. Mirrors the backend defaults in
 * backend/resumedb/config.py - the two must name the same models. */
export const DEFAULT_MODEL = {
  chat: 'sonnet',
  tailor: 'opus',
  audit: 'sonnet',
  jd: 'haiku',
} as const

export type ModelKind = keyof typeof DEFAULT_MODEL

/** Option label. Exactly one option per dropdown carries the suffix: the one
 * that is that setting's default. */
export const modelLabel = (m: string, kind: ModelKind) => (m === DEFAULT_MODEL[kind] ? `${m} (default)` : m)

/**
 * Coerce a stored value onto a real option. Config and localStorage can both
 * still hold `null` or the legacy `''` that used to mean "the CLI's default",
 * and neither may reach a `<Select>` - an unmatched value renders a blank
 * trigger.
 */
export const resolveModel = (m: string | null | undefined, kind: ModelKind): string =>
  m && MODELS.includes(m) ? m : DEFAULT_MODEL[kind]

/** Reasoning-effort choices. Unlike the model, effort still has a real
 * "let the CLI decide" option, which is the empty value. */
export const EFFORTS = ['', 'low', 'medium', 'high', 'xhigh', 'max']

/** Radix Select cannot hold an empty string as a value, so the "no explicit
 * effort" choice travels as this sentinel and is mapped back to null on save. */
export const EFFORT_DEFAULT = 'default'

/** Same guard as resolveModel: a hand-edited config can hold an effort outside
 * the list, and an unmatched value renders a blank trigger. */
export const resolveEffort = (e: string | null | undefined): string =>
  e && EFFORTS.includes(e) ? e : EFFORT_DEFAULT
