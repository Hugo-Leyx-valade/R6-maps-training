import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getMaps, saveMap, getCalls, saveCall, deleteCall,
  deleteCallsForFloor, getCameras, saveCamera, deleteCamerasForFloor, deleteCamerasForMap,
  uploadImage, getImageUrl, deleteImage, generateId,
} from '../../api'
import ZoomableMap from '../../components/ZoomableMap'
import type { Floor, Call, Camera } from '../../types'

type Tab = 'info' | 'calls' | 'cameras'
type FloorPreview = { floorId: string; blobUrl: string; file: File }

export default function AdminMapPage() {
  const { mapId } = useParams<{ mapId: string }>()
  const isNew = !mapId || mapId === 'new'
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('info')
  const [mapName, setMapName] = useState('')
  const [floors, setFloors] = useState<Floor[]>([])
  const [currentMapId] = useState(() => isNew ? generateId() : mapId!)
  const [previews, setPreviews] = useState<FloorPreview[]>([])
  const [calls, setCalls] = useState<Call[]>([])
  const [cameras, setCameras] = useState<Camera[]>([])
  const [camerasChanged, setCamerasChanged] = useState(false)
  const [savingCameras, setSavingCameras] = useState(false)
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null)
  const [placingMode, setPlacingMode] = useState(false)
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const [editingCall, setEditingCall] = useState<Call | null>(null)
  const [callName, setCallName] = useState('')
  const [callAliases, setCallAliases] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')
  const initializedRef = useRef(false)

  // ── Chargement initial ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isNew) {
      getMaps().then(maps => {
        const map = maps.find(m => m.id === mapId)
        if (!map) { navigate('/admin'); return }
        setMapName(map.name)
        setFloors(map.floors)
        if (map.floors.length > 0) setActiveFloorId(map.floors[0].id)
      })
      getCalls(mapId).then(setCalls)
      getCameras(mapId).then(setCameras)
    }
    setTimeout(() => { initializedRef.current = true }, 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => { previews.forEach(p => URL.revokeObjectURL(p.blobUrl)) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-sauvegarde map ─────────────────────────────────────────────────────

  const autoSaveMap = useCallback((name: string, floorsList: Floor[]) => {
    if (!initializedRef.current || !name.trim()) return
    saveMap({ id: currentMapId, name: name.trim(), floors: floorsList }).catch(console.error)
  }, [currentMapId])

  // ── Affichage images ────────────────────────────────────────────────────────

  function getDisplayUrl(floor: Floor): string | null {
    const preview = previews.find(p => p.floorId === floor.id)
    if (preview) return preview.blobUrl
    if (floor.imageUrl) return getImageUrl(floor.imageUrl)
    return null
  }

  // ── Gestion étages ──────────────────────────────────────────────────────────

  function addFloor() {
    const id = generateId()
    const newFloor: Floor = { id, name: `Étage ${floors.length + 1}`, imageUrl: '' }
    const updated = [...floors, newFloor]
    setFloors(updated)
    if (!activeFloorId) setActiveFloorId(id)
    autoSaveMap(mapName, updated)
  }

  function updateFloorName(id: string, name: string) {
    setFloors(f => f.map(fl => fl.id === id ? { ...fl, name } : fl))
  }

  function handleFloorImage(floorId: string, file: File) {
    const blobUrl = URL.createObjectURL(file)
    setPreviews(prev => {
      const old = prev.find(p => p.floorId === floorId)
      if (old) URL.revokeObjectURL(old.blobUrl)
      return [...prev.filter(p => p.floorId !== floorId), { floorId, blobUrl, file }]
    })
  }

  async function removeFloor(id: string) {
    if (!confirm('Supprimer cet étage et ses calls ?')) return
    const floor = floors.find(f => f.id === id)
    if (floor?.imageUrl) deleteImage(id).catch(() => {})
    const preview = previews.find(p => p.floorId === id)
    if (preview) URL.revokeObjectURL(preview.blobUrl)
    setPreviews(prev => prev.filter(p => p.floorId !== id))
    const updated = floors.filter(fl => fl.id !== id)
    setFloors(updated)
    setCalls(c => c.filter(c => !(c.mapId === currentMapId && c.floorId === id)))
    setCameras(c => c.filter(c => !(c.mapId === currentMapId && c.floorId === id)))
    await deleteCallsForFloor(currentMapId, id).catch(console.error)
    await deleteCamerasForFloor(currentMapId, id).catch(console.error)
    if (activeFloorId === id) setActiveFloorId(updated[0]?.id ?? null)
    autoSaveMap(mapName, updated)
  }

  // ── Sauvegarde images ───────────────────────────────────────────────────────

  async function saveImages() {
    if (!mapName.trim()) { alert('Donne un nom à la map'); return }
    setSaving(true)
    try {
      const updatedFloors = await Promise.all(floors.map(async (floor) => {
        const preview = previews.find(p => p.floorId === floor.id)
        if (preview) {
          const url = await uploadImage(floor.id, preview.file)
          return { ...floor, imageUrl: url }
        }
        return floor
      }))
      setFloors(updatedFloors)
      previews.forEach(p => URL.revokeObjectURL(p.blobUrl))
      setPreviews([])
      await saveMap({ id: currentMapId, name: mapName.trim(), floors: updatedFloors })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      alert(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Calls ───────────────────────────────────────────────────────────────────

  const activeFloor = floors.find(f => f.id === activeFloorId)
  const activeFloorDisplayUrl = activeFloor ? getDisplayUrl(activeFloor) : null
  const floorCalls = calls.filter(c => c.mapId === currentMapId && c.floorId === activeFloorId)

  async function confirmCall() {
    if (!callName.trim() || !pendingPos || !activeFloorId) return
    if (!mapName.trim()) { alert('Donne d\'abord un nom à la map'); return }

    const call: Call = {
      id: editingCall?.id ?? generateId(),
      mapId: currentMapId,
      floorId: activeFloorId,
      name: callName.trim(),
      aliases: callAliases.split(',').map(s => s.trim()).filter(Boolean),
      x: pendingPos.x,
      y: pendingPos.y,
    }

    // S'assurer que la map existe côté serveur
    const maps = await getMaps()
    if (!maps.find(m => m.id === currentMapId)) {
      await saveMap({ id: currentMapId, name: mapName.trim(), floors })
    }

    await saveCall(call).catch(console.error)

    setCalls(prev => {
      const idx = prev.findIndex(c => c.id === call.id)
      if (idx >= 0) { const a = [...prev]; a[idx] = call; return a }
      return [...prev, call]
    })
    setPendingPos(null)
    setEditingCall(null)
    setPlacingMode(false)
  }

  function startEdit(call: Call) {
    setEditingCall(call)
    setPendingPos({ x: call.x, y: call.y })
    setCallName(call.name)
    setCallAliases(call.aliases.join(', '))
    setPlacingMode(false)
  }

  async function removeCall(id: string) {
    await deleteCall(id).catch(console.error)
    setCalls(prev => prev.filter(c => c.id !== id))
  }

  function cancelPending() {
    setPendingPos(null)
    setEditingCall(null)
    setPlacingMode(false)
  }

  const hasUnsavedImages = previews.length > 0

  const TabBtn = ({ t, label }: { t: Tab; label: string }) => (
    <button
      onClick={() => setTab(t)}
      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
      style={{ background: tab === t ? '#e8a020' : 'transparent', color: tab === t ? '#0d0d1a' : '#8888aa' }}
    >
      {label}
    </button>
  )

  return (
    <div className="p-4 max-w-3xl mx-auto w-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-sm" style={{ color: '#8888aa' }}>← Retour</button>
        <h1 className="text-xl font-bold text-white flex-1">
          {isNew ? 'Nouvelle map' : `Éditer : ${mapName}`}
        </h1>
        {hasUnsavedImages && (
          <button
            onClick={saveImages}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
            style={{ background: saveStatus === 'saved' ? '#22c55e' : '#e8a020', color: '#0d0d1a' }}
          >
            {saving ? 'Enreg...' : saveStatus === 'saved' ? '✓ Enregistré' : '💾 Enregistrer images'}
          </button>
        )}
      </div>

      <div className="text-xs px-3 py-2 rounded-lg" style={{ background: '#16213e', color: '#8888aa' }}>
        ✓ Nom, étages et calls sont sauvegardés automatiquement
        {hasUnsavedImages && <span style={{ color: '#e8a020' }}> · Images en attente</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#16213e' }}>
        <TabBtn t="info" label="Infos & Étages" />
        <TabBtn t="calls" label={`Calls (${calls.filter(c => c.mapId === currentMapId).length})`} />
        <TabBtn t="cameras" label={`Caméras (${cameras.filter(c => c.mapId === currentMapId).length})`} />
      </div>

      {/* ── Tab Info ── */}
      {tab === 'info' && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#8888aa' }}>Nom de la map</label>
            <input
              value={mapName}
              onChange={e => setMapName(e.target.value)}
              onBlur={() => autoSaveMap(mapName, floors)}
              placeholder="ex: Bank, Clubhouse..."
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border-2"
              style={{ background: '#16213e', borderColor: '#2a2a4a', color: '#e8e8f0' }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium" style={{ color: '#8888aa' }}>Étages</label>
              <button onClick={addFloor} className="text-sm px-3 py-1 rounded-lg font-semibold" style={{ background: '#2a2a4a', color: '#e8e8f0' }}>
                + Ajouter
              </button>
            </div>
            {floors.length === 0 && <p className="text-sm py-4 text-center" style={{ color: '#8888aa' }}>Aucun étage.</p>}
            <div className="flex flex-col gap-3">
              {floors.map((floor, i) => {
                const displayUrl = getDisplayUrl(floor)
                const hasNewImage = previews.some(p => p.floorId === floor.id)
                return (
                  <div key={floor.id} className="p-3 rounded-xl flex gap-3 items-start" style={{ background: '#16213e', border: '1px solid #2a2a4a' }}>
                    <div className="flex-1 flex flex-col gap-2">
                      <input
                        value={floor.name}
                        onChange={e => updateFloorName(floor.id, e.target.value)}
                        onBlur={() => autoSaveMap(mapName, floors)}
                        placeholder={`Étage ${i + 1}`}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none border-2"
                        style={{ background: '#0d0d1a', borderColor: '#2a2a4a', color: '#e8e8f0' }}
                      />
                      <label className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer hover:opacity-80" style={{ background: '#2a2a4a', color: '#e8e8f0' }}>
                        {displayUrl ? <img src={displayUrl} alt="" className="w-12 h-8 object-cover rounded" /> : <span>📷</span>}
                        <span>{displayUrl ? 'Changer l\'image' : 'Ajouter une image'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFloorImage(floor.id, e.target.files[0])} />
                      </label>
                      {hasNewImage && <p className="text-xs" style={{ color: '#e8a020' }}>⚠ Image en attente — clique "Enregistrer images"</p>}
                    </div>
                    <button onClick={() => removeFloor(floor.id)} className="text-xs px-2 py-1 rounded flex-shrink-0" style={{ color: '#ef4444', background: '#ef444422' }}>✕</button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Cameras ── */}
      {tab === 'cameras' && (
        <div className="flex flex-col gap-4">
          {floors.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#8888aa' }}>Crée d'abord des étages.</p>
          ) : !mapName.trim() ? (
            <p className="text-sm text-center py-8" style={{ color: '#e8a020' }}>Donne d'abord un nom à la map.</p>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap">
                {floors.map(floor => (
                  <button
                    key={floor.id}
                    onClick={() => setActiveFloorId(floor.id)}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all"
                    style={{
                      borderColor: activeFloorId === floor.id ? '#e8a020' : '#2a2a4a',
                      color: activeFloorId === floor.id ? '#e8a020' : '#8888aa',
                      background: activeFloorId === floor.id ? '#e8a02022' : 'transparent',
                    }}
                  >
                    {floor.name}
                  </button>
                ))}
              </div>

              {activeFloor && (
                <>
                  <p className="text-xs" style={{ color: '#8888aa' }}>
                    Clique sur la carte pour placer une caméra. Clique sur une caméra existante pour la supprimer.
                  </p>
                  <ZoomableMap
                    imageUrl={activeFloorDisplayUrl}
                    placingMode={true}
                    onMapClick={(x, y) => {
                      const cam: Camera = { id: generateId(), mapId: currentMapId, floorId: activeFloorId!, x, y }
                      setCameras(prev => [...prev, cam])
                      setCamerasChanged(true)
                    }}
                  >
                    {cameras.filter(c => c.mapId === currentMapId && c.floorId === activeFloorId).map(cam => (
                      <div
                        key={cam.id}
                        className="absolute"
                        style={{ left: `${cam.x}%`, top: `${cam.y}%`, transform: 'translate(-50%,-50%)', zIndex: 10 }}
                        onClick={e => {
                          e.stopPropagation()
                          setCameras(prev => prev.filter(c => c.id !== cam.id))
                          setCamerasChanged(true)
                        }}
                      >
                        <div className="w-6 h-6 rounded-full border-2 border-white cursor-pointer hover:scale-125 transition-transform flex items-center justify-center text-xs" style={{ background: '#8b5cf6' }} title="Cliquer pour supprimer">
                          📷
                        </div>
                      </div>
                    ))}
                  </ZoomableMap>
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: '#8888aa' }}>
                      {cameras.filter(c => c.mapId === currentMapId).length} caméra(s) au total
                      {camerasChanged && <span style={{ color: '#e8a020' }}> · Non sauvegardées</span>}
                    </p>
                    <button
                      onClick={async () => {
                        setSavingCameras(true)
                        try {
                          await deleteCamerasForMap(currentMapId)
                          const mapCameras = cameras.filter(c => c.mapId === currentMapId)
                          await Promise.all(mapCameras.map(c => saveCamera(c)))
                          setCamerasChanged(false)
                        } catch (err) {
                          alert(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
                        } finally {
                          setSavingCameras(false)
                        }
                      }}
                      disabled={savingCameras || !camerasChanged}
                      className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-opacity hover:opacity-80"
                      style={{ background: '#e8a020', color: '#0d0d1a' }}
                    >
                      {savingCameras ? 'Enreg...' : 'Enregistrer les caméras'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab Calls ── */}
      {tab === 'calls' && (
        <div className="flex flex-col gap-4">
          {floors.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#8888aa' }}>Crée d'abord des étages.</p>
          ) : !mapName.trim() ? (
            <p className="text-sm text-center py-8" style={{ color: '#e8a020' }}>Donne d'abord un nom à la map.</p>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap">
                {floors.map(floor => (
                  <button
                    key={floor.id}
                    onClick={() => { setActiveFloorId(floor.id); cancelPending() }}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all"
                    style={{
                      borderColor: activeFloorId === floor.id ? '#e8a020' : '#2a2a4a',
                      color: activeFloorId === floor.id ? '#e8a020' : '#8888aa',
                      background: activeFloorId === floor.id ? '#e8a02022' : 'transparent',
                    }}
                  >
                    {floor.name}
                  </button>
                ))}
              </div>

              {activeFloor && (
                <>
                  <ZoomableMap
                    imageUrl={activeFloorDisplayUrl}
                    placingMode={placingMode}
                    onMapClick={(x, y) => { setPendingPos({ x, y }); setCallName(''); setCallAliases(''); setEditingCall(null) }}
                  >
                    {floorCalls.map(call => (
                      <div
                        key={call.id}
                        className="absolute group"
                        style={{ left: `${call.x}%`, top: `${call.y}%`, transform: 'translate(-50%,-50%)', zIndex: 10 }}
                        onClick={e => { e.stopPropagation(); startEdit(call) }}
                      >
                        <div className="w-5 h-5 rounded-full border-2 border-white cursor-pointer hover:scale-125 transition-transform" style={{ background: editingCall?.id === call.id ? '#e8a020' : '#3b82f6' }} />
                        <div className="absolute left-1/2 -translate-x-1/2 -top-7 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: '#0d0d1acc', color: '#e8e8f0' }}>
                          {call.name}
                        </div>
                      </div>
                    ))}
                    {pendingPos && (
                      <div className="absolute" style={{ left: `${pendingPos.x}%`, top: `${pendingPos.y}%`, transform: 'translate(-50%,-50%)', zIndex: 20 }}>
                        <div className="w-5 h-5 rounded-full border-2 border-white animate-pulse" style={{ background: '#e8a020' }} />
                      </div>
                    )}
                    {placingMode && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold pointer-events-none" style={{ background: '#e8a020dd', color: '#0d0d1a' }}>
                        Clique sur la carte pour placer le call
                      </div>
                    )}
                  </ZoomableMap>

                  {pendingPos && (
                    <div className="p-4 rounded-xl flex flex-col gap-3" style={{ background: '#16213e', border: '1px solid #e8a020' }}>
                      <p className="text-sm font-semibold" style={{ color: '#e8a020' }}>{editingCall ? 'Modifier le call' : 'Nouveau call'}</p>
                      <input
                        autoFocus
                        value={callName}
                        onChange={e => setCallName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && confirmCall()}
                        placeholder="Nom du call (ex: Cuisine, Skylight...)"
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none border-2"
                        style={{ background: '#0d0d1a', borderColor: '#2a2a4a', color: '#e8e8f0' }}
                      />
                      <input
                        value={callAliases}
                        onChange={e => setCallAliases(e.target.value)}
                        placeholder="Alias séparés par virgule (optionnel)"
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none border-2"
                        style={{ background: '#0d0d1a', borderColor: '#2a2a4a', color: '#e8e8f0' }}
                      />
                      <div className="flex gap-2">
                        <button onClick={confirmCall} disabled={!callName.trim()} className="flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ background: '#e8a020', color: '#0d0d1a' }}>
                          {editingCall ? 'Mettre à jour' : 'Ajouter'}
                        </button>
                        {editingCall && (
                          <button onClick={() => { removeCall(editingCall.id); cancelPending() }} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' }}>Suppr.</button>
                        )}
                        <button onClick={cancelPending} className="px-4 py-2 rounded-lg text-sm" style={{ color: '#8888aa', background: '#2a2a4a' }}>Annuler</button>
                      </div>
                    </div>
                  )}

                  {!pendingPos && (
                    <button
                      onClick={() => setPlacingMode(p => !p)}
                      className="w-full py-3 rounded-xl text-sm font-semibold border-2 transition-all"
                      style={{ borderColor: placingMode ? '#e8a020' : '#2a2a4a', color: placingMode ? '#e8a020' : '#8888aa', background: placingMode ? '#e8a02022' : 'transparent' }}
                    >
                      {placingMode ? '✕ Annuler' : '+ Placer un call sur la carte'}
                    </button>
                  )}

                  {floorCalls.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-semibold mb-1" style={{ color: '#8888aa' }}>
                        {floorCalls.length} call{floorCalls.length !== 1 ? 's' : ''} — sauvegardés automatiquement
                      </p>
                      {floorCalls.map(call => (
                        <div key={call.id} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer" style={{ background: editingCall?.id === call.id ? '#2a2a4a' : '#16213e' }} onClick={() => startEdit(call)}>
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#3b82f6' }} />
                          <span className="text-sm text-white flex-1">{call.name}</span>
                          {call.aliases.length > 0 && <span className="text-xs" style={{ color: '#8888aa' }}>+{call.aliases.length} alias</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
