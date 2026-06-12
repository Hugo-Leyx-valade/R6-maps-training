# R6 GUESSr

Entraîne-toi à reconnaître les **calls** et les **caméras** des maps de Rainbow Six Siege. Tu vois un point sur la map, tu dois trouver le call correspondant — en QCM, en saisie libre ou en mode caméras.

![Aperçu de l'application](https://placehold.co/800x400/16213e/e8a020?text=R6+GUESSr)

---

## Fonctionnalités

- **Mode QCM** — choisis le bon call parmi 4 propositions
- **Mode Écrire** — tape le call depuis ta mémoire (aliases acceptés)
- **Mode Caméras** — retrouve la position des caméras sur le plan
- **Interface admin** — ajoute tes propres maps, étages, calls et caméras
- **PWA** — installable sur mobile et desktop, fonctionne hors-ligne

---

## Lancer le projet

### Prérequis

- [Node.js](https://nodejs.org/) v18+

### Installation

```bash
git clone https://github.com/Hugo-Leyx-valade/R6-maps-training.git
cd R6-maps-training
npm install
```

### Développement

```bash
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173). Le serveur Express (API + données) tourne sur le port 3000, Vite proxie automatiquement les requêtes `/api`.

### Production

```bash
npm run build
npm start
```

Le serveur Express sert directement le build et expose l'API sur le port 3000.

---

## Utilisation

### Jouer

1. Sur la page d'accueil, **sélectionne une map**
2. Choisis un **mode de jeu** (QCM, Écrire, Caméras)
3. Clique sur **Commencer**
4. Un point apparaît sur le plan — identifie le call ou la caméra

### Interface admin

Accessible via le bouton **Admin** ou directement sur `/admin`.

- **Ajouter une map** — nom + image(s) de l'étage (floor)
- **Ajouter des calls** — clique sur la carte pour placer un call, renseigne son nom et ses aliases
- **Ajouter des caméras** — même principe, en mode caméra

---

## Contribuer

Les contributions sont les bienvenues ! Voici comment procéder :

1. Forke le dépôt
2. Crée une branche depuis `main` : `git checkout -b feat/nom-de-ta-feature`
3. Fais tes modifications et commit : `git commit -m "feat : description"`
4. Ouvre une **Pull Request** vers `main`

> Toutes les PRs doivent être approuvées avant d'être mergées.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styles | Tailwind CSS v4 |
| Routing | React Router v7 |
| Backend | Express 5 (API REST + upload images) |
| Données | Fichiers YAML locaux |
| PWA | vite-plugin-pwa + Workbox |
