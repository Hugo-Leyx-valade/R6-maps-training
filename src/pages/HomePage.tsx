import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMaps, getCalls, getCameras, getImageUrl } from '../api'
import type { MapData, QuizMode } from '../types'

function MapCard({ map, callCount, selected, onSelect }: {
  map: MapData; callCount: number; selected: boolean; onSelect: () => void
}) {
  const imgUrl = map.floors[0]?.imageUrl ? getImageUrl(map.floors[0].imageUrl) : null

  return (
    <button
      onClick={onSelect}
      className="relative rounded-xl p-4 text-left transition-all border-2"
      style={{ background: selected ? '#1a1a2e' : '#16213e', borderColor: selected ? '#e8a020' : '#2a2a4a' }}
    >
      {imgUrl ? (
        <img src={imgUrl} alt={map.name} className="w-full aspect-video object-cover rounded-lg mb-3 opacity-80" />
      ) : (
        <div className="w-full aspect-video rounded-lg mb-3 flex items-center justify-center text-3xl" style={{ background: '#2a2a4a' }}>🏢</div>
      )}
      <div className="font-bold text-white text-sm">{map.name}</div>
      <div className="text-xs mt-0.5" style={{ color: '#8888aa' }}>
        {callCount} call{callCount !== 1 ? 's' : ''} · {map.floors.length} étage{map.floors.length !== 1 ? 's' : ''}
      </div>
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#e8a020', color: '#0d0d1a' }}>✓</div>
      )}
    </button>
  )
}

export default function HomePage() {
  const [maps, setMaps] = useState<MapData[]>([])
  const [callCounts, setCallCounts] = useState<Record<string, number>>({})
  const [cameraCounts, setCameraCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<QuizMode>('qcm')
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getMaps(), getCalls(), getCameras().catch(() => [])]).then(([maps, calls, cameras]) => {
      setMaps(maps)
      const counts: Record<string, number> = {}
      calls.forEach(c => { counts[c.mapId] = (counts[c.mapId] ?? 0) + 1 })
      setCallCounts(counts)
      const camCounts: Record<string, number> = {}
      cameras.forEach(c => { camCounts[c.mapId] = (camCounts[c.mapId] ?? 0) + 1 })
      setCameraCounts(camCounts)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center" style={{ color: '#8888aa' }}>Chargement...</div>
  )

  if (maps.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-6xl">🗺️</div>
        <h1 className="text-2xl font-bold text-white">Aucune map configurée</h1>
        <p style={{ color: '#8888aa' }}>Commence par ajouter une map dans l'interface admin.</p>
        <button onClick={() => navigate('/admin')} className="px-6 py-3 rounded-lg font-semibold hover:opacity-80" style={{ background: '#e8a020', color: '#0d0d1a' }}>
          Aller dans l'admin
        </button>
      </div>
    )
  }

  const selectedCallCount = selected ? (callCounts[selected] ?? 0) : 0
  const selectedCameraCount = selected ? (cameraCounts[selected] ?? 0) : 0

  return (
    <div className="flex-1 flex flex-col items-center p-6 gap-8 max-w-2xl mx-auto w-full">
      <div className="text-center pt-4">
        <h1 className="text-3xl font-bold text-white mb-2">Choisis une map</h1>
        <p style={{ color: '#8888aa' }}>Apprends les calls de Rainbow Six Siege</p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full sm:grid-cols-3">
        {maps.map(map => (
          <MapCard
            key={map.id}
            map={map}
            callCount={callCounts[map.id] ?? 0}
            selected={selected === map.id}
            onSelect={() => setSelected(selected === map.id ? null : map.id)}
          />
        ))}
      </div>

      {selected && (
        <div className="w-full flex flex-col gap-4">
          <div className="rounded-xl p-4" style={{ background: '#16213e', border: '1px solid #2a2a4a' }}>
            <p className="text-sm mb-3" style={{ color: '#8888aa' }}>Mode de jeu</p>
            <div className="flex gap-3">
              {(['qcm', 'type', 'camera'] as QuizMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all"
                  style={{ borderColor: mode === m ? '#e8a020' : '#2a2a4a', background: mode === m ? '#e8a02022' : 'transparent', color: mode === m ? '#e8a020' : '#8888aa' }}
                >
                  {m === 'qcm' ? 'QCM' : m === 'type' ? 'Écrire' : 'Caméras'}
                </button>
              ))}
            </div>
          </div>
          {mode === 'camera' ? (
            <button
              onClick={() => navigate(`/camera/${selected}`)}
              disabled={selectedCameraCount < 1}
              className="w-full py-4 rounded-xl font-bold text-lg disabled:opacity-40"
              style={{ background: '#8b5cf6', color: '#fff' }}
            >
              {selectedCameraCount < 1 ? 'Aucune caméra sur cette map' : `Trouver les caméras (${selectedCameraCount})`}
            </button>
          ) : (
            <button
              onClick={() => navigate(`/quiz/${selected}?mode=${mode}`)}
              disabled={selectedCallCount < 1}
              className="w-full py-4 rounded-xl font-bold text-lg disabled:opacity-40"
              style={{ background: '#e8a020', color: '#0d0d1a' }}
            >
              {selectedCallCount < 1 ? 'Aucun call sur cette map' : `Commencer (${selectedCallCount} calls)`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
