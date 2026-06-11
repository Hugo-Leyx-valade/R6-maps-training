import type { MapData, Call } from './types'

const MAPS_KEY = 'r6gussr_maps'
const CALLS_KEY = 'r6gussr_calls'

// --- Maps ---

export function getMaps(): MapData[] {
  try {
    return JSON.parse(localStorage.getItem(MAPS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveMap(map: MapData): void {
  const maps = getMaps()
  const idx = maps.findIndex(m => m.id === map.id)
  if (idx >= 0) maps[idx] = map
  else maps.push(map)
  localStorage.setItem(MAPS_KEY, JSON.stringify(maps))
}

export function deleteMap(mapId: string): void {
  const maps = getMaps().filter(m => m.id !== mapId)
  localStorage.setItem(MAPS_KEY, JSON.stringify(maps))
  // Supprime aussi les calls associés
  const calls = getCalls().filter(c => c.mapId !== mapId)
  localStorage.setItem(CALLS_KEY, JSON.stringify(calls))
}

// --- Calls ---

export function getCalls(): Call[] {
  try {
    return JSON.parse(localStorage.getItem(CALLS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function getCallsForMap(mapId: string): Call[] {
  return getCalls().filter(c => c.mapId === mapId)
}

export function getCallsForFloor(mapId: string, floorId: string): Call[] {
  return getCalls().filter(c => c.mapId === mapId && c.floorId === floorId)
}

export function saveCall(call: Call): void {
  const calls = getCalls()
  const idx = calls.findIndex(c => c.id === call.id)
  if (idx >= 0) calls[idx] = call
  else calls.push(call)
  localStorage.setItem(CALLS_KEY, JSON.stringify(calls))
}

export function deleteCall(callId: string): void {
  const calls = getCalls().filter(c => c.id !== callId)
  localStorage.setItem(CALLS_KEY, JSON.stringify(calls))
}

export function deleteCallsForFloor(mapId: string, floorId: string): void {
  const calls = getCalls().filter(c => !(c.mapId === mapId && c.floorId === floorId))
  localStorage.setItem(CALLS_KEY, JSON.stringify(calls))
}

// --- Utils ---

export function generateId(): string {
  return crypto.randomUUID()
}
