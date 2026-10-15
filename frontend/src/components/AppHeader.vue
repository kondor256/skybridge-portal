<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import { useToastStore } from '../stores/toast';

const auth = useAuthStore();
const cartStore = useCartStore();
const toast = useToastStore();
const router = useRouter();

async function logout() {
  const wasAdmin = auth.isAdmin;
  try {
    await auth.logout();
    toast.show('You have been logged out.');
    router.push(wasAdmin ? { name: 'admin-login' } : { name: 'catalogue' });
  } catch (err) {
    toast.error(err.message);
  }
}
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <RouterLink :to="{ name: 'catalogue' }" class="brand" aria-label="SkyBridge Services Portal home">
        <img src="/favicon.svg" alt="" width="34" height="34" />
        <span>
          <strong>SkyBridge</strong>
          <small>Services Portal</small>
        </span>
      </RouterLink>

      <nav class="main-nav" aria-label="Main">
        <RouterLink :to="{ name: 'catalogue' }">Services</RouterLink>

        <template v-if="auth.isAdmin">
          <RouterLink :to="{ name: 'admin' }">Admin dashboard</RouterLink>
        </template>
        <template v-else>
          <RouterLink v-if="auth.isCustomer" :to="{ name: 'orders' }">My orders</RouterLink>
          <RouterLink :to="{ name: 'cart' }" class="cart-link">
            Cart
            <span v-if="cartStore.cart.count > 0" class="badge" data-testid="cart-count">{{ cartStore.cart.count }}</span>
          </RouterLink>
        </template>

        <template v-if="auth.isLoggedIn">
          <span class="user-name" data-testid="user-name">
            {{ auth.user.fullName }}
            <span v-if="auth.isAdmin" class="role-tag">Admin</span>
          </span>
          <button type="button" class="btn btn-ghost" data-testid="logout" @click="logout">Log out</button>
        </template>
        <template v-else>
          <RouterLink :to="{ name: 'login' }">Log in</RouterLink>
          <RouterLink :to="{ name: 'register' }" class="btn btn-primary btn-small">Register</RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>
