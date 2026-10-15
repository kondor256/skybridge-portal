<script setup>
// Product picture with a fallback, so a wrong image address entered by an
// administrator never leaves a broken image on the page.
import { ref, watch } from 'vue';
import { FALLBACK_IMAGE } from '../format';

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
});

const current = ref(props.src || FALLBACK_IMAGE);

watch(
  () => props.src,
  (src) => {
    current.value = src || FALLBACK_IMAGE;
  },
);

function useFallback() {
  if (current.value !== FALLBACK_IMAGE) current.value = FALLBACK_IMAGE;
}
</script>

<template>
  <img :src="current" :alt="alt" @error="useFallback" />
</template>
