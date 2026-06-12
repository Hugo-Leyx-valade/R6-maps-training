# R6 GUESSr

Train yourself to recognize **calls** and **cameras** on Rainbow Six Siege maps. A point appears on the map — identify the call or camera position before the timer runs out.

![App preview](https://placehold.co/800x400/16213e/e8a020?text=R6+GUESSr)

---

## Features

- **Multiple choice** — pick the right call from 4 options
- **Type mode** — type the call from memory (aliases accepted)
- **Camera mode** — locate cameras on the floor plan
- **Admin panel** — add your own maps, floors, calls and cameras
- **PWA** — installable on mobile and desktop, works offline

---

## Getting started

### Requirements

- [Node.js](https://nodejs.org/) v18+

### Installation

```bash
git clone https://github.com/Hugo-Leyx-valade/R6-maps-training.git
cd R6-maps-training
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Express server (API + data) runs on port 3000, Vite proxies `/api` requests automatically.

### Production

```bash
npm run build
npm start
```

Express serves the built frontend and exposes the API on port 3000.

---

## Usage

### Playing

1. On the home page, **select a map**
2. Choose a **game mode** (Multiple choice, Type, Cameras)
3. Click **Start**
4. A point appears on the floor plan — identify the call or camera

### Admin panel

Accessible via the **Admin** button or directly at `/admin`.

- **Add a map** — name + floor image(s)
- **Add calls** — click on the map to place a call, set its name and aliases
- **Add cameras** — same flow, in camera mode

---

## Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a branch from `main`: `git checkout -b feat/your-feature-name`
3. Commit your changes: `git commit -m "feat: description"`
4. Open a **Pull Request** targeting `main`

> All PRs must be approved before merging.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styles | Tailwind CSS v4 |
| Routing | React Router v7 |
| Backend | Express 5 (REST API + image upload) |
| Data | Local YAML files |
| PWA | vite-plugin-pwa + Workbox |
