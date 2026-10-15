<script setup>
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import ToastHost from './components/ToastHost.vue';
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <AppHeader />
  <main id="main" class="container page">
    <RouterView :key="$route.path" />
  </main>
  <AppFooter />
  <ToastHost />
</template>
