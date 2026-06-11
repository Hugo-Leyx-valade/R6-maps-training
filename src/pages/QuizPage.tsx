import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { getMaps, getCalls, getImageUrl } from '../api'
import ZoomableMap from '../components/ZoomableMap'
import type { MapData, Call, QuizMode, QuizResult } from '../types'

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/[-_\s]+/g, ' ')
}

function isCorrect(input: string, call: Call): boolean {
  const n = normalize(input)
  if (normalize(call.name) === n) return true
  return call.aliases.some(a => normalize(a) === n)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQcmOptions(call: Call, allCalls: Call[]): string[] {
  const others = shuffle(allCalls.filter(c => c.id !== call.id)).slice(0, 3).map(c => c.name)
  return shuffle([call.name, ...others])
}

type Phase = 'question' | 'feedback' | 'done'

export default function QuizPage() {
  const { mapId } = useParams<{ mapId: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const mode = (params.get('mode') ?? 'qcm') as QuizMode

  const [map, setMap] = useState<MapData | null>(null)
  const [queue, setQueue] = useState<Call[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('question')
  const [results, setResults] = useState<QuizResult[]>([])
  const [typedAnswer, setTypedAnswer] = useState('')
  const [qcmOptions, setQcmOptions] = useState<string[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [allCalls, setAllCalls] = useState<Call[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!mapId) return
    Promise.all([getMaps(), getCalls(mapId)]).then(([maps, calls]) => {
      const m = maps.find(m => m.id === mapId)
      if (!m || calls.length === 0) { navigate('/'); return }
      setMap(m)
      setAllCalls(calls)
      setQueue(shuffle(calls))
    })
  }, [mapId, navigate])

  const currentCall = queue[currentIdx] ?? null

  useEffect(() => {
    if (currentCall && mode === 'qcm') setQcmOptions(buildQcmOptions(currentCall, allCalls))
    setTypedAnswer('')
    setSelectedOption(null)
    if (mode === 'type') setTimeout(() => inputRef.current?.focus(), 100)
  }, [currentCall, mode, allCalls])

  const submitAnswer = useCallback((answer: string) => {
    if (!currentCall || phase !== 'question') return
    const correct = isCorrect(answer, currentCall)
    setResults(r => [...r, { callId: currentCall.id, correct, givenAnswer: answer }])
    setSelectedOption(answer)
    setPhase('feedback')
  }, [currentCall, phase])

  function next() {
    if (currentIdx + 1 >= queue.length) setPhase('done')
    else { setCurrentIdx(i => i + 1); setPhase('question') }
  }

  const currentFloor = map?.floors.find(f => f.id === currentCall?.floorId)
  const currentFloorImgUrl = currentFloor?.imageUrl ? getImageUrl(currentFloor.imageUrl) : null
  const score = results.filter(r => r.correct).length

  if (!map || queue.length === 0) {
    return <div className="flex-1 flex items-center justify-center" style={{ color: '#8888aa' }}>Chargement...</div>
  }

  if (phase === 'done') {
    const pct = Math.round((score / results.length) * 100)
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-5xl">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
        <h2 className="text-2xl font-bold text-white">Session terminée</h2>
        <div className="text-5xl font-bold" style={{ color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#e8a020' : '#ef4444' }}>
          {score}/{results.length}
        </div>
        <p style={{ color: '#8888aa' }}>{pct}% de bonnes réponses</p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/')} className="px-5 py-2.5 rounded-lg font-semibold border" style={{ borderColor: '#2a2a4a', color: '#e8e8f0' }}>Accueil</button>
          <button
            onClick={() => { setQueue(shuffle(allCalls)); setCurrentIdx(0); setResults([]); setPhase('question') }}
            className="px-5 py-2.5 rounded-lg font-semibold"
            style={{ background: '#e8a020', color: '#0d0d1a' }}
          >
            Recommencer
          </button>
        </div>
      </div>
    )
  }

  const feedbackCorrect = phase === 'feedback' && results[results.length - 1]?.correct

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
      {/* Barre de progression */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#2a2a4a' }}>
          <div className="h-full rounded-full transition-all" style={{ background: '#e8a020', width: `${(currentIdx / queue.length) * 100}%` }} />
        </div>
        <span className="text-xs" style={{ color: '#8888aa' }}>{currentIdx + 1}/{queue.length}</span>
      </div>

      {/* Carte zoomable */}
      <div className="mx-4">
        <ZoomableMap imageUrl={currentFloorImgUrl}>
          {currentCall && (
            <div
              className={`call-marker ${phase === 'feedback' ? (feedbackCorrect ? 'correct' : 'wrong') : ''}`}
              style={{ left: `${currentCall.x}%`, top: `${currentCall.y}%` }}
            >
              <div className="ring" />
              <div className="dot" />
            </div>
          )}
          {currentFloor && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-semibold pointer-events-none" style={{ background: '#0d0d1acc', color: '#e8a020', backdropFilter: 'blur(4px)' }}>
              {currentFloor.name}
            </div>
          )}
        </ZoomableMap>
      </div>

      {/* Zone de réponse */}
      <div className="flex-1 flex flex-col p-4 gap-3">
        {phase === 'feedback' ? (
          <div className="p-3 rounded-lg text-center" style={{ background: feedbackCorrect ? '#22c55e22' : '#ef444422', border: `1px solid ${feedbackCorrect ? '#22c55e' : '#ef4444'}` }}>
            <p className="font-bold text-sm" style={{ color: feedbackCorrect ? '#22c55e' : '#ef4444' }}>
              {feedbackCorrect ? '✓ Correct !' : `✗ C'était : ${currentCall?.name}`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-center font-medium" style={{ color: '#8888aa' }}>Quel est le nom de cette position ?</p>
        )}

        {mode === 'qcm' && (
          <div className="grid grid-cols-2 gap-2">
            {qcmOptions.map(option => {
              let borderColor = '#2a2a4a', bg = '#16213e', textColor = '#e8e8f0'
              if (phase === 'feedback') {
                if (option === currentCall?.name) { borderColor = '#22c55e'; bg = '#22c55e22'; textColor = '#22c55e' }
                else if (option === selectedOption && !feedbackCorrect) { borderColor = '#ef4444'; bg = '#ef444422'; textColor = '#ef4444' }
              } else if (selectedOption === option) { borderColor = '#e8a020'; bg = '#e8a02022'; textColor = '#e8a020' }
              return (
                <button key={option} onClick={() => phase === 'question' && submitAnswer(option)} disabled={phase === 'feedback'}
                  className="py-3 px-3 rounded-lg text-sm font-semibold border-2 text-left transition-all"
                  style={{ borderColor, background: bg, color: textColor }}
                >
                  {option}
                </button>
              )
            })}
          </div>
        )}

        {mode === 'type' && (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={typedAnswer}
              onChange={e => setTypedAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && phase === 'question' && typedAnswer.trim() && submitAnswer(typedAnswer)}
              placeholder="Nom de la position..."
              disabled={phase === 'feedback'}
              className="flex-1 px-3 py-3 rounded-lg text-sm outline-none border-2"
              style={{ background: '#16213e', borderColor: phase === 'feedback' ? (feedbackCorrect ? '#22c55e' : '#ef4444') : '#2a2a4a', color: '#e8e8f0' }}
            />
            {phase === 'question' && (
              <button onClick={() => typedAnswer.trim() && submitAnswer(typedAnswer)} disabled={!typedAnswer.trim()} className="px-4 py-3 rounded-lg font-semibold text-sm disabled:opacity-40" style={{ background: '#e8a020', color: '#0d0d1a' }}>OK</button>
            )}
          </div>
        )}

        {phase === 'feedback' && (
          <button onClick={next} className="w-full py-3 rounded-lg font-bold text-sm hover:opacity-80" style={{ background: '#e8a020', color: '#0d0d1a' }}>
            {currentIdx + 1 >= queue.length ? 'Voir les résultats' : 'Suivant →'}
          </button>
        )}
      </div>
    </div>
  )
}
