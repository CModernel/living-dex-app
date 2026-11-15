import { donateUrl } from '../lib/edition'

// 3.76: a plain message and one external link, hosted edition only (nothing renders without VITE_DONATE_URL). No amounts,
// no progress bar, no perks: see docs/EDITIONS.md for why.
function SupportNote({ className = '' }: { className?: string }) {
  if (!donateUrl) return null
  return (
    <p className={className}>
      Living Dex is free. Donations help cover hosting costs and don't unlock anything.{' '}
      <a href={donateUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline">
        Support
      </a>
    </p>
  )
}

export default SupportNote
