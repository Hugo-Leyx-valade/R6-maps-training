import { useState, useRef, useEffect } from 'react'

const MIN_ZOOM = 1
const MAX_ZOOM = 5
const DRAG_THRESHOLD = 4 // px avant de considérer un drag (pas un clic)

interface Props {
  imageUrl: string | null
  placingMode?: boolean
  onMapClick?: (x: number, y: number) => void // coordonnées en % (0-100)
  children?: React.ReactNode
}

export default function ZoomableMap({ imageUrl, placingMode, onMapClick, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [display, setDisplay] = useState({ zoom: 1, panX: 0, panY: 0 })

  // Refs pour éviter les closures périmées dans les event listeners natifs
  const state = useRef({ zoom: 1, panX: 0, panY: 0 })
  const isPressing = useRef(false)
  const hasDragged = useRef(false)
  const pointerStart = useRef({ x: 0, y: 0 })
  const lastPointer = useRef({ x: 0, y: 0 })
  const lastPinchDist = useRef<number | null>(null)
  const lastPinchMid = useRef({ x: 0, y: 0 })

  function clamp(v: number, lo: number, hi: number) {
    return Math.min(hi, Math.max(lo, v))
  }

  function commit(newZoom: number, newPanX: number, newPanY: number) {
    const el = containerRef.current
    const w = el?.clientWidth ?? 0
    const h = el?.clientHeight ?? 0
    const z = clamp(newZoom, MIN_ZOOM, MAX_ZOOM)
    const px = clamp(newPanX, w * (1 - z), 0)
    const py = clamp(newPanY, h * (1 - z), 0)
    state.current = { zoom: z, panX: px, panY: py }
    setDisplay({ zoom: z, panX: px, panY: py })
  }

  function zoomAt(factor: number, cx: number, cy: number) {
    const { zoom, panX, panY } = state.current
    const z = zoom * factor
    commit(z, cx - (cx - panX) * z / zoom, cy - (cy - panY) * z / zoom)
  }

  function pan(dx: number, dy: number) {
    const { zoom, panX, panY } = state.current
    commit(zoom, panX + dx, panY + dy)
  }

  // ── Molette (passive: false obligatoire) ──────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomAt(e.deltaY > 0 ? 0.85 : 1.15, e.clientX - rect.left, e.clientY - rect.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Touch (passive: false pour preventDefault) ────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastPinchDist.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        )
        lastPinchMid.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        }
      } else if (e.touches.length === 1) {
        lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        pointerStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        hasDragged.current = false
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 2 && lastPinchDist.current !== null) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        )
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        const rect = el.getBoundingClientRect()
        const cx = midX - rect.left
        const cy = midY - rect.top
        zoomAt(dist / lastPinchDist.current, cx, cy)
        pan(midX - lastPinchMid.current.x, midY - lastPinchMid.current.y)
        lastPinchDist.current = dist
        lastPinchMid.current = { x: midX, y: midY }
      } else if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastPointer.current.x
        const dy = e.touches[0].clientY - lastPointer.current.y
        const dist = Math.hypot(
          e.touches[0].clientX - pointerStart.current.x,
          e.touches[0].clientY - pointerStart.current.y,
        )
        if (dist > DRAG_THRESHOLD) hasDragged.current = true
        lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        if (state.current.zoom > 1) pan(dx, dy)
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) lastPinchDist.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // ── Souris ────────────────────────────────────────────────────────────────
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'touch') return
    isPressing.current = true
    hasDragged.current = false
    pointerStart.current = { x: e.clientX, y: e.clientY }
    lastPointer.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isPressing.current || e.pointerType === 'touch') return
    const dx = e.clientX - lastPointer.current.x
    const dy = e.clientY - lastPointer.current.y
    lastPointer.current = { x: e.clientX, y: e.clientY }
    if (Math.hypot(e.clientX - pointerStart.current.x, e.clientY - pointerStart.current.y) > DRAG_THRESHOLD) {
      hasDragged.current = true
    }
    if (state.current.zoom > 1) pan(dx, dy)
  }

  function onPointerUp() {
    isPressing.current = false
  }

  function onClick(e: React.MouseEvent) {
    if (hasDragged.current || !placingMode || !onMapClick) return
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const { zoom, panX, panY } = state.current
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const xPct = clamp(((cx - panX) / zoom / el.clientWidth) * 100, 0, 100)
    const yPct = clamp(((cy - panY) / zoom / el.clientHeight) * 100, 0, 100)
    onMapClick(xPct, yPct)
  }

  // ── Boutons zoom ──────────────────────────────────────────────────────────
  function zoomCenter(factor: number) {
    const el = containerRef.current
    if (!el) return
    zoomAt(factor, el.clientWidth / 2, el.clientHeight / 2)
  }

  function resetZoom() {
    state.current = { zoom: 1, panX: 0, panY: 0 }
    setDisplay({ zoom: 1, panX: 0, panY: 0 })
  }

  const { zoom, panX, panY } = display
  const isZoomed = zoom > 1.02

  return (
    <div className="relative select-none rounded-xl overflow-hidden" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
      {/* Boutons zoom */}
      <div className="absolute top-2 right-2 z-20 flex gap-1">
        <button
          onClick={() => zoomCenter(1.35)}
          className="w-8 h-8 rounded-lg font-bold text-base flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: '#0d0d1acc', color: '#e8e8f0', backdropFilter: 'blur(4px)' }}
        >+</button>
        <button
          onClick={() => zoomCenter(1 / 1.35)}
          className="w-8 h-8 rounded-lg font-bold text-base flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: '#0d0d1acc', color: '#e8e8f0', backdropFilter: 'blur(4px)' }}
        >−</button>
        {isZoomed && (
          <button
            onClick={resetZoom}
            className="w-8 h-8 rounded-lg text-sm flex items-center justify-center font-bold transition-opacity hover:opacity-80"
            style={{ background: '#0d0d1acc', color: '#e8a020', backdropFilter: 'blur(4px)' }}
          >↺</button>
        )}
      </div>

      {/* Indicateur de zoom */}
      {isZoomed && (
        <div
          className="absolute bottom-2 left-2 z-20 px-2 py-0.5 rounded text-xs font-semibold"
          style={{ background: '#0d0d1acc', color: '#8888aa', backdropFilter: 'blur(4px)' }}
        >
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Contenu zoomable */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{
          cursor: isPressing.current && isZoomed ? 'grabbing' : isZoomed ? 'grab' : placingMode ? 'crosshair' : 'default',
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
      >
        <div
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '0 0',
            willChange: 'transform',
          }}
        >
          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt=""
                className="w-full block"
                draggable={false}
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              />
              {/* Les marqueurs sont à l'intérieur → ils zooment avec l'image */}
              {children}
            </div>
          ) : (
            <div
              className="flex items-center justify-center flex-col gap-2"
              style={{ minHeight: 200, color: '#8888aa' }}
            >
              <span className="text-4xl">🏢</span>
              <span className="text-sm">Aucune image</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
