# Editions: one repository, several builds (TODO 3.73)

| | `hosted` (default) | `community` |
| --- | --- | --- |
| Cloud sync / accounts | available when `VITE_SUPABASE_*` are set | never, even if they are set |
| Data | local, optional cloud | local only |
| Ads / analytics | none exist today; would be enabled only here | never |

Choose with `VITE_EDITION=community|hosted` at build time (`apps/web/src/lib/edition.ts`; one flag per optional capability
in `capabilities`). The deploy workflow passes it from the Actions variable `VITE_EDITION`; unset means hosted. Today the
GitHub Pages deploy is the only target. A second deploy (for example Vercel) is a new pipeline from the same repository with
its own variables, never a copy of the code.

Rules
- **No ads, no in-app payments, no paid features, no public "raised / needed" amounts** (decision 3.75). Support is a plain
  message plus an external donate link (`VITE_DONATE_URL`), hosted edition only, never in a store build. The link must not
  imply perks or affiliation.
- Two deployments, one repo: `community` on GitHub Pages (free, no login, import/export only) and `hosted` on Cloudflare Pages
  or Netlify free (login + sync, optional support message). Check the host's current terms before moving.
- Core features never depend on a host, an ad network or an auth service.
- A hidden button is not security: access to cloud data is enforced by row level security. No secrets in `VITE_*` values.
- Add monetization or accounts only when there is a concrete need; keep extension points, not speculative code.
- GitHub Pages terms restrict commercial use (ads, SaaS): re-check them before putting ads on a Pages-hosted build, or host
  the ad-supported edition elsewhere. Repo licence is MIT (see `LICENSE`); revisit if reuse needs restricting.

Test both builds: `VITE_EDITION=community npm run build:web` and the default build; `lib/edition.test.ts` covers the flag.

Legal review before any real income; donations may be taxable income depending on the country.
