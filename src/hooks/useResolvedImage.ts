import { useState, useEffect } from 'react'
import { loadImageUrl } from '../imageStore'

// Résout une clé "idb:xxx" en blob URL, ou retourne l'URL directement
export function useResolvedImage(key: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!key) { setUrl(null); return }
    let revoked = false
    let blobUrl: string | null = null

    loadImageUrl(key).then(resolved => {
      if (revoked) {
        if (resolved?.startsWith('blob:')) URL.revokeObjectURL(resolved)
        return
      }
      blobUrl = resolved
      setUrl(resolved)
    })

    return () => {
      revoked = true
      if (blobUrl?.startsWith('blob:')) URL.revokeObjectURL(blobUrl)
    }
  }, [key])

  return url
}
