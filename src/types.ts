export interface Floor {
  id: string
  name: string
  imageUrl: string // URL blob ou chemin public
}

export interface MapData {
  id: string
  name: string
  floors: Floor[]
}

export interface Call {
  id: string
  mapId: string
  floorId: string
  name: string
  aliases: string[] // noms alternatifs acceptés
  x: number // % horizontal sur l'image (0-100)
  y: number // % vertical sur l'image (0-100)
}

export interface Camera {
  id: string
  mapId: string
  floorId: string
  x: number // % horizontal sur l'image (0-100)
  y: number // % vertical sur l'image (0-100)
}

export type QuizMode = 'qcm' | 'type' | 'camera'

export interface QuizResult {
  callId: string
  correct: boolean
  givenAnswer: string
}
