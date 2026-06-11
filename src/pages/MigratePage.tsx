import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveMap, saveCall, uploadImage } from '../api'

type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped'

interface Step {
  label: string
  status: StepStatus
  detail?: string
}

// Lecture IndexedDB (ancien format)
function openOldDB(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    const req = indexedDB.open('r6gussr', 1)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onupgradeneeded = () => resolve(null) // DB inexistante
  })
}

function readImageFromIDB(db: IDBDatabase, key: string): Promise<File | null> {
  return new Promise(resolve => {
    try {
      const tx = db.transaction('images', 'readonly')
      const req = tx.objectStore('images').get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export default function MigratePage() {
  const navigate = useNavigate()
  const [steps, setSteps] = useState<Step[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  function updateStep(idx: number, patch: Partial<Step>) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  async function runMigration() {
    setRunning(true)
    setDone(false)

    const allSteps: Step[] = [
      { label: 'Lecture des maps (localStorage)', status: 'pending' },
      { label: 'Lecture des calls (localStorage)', status: 'pending' },
      { label: 'Ouverture de l\'IndexedDB', status: 'pending' },
      { label: 'Migration des images', status: 'pending' },
      { label: 'Envoi des maps au serveur', status: 'pending' },
      { label: 'Envoi des calls au serveur', status: 'pending' },
    ]
    setSteps(allSteps)

    try {
      // ── Étape 0 : lecture maps ───────────────────────────────────────────
      updateStep(0, { status: 'running' })
      const mapsRaw = localStorage.getItem('r6gussr_maps')
      const maps = mapsRaw ? JSON.parse(mapsRaw) : []
      if (maps.length === 0) {
        updateStep(0, { status: 'skipped', detail: 'Aucune map trouvée dans localStorage' })
      } else {
        updateStep(0, { status: 'done', detail: `${maps.length} map(s)` })
      }

      // ── Étape 1 : lecture calls ──────────────────────────────────────────
      updateStep(1, { status: 'running' })
      const callsRaw = localStorage.getItem('r6gussr_calls')
      const calls = callsRaw ? JSON.parse(callsRaw) : []
      updateStep(1, { status: 'done', detail: `${calls.length} call(s)` })

      // ── Étape 2 : ouverture IDB ──────────────────────────────────────────
      updateStep(2, { status: 'running' })
      const db = await openOldDB()
      if (!db) {
        updateStep(2, { status: 'skipped', detail: 'Pas d\'IndexedDB trouvée' })
      } else {
        updateStep(2, { status: 'done' })
      }

      // ── Étape 3 : migration images ───────────────────────────────────────
      updateStep(3, { status: 'running' })
      let imagesMigrated = 0
      let imagesSkipped = 0

      for (const map of maps) {
        for (const floor of map.floors ?? []) {
          if (!floor.imageUrl?.startsWith('idb:')) continue
          const floorId = floor.imageUrl.slice(4)

          if (!db) { imagesSkipped++; continue }

          const file = await readImageFromIDB(db, floorId)
          if (!file) { imagesSkipped++; continue }

          try {
            const url = await uploadImage(floorId, file instanceof File ? file : new File([file as Blob], 'image.png'))
            floor.imageUrl = url
            imagesMigrated++
          } catch {
            imagesSkipped++
          }
        }
      }

      updateStep(3, {
        status: 'done',
        detail: `${imagesMigrated} envoyée(s)${imagesSkipped ? `, ${imagesSkipped} ignorée(s)` : ''}`,
      })

      // ── Étape 4 : envoi maps ─────────────────────────────────────────────
      updateStep(4, { status: 'running' })
      for (const map of maps) {
        await saveMap(map)
      }
      updateStep(4, { status: 'done', detail: `${maps.length} map(s)` })

      // ── Étape 5 : envoi calls ────────────────────────────────────────────
      updateStep(5, { status: 'running' })
      for (const call of calls) {
        await saveCall(call)
      }
      updateStep(5, { status: 'done', detail: `${calls.length} call(s)` })

      setDone(true)
    } catch (err) {
      console.error(err)
      setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error', detail: String(err) } : s))
    } finally {
      setRunning(false)
    }
  }

  const statusIcon: Record<StepStatus, string> = {
    pending: '○',
    running: '⟳',
    done: '✓',
    error: '✗',
    skipped: '–',
  }
  const statusColor: Record<StepStatus, string> = {
    pending: '#8888aa',
    running: '#e8a020',
    done: '#22c55e',
    error: '#ef4444',
    skipped: '#8888aa',
  }

  return (
    <div className="p-6 max-w-lg mx-auto w-full flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-white mb-1">Migration des données</h1>
        <p className="text-sm" style={{ color: '#8888aa' }}>
          Transfère les maps, calls et images depuis le stockage local du navigateur vers le serveur.
        </p>
      </div>

      {!running && !done && steps.length === 0 && (
        <div className="p-4 rounded-xl text-sm" style={{ background: '#16213e', border: '1px solid #2a2a4a', color: '#8888aa' }}>
          <p className="font-semibold text-white mb-2">Avant de continuer :</p>
          <ul className="flex flex-col gap-1 list-disc list-inside">
            <li>Le serveur doit être démarré (<code style={{ color: '#e8a020' }}>npm run dev</code>)</li>
            <li>Les données restent dans le navigateur après migration</li>
            <li>Cette opération peut être relancée sans risque (elle écrase)</li>
          </ul>
        </div>
      )}

      {steps.length > 0 && (
        <div className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg" style={{ background: '#16213e' }}>
              <span className="font-mono font-bold text-sm flex-shrink-0" style={{ color: statusColor[step.status] }}>
                {statusIcon[step.status]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{step.label}</p>
                {step.detail && <p className="text-xs mt-0.5" style={{ color: statusColor[step.status] }}>{step.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {done && (
        <div className="p-4 rounded-xl text-center" style={{ background: '#22c55e22', border: '1px solid #22c55e' }}>
          <p className="font-bold text-white mb-1">Migration terminée !</p>
          <p className="text-sm" style={{ color: '#22c55e' }}>
            Tes données sont maintenant dans le dossier <code>data/</code>
          </p>
        </div>
      )}

      <div className="flex gap-3">
        {!done ? (
          <button
            onClick={runMigration}
            disabled={running}
            className="flex-1 py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-opacity hover:opacity-80"
            style={{ background: '#e8a020', color: '#0d0d1a' }}
          >
            {running ? 'Migration en cours...' : 'Lancer la migration'}
          </button>
        ) : (
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
            style={{ background: '#22c55e', color: '#0d0d1a' }}
          >
            Aller jouer →
          </button>
        )}
        <button
          onClick={() => navigate('/')}
          className="px-4 py-3 rounded-xl text-sm transition-opacity hover:opacity-80"
          style={{ background: '#16213e', color: '#8888aa', border: '1px solid #2a2a4a' }}
        >
          Ignorer
        </button>
      </div>
    </div>
  )
}
