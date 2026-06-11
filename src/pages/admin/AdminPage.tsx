import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMaps, deleteMap, getCalls, getImageUrl } from '../../api'
import type { MapData } from '../../types'

function MapThumbnail({ imageKey }: { imageKey: string }) {
  const src = getImageUrl(imageKey)
  if (!src) return (
    <div className="w-16 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#2a2a4a' }}>🏢</div>
  )
  return <img src={src} alt="" className="w-16 h-10 object-cover rounded-lg flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
}

export default function AdminPage() {
  const [maps, setMaps] = useState<MapData[]>([])
  const [callCounts, setCallCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  async function reload() {
    setLoading(true)
    try {
      const [m, calls] = await Promise.all([getMaps(), getCalls()])
      setMaps(m)
      const counts: Record<string, number> = {}
      calls.forEach(c => { counts[c.mapId] = (counts[c.mapId] ?? 0) + 1 })
      setCallCounts(counts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  async function handleDelete(map: MapData) {
    if (!confirm(`Supprimer "${map.name}" et tous ses calls ?`)) return
    await deleteMap(map.id)
    reload()
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center" style={{ color: '#8888aa' }}>Chargement...</div>
  )

  return (
    <div className="p-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Maps</h1>
        <button
          onClick={() => navigate('/admin/map/new')}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#e8a020', color: '#0d0d1a' }}
        >
          + Nouvelle map
        </button>
      </div>

      {maps.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ border: '2px dashed #2a2a4a', color: '#8888aa' }}>
          <div className="text-4xl mb-3">🗺️</div>
          <p>Aucune map. Crées-en une !</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {maps.map(map => {
            const callCount = callCounts[map.id] ?? 0
            const firstImageKey = map.floors[0]?.imageUrl
            return (
              <div key={map.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: '#16213e', border: '1px solid #2a2a4a' }}>
                {firstImageKey
                  ? <MapThumbnail imageKey={firstImageKey} />
                  : <div className="w-16 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#2a2a4a' }}>🏢</div>
                }
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{map.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#8888aa' }}>
                    {map.floors.length} étage{map.floors.length !== 1 ? 's' : ''} · {callCount} call{callCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => navigate(`/admin/map/${map.id}`)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-opacity hover:opacity-80" style={{ borderColor: '#2a2a4a', color: '#e8e8f0' }}>Éditer</button>
                  <button onClick={() => handleDelete(map)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80" style={{ background: '#c0392b22', color: '#ef4444', border: '1px solid #ef444444' }}>Suppr.</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
