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
