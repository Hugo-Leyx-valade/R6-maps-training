import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMaps, getCameras, getImageUrl } from '../api'
import ZoomableMap from '../components/ZoomableMap'
import type { MapData, Camera, Floor } from '../types'

const MAX_DIST = 15 // % de diagonale max pour marquer des points

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

function scoreForDist(d: number): number {
  if (d > MAX_DIST) return 0
  return Math.round(100 * (1 - d / MAX_DIST))
}

// Associe chaque caméra au marqueur joueur le plus proche (greedy)
function matchMarkers(
  cameras: Camera[],
  markers: { x: number; y: number }[]
): { camera: Camera; marker: { x: number; y: number } | null; score: number }[] {
  const used = new Set<number>()
  return cameras.map(cam => {
    let bestIdx = -1
    let bestDist = Infinity
    markers.forEach((m, i) => {
      if (used.has(i)) return
      const d = dist(m.x, m.y, cam.x, cam.y)
      if (d < bestDist) { bestDist = d; bestIdx = i }
    })
    if (bestIdx >= 0 && bestDist <= MAX_DIST) {
      used.add(bestIdx)
      return { camera: cam, marker: markers[bestIdx], score: scoreForDist(bestDist) }
    }
    return { camera: cam, marker: null, score: 0 }
  })
}

interface FloorData {
  floor: Floor
  cameras: Camera[]
}

type Phase = 'placing' | 'revealed'

export default function CameraQuizPage() {
  const { mapId } = useParams<{ mapId: string }>()
  const navigate = useNavigate()

  const [map, setMap] = useState<MapData | null>(null)
  const [floorDatas, setFloorDatas] = useState<FloorData[]>([])
  const [floorIdx, setFloorIdx] = useState(0)
  const [markers, setMarkers] = useState<{ x: number; y: number }[]>([])
  const [phase, setPhase] = useState<Phase>('placing')
  const [results, setResults] = useState<ReturnType<typeof matchMarkers>>([])
  const [scoresByFloor, setScoresByFloor] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMaps(), getCameras(mapId)]).then(([maps, cameras]) => {
      const m = maps.find(m => m.id === mapId)
      if (!m) { navigate('/'); return }
      setMap(m)
      const datas: FloorData[] = m.floors
        .map(floor => ({ floor, cameras: cameras.filter(c => c.floorId === floor.id) }))
        .filter(d => d.cameras.length > 0)
      setFloorDatas(datas)
      setScoresByFloor(new Array(datas.length).fill(0))
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center" style={{ color: '#8888aa' }}>Chargement...</div>
  )

  if (floorDatas.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-5xl">📷</div>
      <p className="text-white font-bold">Aucune caméra configurée sur cette map.</p>
      <button onClick={() => navigate('/')} className="px-6 py-3 rounded-lg" style={{ background: '#2a2a4a', color: '#e8e8f0' }}>Retour</button>
    </div>
  )

  const finished = floorIdx >= floorDatas.length
  const totalScore = scoresByFloor.reduce((a, b) => a + b, 0)
  const maxScore = floorDatas.reduce((a, d) => a + d.cameras.length * 100, 0)

  // ── Écran de résultats final ─────────────────────────────────────────────────
  if (finished) {
    const pct = Math.round((totalScore / maxScore) * 100)
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white">Résultats</h1>
        <div className="text-5xl font-bold" style={{ color: '#8b5cf6' }}>
          {totalScore} <span className="text-2xl text-white">/ {maxScore}</span>
        </div>
        <div className="text-lg font-semibold" style={{ color: pct >= 70 ? '#22c55e' : pct >= 40 ? '#e8a020' : '#ef4444' }}>
          {pct >= 70 ? 'Excellent !' : pct >= 40 ? 'Pas mal !' : 'Continue à t\'entraîner !'}
        </div>
        <div className="w-full flex flex-col gap-2">
          {floorDatas.map((fd, i) => (
            <div key={fd.floor.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg" style={{ background: '#16213e' }}>
              <span className="text-sm text-white">{fd.floor.name}</span>
              <span className="text-sm font-bold" style={{ color: '#8b5cf6' }}>{scoresByFloor[i]} / {fd.cameras.length * 100}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={() => navigate(`/camera/${mapId}`)} className="flex-1 py-3 rounded-xl font-bold" style={{ background: '#8b5cf6', color: '#fff' }}>
            Rejouer
          </button>
          <button onClick={() => navigate('/')} className="flex-1 py-3 rounded-xl font-bold" style={{ background: '#2a2a4a', color: '#e8e8f0' }}>
            Accueil
          </button>
        </div>
      </div>
    )
  }

  // ── Étage en cours ───────────────────────────────────────────────────────────
  const { floor, cameras } = floorDatas[floorIdx]
  const imageUrl = getImageUrl(floor.imageUrl)

  function handleMapClick(x: number, y: number) {
    if (phase !== 'placing') return
    setMarkers(prev => [...prev, { x, y }])
  }

  function removeMarker(idx: number) {
    if (phase !== 'placing') return
    setMarkers(prev => prev.filter((_, i) => i !== idx))
  }

  function verify() {
    const res = matchMarkers(cameras, markers)
    const floorScore = res.reduce((a, r) => a + r.score, 0)
    setResults(res)
    setScoresByFloor(prev => prev.map((s, i) => i === floorIdx ? floorScore : s))
    setPhase('revealed')
  }

  function nextFloor() {
    setFloorIdx(i => i + 1)
    setMarkers([])
    setResults([])
    setPhase('placing')
  }

  const floorScore = results.reduce((a, r) => a + r.score, 0)
  const isLastFloor = floorIdx === floorDatas.length - 1

  return (
    <div className="flex-1 flex flex-col gap-3 p-4 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-sm" style={{ color: '#8888aa' }}>← Quitter</button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: '#8888aa' }}>
            {floor.name} · Étage {floorIdx + 1}/{floorDatas.length}
          </span>
          <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: '#8b5cf622', color: '#8b5cf6' }}>
            {totalScore + (phase === 'revealed' ? floorScore : 0)} pts
          </span>
        </div>
      </div>

      {/* Instruction */}
      <div className="px-4 py-2.5 rounded-xl text-center text-sm font-semibold" style={{ background: '#16213e', color: '#e8e8f0' }}>
        {phase === 'placing'
          ? `Place tes ${cameras.length} caméra${cameras.length > 1 ? 's' : ''} sur la carte, puis clique Vérifier`
          : `${floorScore} / ${cameras.length * 100} points sur cet étage`}
      </div>

      {/* Carte */}
      <ZoomableMap
        imageUrl={imageUrl}
        placingMode={phase === 'placing'}
        onMapClick={handleMapClick}
      >
        {/* Marqueurs joueur */}
        {markers.map((m, i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: `${m.x}%`, top: `${m.y}%`, transform: 'translate(-50%,-50%)', zIndex: 10 }}
            onClick={e => { e.stopPropagation(); removeMarker(i) }}
          >
            <div
              className="w-5 h-5 rounded-full border-2 border-white cursor-pointer hover:scale-125 transition-transform"
              style={{ background: phase === 'revealed' ? '#94a3b8' : '#3b82f6' }}
            />
          </div>
        ))}

        {/* Positions réelles des caméras (après vérification) */}
        {phase === 'revealed' && results.map((r, i) => (
          <div key={i}>
            {/* Vraie caméra */}
            <div
              className="absolute"
              style={{ left: `${r.camera.x}%`, top: `${r.camera.y}%`, transform: 'translate(-50%,-50%)', zIndex: 12 }}
            >
              <div
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                style={{
                  background: r.score > 0 ? '#22c55e' : '#ef4444',
                  borderColor: '#fff',
                  color: '#fff',
                }}
              >
                {r.score > 0 ? '✓' : '✗'}
              </div>
            </div>
            {/* Ligne vers le marqueur joueur */}
            {r.marker && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 9 }}>
                <line
                  x1={`${r.marker.x}%`} y1={`${r.marker.y}%`}
                  x2={`${r.camera.x}%`} y2={`${r.camera.y}%`}
                  stroke={r.score > 0 ? '#22c55e88' : '#ef444488'}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              </svg>
            )}
          </div>
        ))}
      </ZoomableMap>

      {/* Compteur de marqueurs placés */}
      {phase === 'placing' && (
        <p className="text-xs text-center" style={{ color: '#8888aa' }}>
          {markers.length} marqueur{markers.length !== 1 ? 's' : ''} placé{markers.length !== 1 ? 's' : ''} · Clique sur un marqueur pour le retirer
        </p>
      )}

      {/* Boutons */}
      {phase === 'placing' ? (
        <button
          onClick={verify}
          disabled={markers.length === 0}
          className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40"
          style={{ background: '#8b5cf6', color: '#fff' }}
        >
          Vérifier
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Détail par caméra */}
          <div className="flex flex-col gap-1">
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#16213e' }}>
                <span className="text-sm" style={{ color: '#8888aa' }}>Caméra {i + 1}</span>
                <span className="text-sm font-bold" style={{ color: r.score > 0 ? '#22c55e' : '#ef4444' }}>
                  {r.score > 0 ? `+${r.score} pts` : 'Ratée'}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={nextFloor}
            className="w-full py-3 rounded-xl font-bold text-sm"
            style={{ background: '#8b5cf6', color: '#fff' }}
          >
            {isLastFloor ? 'Voir le score final' : 'Étage suivant →'}
          </button>
        </div>
      )}
    </div>
  )
}
