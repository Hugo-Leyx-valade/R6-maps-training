import { useState, useEffect } from 'react'
import { loadImageUrl } from '../imageStore'
import type { MapData } from '../types'

// Retourne un dict floorId -> blobUrl pour toutes les floors d'une map
export function useMapImages(map: MapData | null): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!map) { setUrls({}); return }
    const blobUrls: string[] = []
    let cancelled = false

    const resolve = async () => {
      const entries: Record<string, string> = {}
      for (const floor of map.floors) {
        if (!floor.imageUrl) continue
        const url = await loadImageUrl(floor.imageUrl)
        if (cancelled) break
        if (url) {
          entries[floor.id] = url
          if (url.startsWith('blob:')) blobUrls.push(url)
        }
      }
      if (!cancelled) setUrls(entries)
    }
    resolve()

    return () => {
      cancelled = true
      blobUrls.forEach(u => URL.revokeObjectURL(u))
    }
  }, [map])

  return urls
}
