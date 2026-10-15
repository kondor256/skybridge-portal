<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const route = useRoute();
const server = ref(null);

const PLATFORMS = { azure: 'Microsoft Azure', aws: 'Amazon Web Services', local: 'Local development' };

// Asked again on every page change: when the app is scaled out, the instance
// id shows which server behind the load balancer answered.
watch(
  () => route.fullPath,
  async () => {
    try {
      server.value = await api.get('/health');
    } catch {
      server.value = null;
    }
  },
  { immediate: true },
);
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-inner">
      <p>
        SkyBridge Tech Innovations Ltd. Demonstration site for SOFT807 Cloud Applications Development.
        All clients and orders are fictional.
      </p>
      <p class="footer-meta">
        <span v-if="server" data-testid="served-by">
          Served by {{ PLATFORMS[server.platform] || server.platform }} · instance {{ server.instance }}
        </span>
        <RouterLink v-if="!auth.isLoggedIn" :to="{ name: 'admin-login' }">Administrator login</RouterLink>
      </p>
    </div>
  </footer>
</template>
