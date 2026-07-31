/**
 * Diagnóstico E2E: verifica que las páginas del PDF se renderizan con
 * contenido visible (no-blanco) dentro del flip view.
 *
 * Uso: node scripts/e2e-canvas.mjs
 */
import { chromium } from 'playwright';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TMP_DIR = new URL('../.tmp-e2e/', import.meta.url);
const PDF_PATH = fileURLToPath(new URL('test.pdf', TMP_DIR));
const SHOT_PATH = fileURLToPath(new URL('screenshot.png', TMP_DIR));
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const APP_URL = 'http://localhost:5173';

async function generatePdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (let i = 1; i <= 6; i++) {
    const page = pdf.addPage([612, 792]);
    page.drawRectangle({ x: 50, y: 600, width: 300, height: 120, color: rgb(0.9, 0.3, 0.2) });
    page.drawText(`PAGINA ${i} - TEST E2E`, { x: 60, y: 650, size: 36, font, color: rgb(1, 1, 1) });
    page.drawText('Texto de relleno para verificar renderizado.', { x: 60, y: 400, size: 18, font });
  }
  await mkdir(TMP_DIR, { recursive: true });
  await writeFile(PDF_PATH, await pdf.save());
  console.log('[e2e] PDF de prueba generado');
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* reintentar */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Servidor no disponible en ${url}`);
}

async function main() {
  await generatePdf();

  console.log('[e2e] Arrancando dev server…');
  const server = spawn('pnpm', ['dev:web'], {
    cwd: REPO_ROOT,
    shell: true,
    stdio: 'ignore',
  });

  try {
    await waitForServer(APP_URL);
    console.log('[e2e] Servidor listo, abriendo Chromium…');

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[browser:${msg.type()}]`, msg.text());
      }
    });
    page.on('pageerror', (err) => console.log('[browser:pageerror]', err.message));

    await page.goto(APP_URL);
    await page.setInputFiles('#rk-file-input', PDF_PATH);

    // Cerrar el popup de info si aparece
    const closeBtn = page.locator('.rk-popup-close');
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();

    console.log('[e2e] Esperando canvases…');
    await page.waitForSelector('.rk-book canvas', { timeout: 20000 });
    // Esperar a que termine el render progresivo (barra de progreso desaparece)
    await page.waitForSelector('.rk-progress', { state: 'detached', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const report = await page.evaluate(() => {
      const pages = [...document.querySelectorAll('.rk-book .rk-page')];
      return {
        pageDivs: pages.length,
        items: pages.slice(0, 4).map((div) => {
          const canvas = div.querySelector('canvas');
          if (!canvas) return { canvas: false };
          const rect = canvas.getBoundingClientRect();
          const ctx = canvas.getContext('2d');
          let nonWhite = -1;
          if (ctx && canvas.width > 0 && canvas.height > 0) {
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            nonWhite = 0;
            for (let i = 0; i < data.length; i += 4 * 97) {
              if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) nonWhite++;
            }
          }
          const cs = getComputedStyle(canvas);
          return {
            canvas: true,
            bitmapW: canvas.width,
            bitmapH: canvas.height,
            cssW: cs.width,
            cssH: cs.height,
            display: cs.display,
            visibility: cs.visibility,
            position: cs.position,
            rectW: Math.round(rect.width),
            rectH: Math.round(rect.height),
            nonWhiteSampled: nonWhite,
          };
        }),
        stfItems: document.querySelectorAll('.stf__item').length,
        bookHTML: document.querySelector('.rk-book')?.innerHTML.slice(0, 400),
      };
    });

    console.log('[e2e] REPORTE:', JSON.stringify(report, null, 2));
    await page.screenshot({ path: SHOT_PATH, fullPage: true });
    console.log('[e2e] Screenshot guardado en .tmp-e2e/screenshot.png');

    await browser.close();
  } finally {
    server.kill();
    spawn('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  }
}

main().catch((err) => {
  console.error('[e2e] FALLO:', err);
  process.exit(1);
});
