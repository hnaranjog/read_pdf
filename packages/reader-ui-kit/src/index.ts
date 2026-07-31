export { default as PdfReader } from './components/PdfReader.vue';
export { default as ProgressBar } from './components/ProgressBar.vue';
export { default as PaginatorBar } from './components/PaginatorBar.vue';
export { default as AppNavbar } from './components/AppNavbar.vue';
export { default as SideNav } from './components/SideNav.vue';
export { default as FileInfoPopup } from './components/FileInfoPopup.vue';
export { default as ColorModeSwitcher } from './components/ColorModeSwitcher.vue';
export { default as AppFooter } from './components/AppFooter.vue';
export { default as TocPanel } from './components/TocPanel.vue';
export { default as ThumbnailGrid } from './components/ThumbnailGrid.vue';
export { default as BookmarkPanel } from './components/BookmarkPanel.vue';
export { default as TtsControls } from './components/TtsControls.vue';

export { usePdfBook } from './composables/usePdfBook.js';
export type { UsePdfBookOptions, PdfBookState } from './composables/usePdfBook.js';
export { useColorMode } from './composables/useColorMode.js';
export { useTts } from './composables/useTts.js';
