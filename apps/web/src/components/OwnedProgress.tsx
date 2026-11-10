import type { OwnedProgress as Progress } from '@living-dex/business-logic'

// Progress bar for the active collection (3.8 #21). Pure presentation.
function OwnedProgress({ progress }: { progress: Progress }) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>
          {progress.owned} / {progress.total} owned
        </span>
        <span>{progress.percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Owned progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        className="h-2 overflow-hidden rounded-full bg-border"
      >
        <div className="h-full bg-brand" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  )
}

export default OwnedProgress
