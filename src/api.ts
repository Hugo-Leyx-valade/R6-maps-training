import type { MapData, Call, Camera } from './types'

// En dev Vite proxie /api → Express:3000
// En prod Express sert directement /api

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`)
  return r.json()
}

async function put(url: string, body: unknown): Promise<void> {
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`PUT ${url} → ${r.status}`)
}

async function del(url: string): Promise<void> {
  const r = await fetch(url, { method: 'DELETE' })
  if (!r.ok) throw new Error(`DELETE ${url} → ${r.status}`)
}

// ── Maps ─────────────────────────────────────────────────────────────────────

export function getMaps(): Promise<MapData[]> {
  return get('/api/maps')
}

export function saveMap(map: MapData): Promise<void> {
  return put(`/api/maps/${map.id}`, map)
}

export function deleteMap(mapId: string): Promise<void> {
  return del(`/api/maps/${mapId}`)
}

// ── Calls ─────────────────────────────────────────────────────────────────────

export function getCalls(mapId?: string): Promise<Call[]> {
  return get(mapId ? `/api/calls?mapId=${mapId}` : '/api/calls')
}

export function saveCall(call: Call): Promise<void> {
  return put(`/api/calls/${call.id}`, call)
}

export function deleteCall(callId: string): Promise<void> {
  return del(`/api/calls/${callId}`)
}

export function deleteCallsForFloor(mapId: string, floorId: string): Promise<void> {
  return del(`/api/calls?mapId=${mapId}&floorId=${floorId}`)
}

// ── Cameras ───────────────────────────────────────────────────────────────────

export function getCameras(mapId?: string): Promise<Camera[]> {
  return get(mapId ? `/api/cameras?mapId=${mapId}` : '/api/cameras')
}

export function saveCamera(camera: Camera): Promise<void> {
  return put(`/api/cameras/${camera.id}`, camera)
}

export function deleteCamera(cameraId: string): Promise<void> {
  return del(`/api/cameras/${cameraId}`)
}

export function deleteCamerasForFloor(mapId: string, floorId: string): Promise<void> {
  return del(`/api/cameras?mapId=${mapId}&floorId=${floorId}`)
}

export function deleteCamerasForMap(mapId: string): Promise<void> {
  return del(`/api/cameras?mapId=${mapId}`)
}

// ── Images ────────────────────────────────────────────────────────────────────

export async function uploadImage(floorId: string, file: File): Promise<string> {
  const form = new FormData()
  form.append('image', file)
  const r = await fetch(`/api/images/${floorId}`, { method: 'POST', body: form })
  if (!r.ok) throw new Error(`Upload image → ${r.status}`)
  return `/api/images/${floorId}`
}

/** Retourne l'URL HTTP de l'image depuis sa clé stockée */
export function getImageUrl(key: string): string {
  if (!key) return ''
  if (key.startsWith('/api/images/')) return key   // déjà une URL serveur
  if (key.startsWith('idb:')) return `/api/images/${key.slice(4)}` // migration ancien format
  return key
}

export function deleteImage(floorId: string): Promise<void> {
  return del(`/api/images/${floorId}`)
}

// ── Utilitaire ────────────────────────────────────────────────────────────────

export function generateId(): string {
  return crypto.randomUUID()
}
