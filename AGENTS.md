# AGENTS.md

## Dev commands

```bash
pnpm install            # instala todo el workspace (obligatorio tras clonar)
pnpm dev:desktop        # app Tauri v2 (objetivo principal) — requiere Rust
pnpm dev:web            # SPA web en http://localhost:5173
pnpm dev:server         # API Express+TS en http://localhost:3000 (tsx watch)
pnpm dev:playground     # sandbox mínimo de engines (sin storage)
pnpm typecheck          # tsc/vue-tsc --noEmit en todos los packages
pnpm test               # vitest (hoy: solo storage-layer)
```

No hay linter ni formatter configurados. Commits en español/inglés mezclados, mensajes cortos.

## Arquitectura (monorepo pnpm)

Contrato entre capas — **respetarlo es la regla #1 del proyecto**:

```
core-pdf-engine ──(Promise<HTMLCanvasElement>)──> flip-view-engine ──(eventos)──> reader-ui-kit ──> apps/*
```

| Package | Responsabilidad | NO debe |
|---|---|---|
| `@readpdf/shared-types` | Interfaces TS comunes (PDF, User, Bookmark, Settings) | tener código runtime (salvo constantes) |
| `@readpdf/core-pdf-engine` | Wrapper de `pdfjs-dist`: loadPdf, renderPage, renderThumbnail, getOutline, getTextContent | tocar DOM de animación ni Vue |
| `@readpdf/flip-view-engine` | Wrapper de `page-flip` (StPageFlip): clase FlipView, agnóstica al contenido | importar pdfjs ni saber qué es un PDF |
| `@readpdf/storage-layer` | SQLite con adapters (Tauri nativo / sql.js+OPFS web), repos tipados | importar Vue ni engines |
| `@readpdf/reader-ui-kit` | Componentes Vue 3 + composables + `styles.css` (tema) | hablar con Tauri APIs ni fetch |
| `apps/desktop` | Tauri v2: diálogos nativos, SQLite plugin, ventana | lógica de negocio (va en packages) |
| `apps/web` | SPA: input file, biblioteca en OPFS, mismos paneles | APIs Tauri |
| `server` | Express TS — **reusa storage-layer** con persistencia a archivo | duplicar schema/repos |

## Convenciones del workspace

- **Internal packages pattern**: los `exports` de cada package apuntan a `./src/index.ts` (sin build step). Vite/tsx los consumen directo. No añadir pasos de build a los packages.
- **Typecheck por package**: `tsc --noEmit` (o `vue-tsc` si hay `.vue`). Todo package nuevo debe tener script `typecheck` y extender `tsconfig.base.json`.
- **Declaraciones ambient** (`*?url`, módulos sin tipos como `page-flip`): van en un `.d.ts` junto al código y se anclan con `/// <reference path="..." />` en el archivo que las usa — sin el reference no viajan a los consumidores del package.
- **Assets wasm/worker**: import con sufijo `?url` (Vite). Si el módulo también corre en Node (server, tests), el import `?url` debe ser **perezoso** (`await import(...)` solo en el path browser) o Node crashea con `ERR_UNKNOWN_FILE_EXTENSION`. Ver `SqlJsAdapter.init()` como referencia.
- snake_case en SQLite ↔ camelCase en TS: el mapeo vive en los repositorios, nunca fuera.

## Datos y persistencia

- **Desktop**: `tauri-plugin-sql` → `sqlite:readpdf.db` (nativa). `Database.create()` auto-detecta via `__TAURI_INTERNALS__`.
- **Web**: `sql.js` (wasm) + OPFS (`readpdf.db`), fallback IndexedDB. Los binarios PDF van aparte en OPFS `pdfs/{docId}.pdf` (ver `apps/web/src/pdf-store.ts`).
- **Server**: misma storage-layer + hooks de persistencia a `server/data/readpdf.db` (gitignored).
- Schema único en `packages/storage-layer/src/schema.ts` (users, documents, bookmarks, annotations, settings). Cambios de schema = editar ahí + tests.

## Gotchas

- **pdf.js v5**: `page.render()` requiere `canvas` (no solo `canvasContext`). El worker se emite como asset separado (~1.2 MB, carga bajo demanda).
- **`page-flip` no tiene tipos** — la declaración propia está en `packages/flip-view-engine/src/page-flip.d.ts`. Ampliarla ahí si se usa más API.
- **CSP de Tauri** (`tauri.conf.json`) incluye `'wasm-unsafe-eval'` y `worker-src 'self' blob:` — necesarios para pdf.js; no endurecer sin probar.
- **fs scope en Tauri**: las rutas elegidas vía diálogo nativo quedan autorizadas para `fs` solo durante la sesión. Leer rutas arbitrarias requiere ampliar capabilities.
- **FlipView páginas**: el canvas lleva `style.width/height` en px CSS lógicos (sin DPR) — flip-view-engine depende de eso para dimensionar. No quitar.
- **Reanudar lectura**: `PdfReader` es inmutable tras montar; las apps fuerzan recreación con `:key` al cambiar documento/startPage.
- **`backup/`** existe en el árbol, gitignored — snapshots dev-only, ignorar.
- El Chrome extension `manifest.json` legacy se eliminó en la migración v2; si se quiere extensión, es un tercer target de build nuevo.

## Verificación antes de dar por bueno un cambio

```bash
pnpm typecheck && pnpm test
pnpm --filter @readpdf/web build        # si tocaste engine/ui-kit
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml   # si tocaste Tauri
```
