<script setup lang="ts">
defineProps<{
  open: boolean;
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <Transition name="rk-sidenav">
    <aside v-if="open" class="rk-sidenav" aria-label="Menú lateral">
      <button type="button" class="rk-sidenav-close" aria-label="Cerrar menú" @click="emit('close')">
        &times;
      </button>

      <div class="rk-sidenav-profile">
        <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="rk-sidenav-avatar" />
        <div class="rk-sidenav-name">{{ userName ?? 'Invitado' }}</div>
        <div v-if="userEmail" class="rk-sidenav-email">{{ userEmail }}</div>
      </div>
      <hr />

      <nav class="rk-sidenav-links">
        <slot></slot>
      </nav>
    </aside>
  </Transition>
  <Transition name="rk-sidenav-backdrop">
    <div v-if="open" class="rk-sidenav-backdrop" @click="emit('close')"></div>
  </Transition>
</template>

<style scoped>
.rk-sidenav {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1002;
  width: 250px;
  height: 100%;
  padding: 3.5rem 1rem 1rem;
  background: var(--rk-primary-hover);
  color: var(--rk-on-primary);
  overflow-x: hidden;
}

.rk-sidenav-close {
  position: absolute;
  top: 0.25rem;
  right: 1rem;
  border: none;
  background: none;
  font-size: 2rem;
  color: var(--rk-on-primary);
  cursor: pointer;
}

.rk-sidenav-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.rk-sidenav-avatar {
  width: 56px;
  height: 56px;
  border-radius: 30%;
  background: #aaa;
}

.rk-sidenav-name {
  font-size: 1.1rem;
  font-weight: bold;
}

.rk-sidenav-email {
  font-size: 0.9rem;
  opacity: 0.85;
}

.rk-sidenav hr {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  margin: 1rem 0;
}

.rk-sidenav-links :deep(a),
.rk-sidenav-links :deep(button) {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  color: var(--rk-on-primary);
  font-size: 1.05rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  border-radius: var(--rk-radius);
  transition: background 0.2s ease;
}

.rk-sidenav-links :deep(a:hover),
.rk-sidenav-links :deep(button:hover) {
  background: rgba(255, 255, 255, 0.15);
}

.rk-sidenav-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1001;
  background: var(--rk-backdrop);
}

.rk-sidenav-enter-active,
.rk-sidenav-leave-active {
  transition: transform 0.35s ease;
}
.rk-sidenav-enter-from,
.rk-sidenav-leave-to {
  transform: translateX(-100%);
}
.rk-sidenav-backdrop-enter-active,
.rk-sidenav-backdrop-leave-active {
  transition: opacity 0.35s ease;
}
.rk-sidenav-backdrop-enter-from,
.rk-sidenav-backdrop-leave-to {
  opacity: 0;
}
</style>
