# Proposal: Fix PDF viewer container sizing

## Intent

PDF renders in a tiny portion of the viewer instead of filling available space. Root cause: `PageFlip` defaults to `autoSize: true`, which constrains its wrapper to the page aspect ratio via `paddingBottom` instead of letting CSS flexbox control layout. This applies to all PDFs, not specific files.

## Scope

### In Scope
- Pass `autoSize: false` in the `PageFlip` settings within `flip-view.ts::mount()`
- Remove `width: 100%; height: 100%` canvas CSS overrides in `theme.css` (no longer needed compensation)
- Verify canvases carry `style.width/height` in px CSS logical (per AGENTS.md contract)

### Out of Scope
- Desktop (Tauri) regression testing (fix applies equally, separate verification)
- Refactoring `usePdfBook.ts` composable (only consumer of FlipView, no contract changes)
- New tests (test infrastructure is storage-layer only; manual visual regression)

## Capabilities

> Existing specs directory is empty — no capability specs to modify.

### New Capabilities
- None

### Modified Capabilities
- None

## Approach
1. **FlipView mount** (`packages/flip-view-engine/src/flip-view.ts`): Add `autoSize: false` to the `PageFlip` settings object (line ~91). This prevents the library from applying aspect-ratio padding on its wrapper DOM. The `size: 'stretch'` + explicit `width`/`height` px values already provide correct internal page sizing.
2. **Theme CSS** (`packages/reader-ui-kit/src/styles/theme.css`): Remove `width: 100%; height: 100%` rules on `.rk-book .rk-page canvas` (lines 187-189). The canvas now sizes correctly from the engine's `style.width/height` px values — no CSS override needed.
3. **Type declaration**: No change required; `autoSize` is already declared in `page-flip.d.ts` line 26.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/flip-view-engine/src/flip-view.ts` | Modified | Add `autoSize: false` to PageFlip settings |
| `packages/reader-ui-kit/src/styles/theme.css` | Modified | Remove canvas `width/height` overrides |
| `packages/flip-view-engine/src/page-flip.d.ts` | None | Already declares `autoSize` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Removal of `width:100%` on canvas breaks rendering in edge cases (zoom, DPR scaling) | Low | Canvas already carries explicit `style.width/height` in px from core-pdf-engine; CSS override was redundant compensation |
| `size: 'stretch'` interacts differently without `autoSize` | Low | `stretch` uses fixed `width`/`height` from settings, not autoSize; unit test via visual: `pnpm dev:web` |
| Desktop (Tauri) behaves differently | Low | Same FlipView code path; verify with `pnpm dev:desktop` post-fix |

## Rollback Plan
Revert the two changes. The CSS override is non-destructive and visible at a glance. The `autoSize: false` addition can be reverted by simply removing the line from the PageFlip settings object.

## Dependencies
- None (self-contained fix in two files)

## Success Criteria
- [ ] Web viewer renders PDFs filling the `.rk-reader` flexbox area
- [ ] Canvases carry explicit `style.width/height` px values from `core-pdf-engine` — no CSS overrides needed
- [ ] Single and double display modes render correctly
- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm dev:web` loads and renders a test PDF without the shrinking issue