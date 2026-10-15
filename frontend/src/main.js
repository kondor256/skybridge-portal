import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { useAuthStore } from './stores/auth';
import { useCartStore } from './stores/cart';
import './styles/main.css';

async function start() {
  const app = createApp(App);
  app.use(createPinia());

  // Restore the session before the first route is checked, so a page reload
  // on /admin or /checkout does not bounce a logged-in user to the login page.
  await Promise.all([useAuthStore().fetchMe(), useCartStore().fetch()]);

  app.use(router);
  app.mount('#app');
}

start();
