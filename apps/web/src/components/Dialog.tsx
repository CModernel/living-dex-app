import { useEffect, useRef, type ReactNode } from 'react'

// Shared modal: blurred backdrop, rounded card, fade/scale-in (see index.css; reduced-motion safe).
// Closes on Escape and on a backdrop click. Focus moves into the dialog on open unless a child
// already took it (e.g. an autoFocus input).
function Dialog({
  label,
  onClose,
  children,
  className = 'w-80',
}: {
  label: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const card = cardRef.current
    if (card && !card.contains(document.activeElement)) card.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={`dialog-card max-h-[85vh] max-w-full overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-2xl outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  )
}

export default Dialog
