<script setup>
import { useToastStore } from '../stores/toast';

const store = useToastStore();
</script>

<template>
  <div class="toast-host" role="status" aria-live="polite">
    <div v-for="toast in store.toasts" :key="toast.id" class="toast" :class="`toast-${toast.type}`">
      <span>{{ toast.message }}</span>
      <button type="button" aria-label="Dismiss message" @click="store.dismiss(toast.id)">×</button>
    </div>
  </div>
</template>
