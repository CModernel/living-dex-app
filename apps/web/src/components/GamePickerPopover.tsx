import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { computePopoverPosition } from '../lib/popoverPosition'
import GameChips from './GameChips'

export type GamePickerOption = {
  id: string
  name: string
  // Extra context after the name, e.g. "conditional" or "not in selection".
  note?: string
  checked: boolean
}

/**
 * "Obtained from" picker (3.7b): a small non-modal popover anchored to the button that opened it.
 * Click/tap based (no hover), so it works on touch screens. Portaled to <body> because the table
 * wrapper clips overflow, and positioned `fixed` next to the anchor, flipping/clamping to stay on
 * screen. Closes on Escape, a tap outside, a window resize or a page scroll (scrolling its own list
 * doesn't count).
 */
function GamePickerPopover({
  anchor,
  title,
  options,
  emptyMessage,
  onToggle,
  onClose,
}: {
  anchor: HTMLElement
  title: string
  options: GamePickerOption[]
  emptyMessage: string
  onToggle: (gameId: string) => void
  onClose: () => void
}) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null)
  const focusedForAnchor = useRef<HTMLElement | null>(null)

  // Measured before paint (rendered hidden on the first pass), so it never flashes in the wrong spot.
  useLayoutEffect(() => {
    const el = popoverRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPosition(
      computePopoverPosition(
        anchor.getBoundingClientRect(),
        { width: rect.width, height: rect.height },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    )
  }, [anchor])

  // Focus moves into the picker once per opening, after it's positioned — while it's still hidden
  // for measuring, its inputs can't take focus.
  useEffect(() => {
    if (!position || focusedForAnchor.current === anchor) return
    focusedForAnchor.current = anchor
    popoverRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
  }, [anchor, position])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const isInside = (target: EventTarget | null) =>
      target instanceof Node && (popoverRef.current?.contains(target) || anchor.contains(target))

    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Escape') return
        onClose()
        anchor.focus({ preventScroll: true })
      },
      { signal },
    )
    // Taps on the anchor itself are left to its own click handler (which toggles the picker).
    document.addEventListener('pointerdown', (e) => !isInside(e.target) && onClose(), { signal, capture: true })
    window.addEventListener('resize', onClose, { signal })
    window.addEventListener(
      'scroll',
      (e) => !(e.target instanceof Node && popoverRef.current?.contains(e.target)) && onClose(),
      { signal, capture: true },
    )
    return () => controller.abort()
  }, [anchor, onClose])

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={title}
      className="fixed z-50 flex w-80 max-w-[calc(100vw-1rem)] flex-col rounded-xl border border-border bg-surface p-2 text-sm shadow-xl"
      style={position ?? { top: 0, left: 0, visibility: 'hidden' }}
    >
      <p className="shrink-0 px-1.5 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">{title}</p>
      {options.length === 0 ? (
        <p className="px-1.5 py-1 text-muted">{emptyMessage}</p>
      ) : (
        // Natural height capped at 18rem; on a short screen the container's maxHeight squeezes it further.
        // Natural height capped at 18rem; on a short screen the container's maxHeight squeezes it further.
        <div className="max-h-72 min-h-0 overflow-y-auto overscroll-contain p-1">
          <GameChips options={options} onToggle={onToggle} />
        </div>
      )}
    </div>,
    document.body,
  )
}

export default GamePickerPopover
