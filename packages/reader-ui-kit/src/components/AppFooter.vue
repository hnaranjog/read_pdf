<script setup lang="ts">
withDefaults(
  defineProps<{
    year?: number;
    author?: string;
    helpEmail?: string;
  }>(),
  { year: new Date().getFullYear(), author: 'software Naranja', helpEmail: 'hnaranjog@gmail.com' },
);
</script>

<template>
  <footer class="rk-footer">
    <span>
      &copy; Copyright — {{ year }} <strong>{{ author }}</strong> —
      <a :href="`mailto:${helpEmail}`">Ayuda</a>
    </span>
  </footer>
</template>

<style scoped>
.rk-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: var(--rk-footer-height);
  padding: 0.35rem 1rem;
  background: var(--rk-primary);
  color: var(--rk-on-primary);
  font-size: 0.85rem;
}

.rk-footer a {
  color: inherit;
  font-weight: bold;
  text-decoration: none;
}

.rk-footer a:hover {
  text-decoration: underline;
}
</style>
