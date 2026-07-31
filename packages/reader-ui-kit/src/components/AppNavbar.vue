<script setup lang="ts">
defineProps<{
  brand?: string;
  logoUrl?: string;
}>();

const emit = defineEmits<{
  toggleSidenav: [];
  fileSelected: [file: File];
}>();

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    emit('fileSelected', file);
    input.value = ''; // permite re-seleccionar el mismo archivo
  }
}
</script>

<template>
  <nav class="rk-navbar">
    <div class="rk-navbar-left">
      <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="rk-navbar-logo" />
      <span class="rk-navbar-brand">{{ brand ?? 'ReadPDF' }}</span>
      <button
        type="button"
        class="rk-icon-btn rk-navbar-menu"
        aria-label="Abrir menú lateral"
        @click="emit('toggleSidenav')"
      >
        ☰
      </button>
    </div>
    <div class="rk-navbar-right">
      <slot name="actions"></slot>
      <slot name="upload">
        <div class="rk-upload">
          <input id="rk-file-input" type="file" accept="application/pdf" @change="onFileChange" />
          <label for="rk-file-input" class="rk-upload-label">Abrir PDF</label>
        </div>
      </slot>
      <slot name="file-info"></slot>
    </div>
  </nav>
</template>

<style scoped>
.rk-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: var(--rk-navbar-height);
  padding: 0 1.25rem;
  background: var(--rk-surface-alt);
  color: var(--rk-on-surface-alt);
  box-shadow: 0 2px 4px var(--rk-shadow);
}

.rk-navbar-left,
.rk-navbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.rk-navbar-logo {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.rk-navbar-brand {
  font-size: 1.4rem;
  font-weight: bold;
}

.rk-navbar-menu {
  color: var(--rk-primary);
}

.rk-upload input {
  display: none;
}

.rk-upload-label {
  display: inline-block;
  padding: 0.6rem 1.25rem;
  background: var(--rk-primary);
  color: var(--rk-on-primary);
  border-radius: var(--rk-radius);
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.rk-upload-label:hover {
  background: var(--rk-primary-hover);
}

@media (max-width: 768px) {
  .rk-navbar-brand {
    display: none;
  }
}
</style>
