import { useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'

const MIN = 300
const MAX = 720
const STORAGE_KEY = 'chatRailWidth'

/**
 * Width of the chat rail, persisted across sessions, plus the drag and
 * arrow-key handlers its resize grip needs. Dragging is additionally capped at
 * half the window so the rail can never swallow the page.
 */
export function useRailWidth(railRef: RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(() => Number(localStorage.getItem(STORAGE_KEY)) || 360)

  const commit = (w: number) => {
    localStorage.setItem(STORAGE_KEY, String(w))
    return w
  }

  const onPointerDown = (down: PointerEvent) => {
    down.preventDefault()
    const right = railRef.current?.getBoundingClientRect().right ?? window.innerWidth
    const max = Math.min(MAX, window.innerWidth * 0.5)
    const onMove = (e: globalThis.PointerEvent) => {
      setWidth(commit(Math.min(max, Math.max(MIN, right - e.clientX))))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 48 : 16
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    setWidth((w) => commit(Math.min(MAX, Math.max(MIN, w + (e.key === 'ArrowLeft' ? step : -step)))))
  }

  return { width, onPointerDown, onKeyDown }
}
