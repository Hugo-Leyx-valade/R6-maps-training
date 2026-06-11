import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DATA_DIR        = path.join(__dirname, 'data')
const IMAGES_DIR      = path.join(DATA_DIR, 'images')
const BLUEPRINTS_DIR  = path.join(DATA_DIR, 'images', 'maps')
const MAPS_FILE       = path.join(DATA_DIR, 'maps.json')
const CALLS_FILE      = path.join(DATA_DIR, 'calls.json')
const CAMERAS_FILE    = path.join(DATA_DIR, 'cameras.json')

// Initialisation du dossier data
fs.mkdirSync(IMAGES_DIR, { recursive: true })
if (!fs.existsSync(MAPS_FILE))    fs.writeFileSync(MAPS_FILE,    '[]', 'utf8')
if (!fs.existsSync(CALLS_FILE))   fs.writeFileSync(CALLS_FILE,   '[]', 'utf8')
if (!fs.existsSync(CAMERAS_FILE)) fs.writeFileSync(CAMERAS_FILE, '[]', 'utf8')

// Seed automatique des maps depuis les fichiers YAML
function seedMapsFromYaml() {
  if (!fs.existsSync(BLUEPRINTS_DIR)) return
  const maps = readJson(MAPS_FILE)
  const existingIds = new Set(maps.map(m => m.id))
  let added = 0

  const files = fs.readdirSync(BLUEPRINTS_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
  for (const file of files) {
    const raw = fs.readFileSync(path.join(BLUEPRINTS_DIR, file), 'utf8')
    const blueprint = yaml.load(raw)
    if (!blueprint?.slug || !blueprint?.name || !Array.isArray(blueprint.blueprints)) continue
    if (existingIds.has(blueprint.slug)) continue

    const newMap = {
      id: blueprint.slug,
      name: blueprint.name,
      floors: blueprint.blueprints.map((bp, i) => ({
        id: `${blueprint.slug}-${i}`,
        name: bp.name,
        imageUrl: bp.url,
      })),
    }
    maps.push(newMap)
    existingIds.add(blueprint.slug)
    added++
  }

  if (added > 0) {
    writeJson(MAPS_FILE, maps)
    console.log(`[seed] ${added} map(s) importée(s) depuis les fichiers YAML`)
  }
}

seedMapsFromYaml()

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return [] }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

// Multer : stockage des images par floor id
const storage = multer.diskStorage({
  destination: IMAGES_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin'
    cb(null, `${req.params.id}${ext}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } })

const app = express()
app.use(express.json())

// ── API Maps ────────────────────────────────────────────────────────────────

app.get('/api/maps', (_req, res) => {
  res.json(readJson(MAPS_FILE))
})

app.put('/api/maps/:id', (req, res) => {
  const maps = readJson(MAPS_FILE)
  const idx = maps.findIndex(m => m.id === req.params.id)
  if (idx >= 0) maps[idx] = req.body
  else maps.push(req.body)
  writeJson(MAPS_FILE, maps)
  res.json({ ok: true })
})

app.delete('/api/maps/:id', (req, res) => {
  let maps = readJson(MAPS_FILE)
  const map = maps.find(m => m.id === req.params.id)
  maps = maps.filter(m => m.id !== req.params.id)
  writeJson(MAPS_FILE, maps)

  // Supprime les calls et caméras associés
  const calls = readJson(CALLS_FILE).filter(c => c.mapId !== req.params.id)
  writeJson(CALLS_FILE, calls)
  const cameras = readJson(CAMERAS_FILE).filter(c => c.mapId !== req.params.id)
  writeJson(CAMERAS_FILE, cameras)

  // Supprime les images des étages
  if (map) {
    map.floors.forEach(floor => {
      const files = fs.readdirSync(IMAGES_DIR).filter(f => f.startsWith(floor.id))
      files.forEach(f => fs.unlinkSync(path.join(IMAGES_DIR, f)))
    })
  }

  res.json({ ok: true })
})

// ── API Calls ────────────────────────────────────────────────────────────────

app.get('/api/calls', (req, res) => {
  let calls = readJson(CALLS_FILE)
  if (req.query.mapId) calls = calls.filter(c => c.mapId === req.query.mapId)
  res.json(calls)
})

app.put('/api/calls/:id', (req, res) => {
  const calls = readJson(CALLS_FILE)
  const idx = calls.findIndex(c => c.id === req.params.id)
  if (idx >= 0) calls[idx] = req.body
  else calls.push(req.body)
  writeJson(CALLS_FILE, calls)
  res.json({ ok: true })
})

app.delete('/api/calls/:id', (req, res) => {
  const calls = readJson(CALLS_FILE).filter(c => c.id !== req.params.id)
  writeJson(CALLS_FILE, calls)
  res.json({ ok: true })
})

// Supprime les calls d'un étage entier
app.delete('/api/calls', (req, res) => {
  const { mapId, floorId } = req.query
  let calls = readJson(CALLS_FILE)
  if (mapId && floorId) {
    calls = calls.filter(c => !(c.mapId === mapId && c.floorId === floorId))
  } else if (mapId) {
    calls = calls.filter(c => c.mapId !== mapId)
  }
  writeJson(CALLS_FILE, calls)
  res.json({ ok: true })
})

// ── API Cameras ──────────────────────────────────────────────────────────────

app.get('/api/cameras', (req, res) => {
  let cameras = readJson(CAMERAS_FILE)
  if (req.query.mapId) cameras = cameras.filter(c => c.mapId === req.query.mapId)
  res.json(cameras)
})

app.put('/api/cameras/:id', (req, res) => {
  const cameras = readJson(CAMERAS_FILE)
  const idx = cameras.findIndex(c => c.id === req.params.id)
  if (idx >= 0) cameras[idx] = req.body
  else cameras.push(req.body)
  writeJson(CAMERAS_FILE, cameras)
  res.json({ ok: true })
})

app.delete('/api/cameras/:id', (req, res) => {
  const cameras = readJson(CAMERAS_FILE).filter(c => c.id !== req.params.id)
  writeJson(CAMERAS_FILE, cameras)
  res.json({ ok: true })
})

app.delete('/api/cameras', (req, res) => {
  const { mapId, floorId } = req.query
  let cameras = readJson(CAMERAS_FILE)
  if (mapId && floorId) {
    cameras = cameras.filter(c => !(c.mapId === mapId && c.floorId === floorId))
  } else if (mapId) {
    cameras = cameras.filter(c => c.mapId !== mapId)
  }
  writeJson(CAMERAS_FILE, cameras)
  res.json({ ok: true })
})

// ── API Images ───────────────────────────────────────────────────────────────

app.post('/api/images/:id', upload.single('image'), (req, res) => {
  res.json({ url: `/api/images/${req.params.id}` })
})

app.get('/api/images/:id', (req, res) => {
  const files = fs.readdirSync(IMAGES_DIR)
  const match = files.find(f => f.startsWith(`${req.params.id}.`) || f === req.params.id)
  if (match) {
    res.sendFile(path.join(IMAGES_DIR, match))
  } else {
    res.status(404).end()
  }
})

app.delete('/api/images/:id', (req, res) => {
  const files = fs.readdirSync(IMAGES_DIR).filter(f => f.startsWith(`${req.params.id}.`) || f === req.params.id)
  files.forEach(f => fs.unlinkSync(path.join(IMAGES_DIR, f)))
  res.json({ ok: true })
})

// ── App React (production) ───────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'dist')))
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`R6 Gussr → http://localhost:${PORT}`)
})
