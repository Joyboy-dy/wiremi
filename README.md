<p align="center">
  <img src="public/favicon.svg" width="64" height="64" alt="" />
</p>

<h1 align="center">Wiremi</h1>

<p align="center">
  Sketch wireframes in the browser, draft them with AI, export them for your team or your AI coding tool.
</p>

<p align="center">
  <a href="https://github.com/Joyboy-dy/wiremi/actions/workflows/ci.yml"><img src="https://github.com/Joyboy-dy/wiremi/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT licence" /></a>
</p>

---

Wiremi is a free, open-source wireframe builder. Lay out a screen from 30 components, or describe it and let AI draft it, then export it as an image, an HTML page or a prompt for AI coding tools.

> **Status: front-end preview.** Projects are stored in your browser (`localStorage`); nothing leaves your machine except the AI requests you configure. Accounts and cloud sync will come with a back-end.

## Features

- **Projects**: create, rename, duplicate, delete, import a `.wire.json` export.
- **Infinite canvas**: scroll to pan, Ctrl + scroll or pinch to zoom, Space + drag or middle button to pan, zoom to fit.
- **Editing**: drag from the library or click to add, move, resize (Shift keeps the ratio), select several with Shift or a selection box, group and ungroup, double-click to work inside a group, copy, cut and paste (also between pages and projects), duplicate, align and distribute, layer order, lock, hide, rename.
- **Properties**: position, size, opacity, radius, rotation, fill, and content for buttons, text, inputs, checkboxes and tables.
- **History**: undo and redo for every change, a drag or a run of keystrokes counting as one step, plus named snapshots of the whole project.
- **Pages**: add, rename, duplicate, delete, canvas background per page.
- **Export**: the project as JSON; the current page as PNG, SVG, HTML, or a prompt ready for AI coding tools.
- **AI builder**: describe a screen and [Groq](https://groq.com) drafts it. Your API key and model are set in Settings and stay in your browser.

Press `?` in the editor to see every keyboard shortcut.

## Getting started

Requires Node.js 20 or later.

```bash
git clone https://github.com/Joyboy-dy/wiremi.git
cd wiremi
npm install
npm run dev
```

Then open http://localhost:8080.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm test` | Unit tests (editor operations, storage, AI parsing) |
| `npm run lint` | ESLint |
| `npm run build` | Production build in `dist/` |
| `npm run preview` | Serves the production build |

## How it is built

React 18, TypeScript, Vite, Tailwind CSS and shadcn/ui (Radix). PNG export uses html2canvas.

| Path | Role |
| --- | --- |
| `src/contexts/editorReducer.ts` | Every editing operation as a pure, tested function, with the undo history |
| `src/contexts/EditorContext.tsx` | React state, autosave, zoom and pan, clipboard |
| `src/lib/elements.ts` | Element tree helpers: nesting, page coordinates, locking, cloning |
| `src/components/editor/` | Canvas, panels, toolbar and dialogs |
| `src/utils/` | Storage, exports, AI generation |

Elements inside a group store their position relative to the group.

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## Licence

[MIT](LICENSE) © Joyboy-dy
