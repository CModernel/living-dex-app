import type { ReactNode } from 'react'
import { Link, useInRouterContext } from 'react-router'

// Link to the /tiers guide (3.19b). Falls back to a plain anchor outside a router (component tests).
function GuideLink({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  const inRouter = useInRouterContext()
  return inRouter ? (
    <Link to="/tiers" className={className} aria-label={label} title={label}>
      {children}
    </Link>
  ) : (
    <a href="tiers" className={className} aria-label={label} title={label}>
      {children}
    </a>
  )
}

export default GuideLink
