// Where to place a `position: fixed` popover next to its trigger (3.7b game picker): below the
// trigger when it fits, otherwise on whichever side has more room. It never covers the trigger —
// when the chosen side is too short, `maxHeight` caps the popover to that space and its content
// scrolls instead. Horizontally it's clamped inside the viewport with a small margin, so it behaves
// the same next to a row at the bottom of a phone screen as in the middle of a desktop window.

export const POPOVER_MARGIN_PX = 8
const GAP_PX = 4

type Rect = { top: number; bottom: number; left: number; right: number }
type Size = { width: number; height: number }

export function computePopoverPosition(
  anchor: Rect,
  popover: Size,
  viewport: Size,
): { top: number; left: number; maxHeight: number } {
  const spaceBelow = Math.max(0, viewport.height - anchor.bottom - GAP_PX - POPOVER_MARGIN_PX)
  const spaceAbove = Math.max(0, anchor.top - GAP_PX - POPOVER_MARGIN_PX)
  const placeBelow = popover.height <= spaceBelow || spaceBelow >= spaceAbove

  const maxHeight = placeBelow ? spaceBelow : spaceAbove
  const height = Math.min(popover.height, maxHeight)
  const top = placeBelow ? anchor.bottom + GAP_PX : anchor.top - GAP_PX - height

  // Right-aligned to the trigger (it sits at the table's right edge), then clamped.
  const rawLeft = anchor.right - popover.width
  const maxLeft = viewport.width - POPOVER_MARGIN_PX - popover.width
  const left = Math.max(POPOVER_MARGIN_PX, Math.min(rawLeft, maxLeft))

  return { top, left, maxHeight }
}
