import { useRef, type ReactNode } from 'react'
import Dialog from './Dialog'

// A styled confirmation instead of window.confirm. Destructive actions focus Cancel first, so a stray Enter is safe.
function ConfirmDialog({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  danger = false,
  icon,
}: {
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
  icon?: string
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog label={title} onClose={onCancel} className="w-[26rem]">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          {icon && (
            <span
              aria-hidden="true"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${danger ? 'bg-red-500/15' : 'bg-brand/15'}`}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-semibold">{title}</h3>
            <div className="mt-1 text-sm text-muted">{children}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button ref={cancelRef} type="button" autoFocus={danger} onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
          <button type="button" autoFocus={!danger} onClick={onConfirm} className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

export default ConfirmDialog
