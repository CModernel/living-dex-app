// 3.73 build editions: one repository, two kinds of build (docs/EDITIONS.md).
//  - `hosted` (default): optional capabilities such as cloud sync are available when configured.
//  - `community`: local-only. No account, no cloud, no hosted integrations, whatever the environment holds.
// Chosen at build time with VITE_EDITION. This is a build switch, not security: access to protected data is enforced by
// the backend (row level security), never by hiding UI.

export type Edition = 'community' | 'hosted'

export const edition: Edition = import.meta.env.VITE_EDITION === 'community' ? 'community' : 'hosted'

/** Capabilities per edition; add one flag per optional integration (ads and analytics would go here too). */
export const capabilities = {
  cloudSync: edition === 'hosted',
} as const

// 3.76 support link (docs/EDITIONS.md): an external donate page, hosted edition only. Read behind the literal comparison so a
// community bundle does not carry the value; only an https URL is accepted, so a typo can never become a script link.
const COMMUNITY = import.meta.env.VITE_EDITION === 'community'
const RAW_DONATE_URL = !COMMUNITY ? (import.meta.env.VITE_DONATE_URL as string | undefined) : undefined
export const donateUrl: string | undefined = RAW_DONATE_URL?.startsWith('https://') ? RAW_DONATE_URL : undefined
