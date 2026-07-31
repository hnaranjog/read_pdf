# Read PDF

Aplicación para lectura de PDF en formato de libro.

Read PDF convierte la lectura de documentos PDF en una experiencia similar a la de un libro tradicional: animación de paso de página, modo doble página y navegación fluida, tanto en **desktop (Tauri)** como en **web**.

## Versión 2.0

Reescritura completa sobre stack moderno: **Vue 3 + Vite + TypeScript**, monorepo **pnpm**, app desktop con **Tauri v2** y almacenamiento local **SQLite**.

### Stack

| Capa | Librería |
|---|---|
| Renderizado PDF | `pdfjs-dist` (PDF.js de Mozilla) |
| Efecto libro | `page-flip` (StPageFlip), sin jQuery |
| UI | Vue 3 + Vite |
| Desktop | Tauri v2 (Rust) |
| Datos locales | SQLite (nativo en desktop, sql.js + OPFS en web) |
| API opcional | Express + TypeScript |

### Estructura

```
packages/
  shared-types/      # interfaces TS comunes
  core-pdf-engine/   # wrapper pdfjs-dist → canvas
  flip-view-engine/  # wrapper page-flip → animación de hojas
  storage-layer/     # SQLite con adapters (Tauri / OPFS)
  reader-ui-kit/     # componentes Vue 3 + tema
  playground/        # sandbox de desarrollo
apps/
  desktop/           # app Tauri v2
  web/               # SPA web
server/              # API Express TS (opcional)
```

## Características

* Visualización de PDF como libro con efecto de paso de página (arrastre de esquina, gestos táctiles).
* Vista doble página (spread) y página simple.
* Modos de color: normal, **sepia**, **oscuro invertido** y **textura de papel**.
* Tabla de contenidos interactiva (outline nativo del PDF).
* Cuadrícula de miniaturas para salto visual rápido.
* Marcadores con notas, persistidos por documento.
* Lectura en voz alta (Text-to-Speech).
* Biblioteca local: reanudación automática en la última página leída.
* Datos 100% locales (SQLite): usuarios, documentos, marcadores y ajustes.

## Instalación

Requisitos: Node.js ≥ 20, pnpm ≥ 9. Para la app desktop: [Rust](https://rustup.rs/) y los [prerrequisitos de Tauri](https://v2.tauri.app/start/prerequisites/).

```bash
git clone https://github.com/hnaranjog/read_pdf.git
cd read_pdf
pnpm install
```

### Desarrollo

```bash
pnpm dev:desktop     # app de escritorio Tauri
pnpm dev:web         # app web en http://localhost:5173
pnpm dev:server      # API Express en http://localhost:3000
```

### Verificación

```bash
pnpm typecheck
pnpm test
```

## Capturas de Pantalla

[![App Screenshot](https://i.postimg.cc/vHR6MyD1/img02.png)](https://postimg.cc/Yj3SfJ6k)

## Contribución

Las contribuciones son bienvenidas. Si deseas contribuir al proyecto, por favor sigue los siguientes pasos:

1. Fork del repositorio
2. Crea una rama con tu feature
3. `pnpm typecheck && pnpm test` en verde antes del PR

## Licencia

Este proyecto está bajo la licencia MIT - consulta el archivo LICENSE para más detalles.

## Contacto

Si tienes alguna pregunta o sugerencia, no dudes en ponerte en contacto conmigo:

Correo: hnaranjog@unadvirtual.edu.co
GitHub: https://github.com/hnaranjog
