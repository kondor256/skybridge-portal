import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth';

import CatalogueView from './views/CatalogueView.vue';
import ProductView from './views/ProductView.vue';
import CartView from './views/CartView.vue';
import CheckoutView from './views/CheckoutView.vue';
import OrdersView from './views/OrdersView.vue';
import RegisterView from './views/RegisterView.vue';
import LoginView from './views/LoginView.vue';
import AdminDashboardView from './views/AdminDashboardView.vue';
import NotFoundView from './views/NotFoundView.vue';

const routes = [
  { path: '/', name: 'catalogue', component: CatalogueView, meta: { title: 'Service packages' } },
  { path: '/services/:id(\\d+)', name: 'product', component: ProductView, props: true, meta: { title: 'Service package' } },
  { path: '/cart', name: 'cart', component: CartView, meta: { title: 'Your cart' } },
  { path: '/checkout', name: 'checkout', component: CheckoutView, meta: { title: 'Checkout', customer: true } },
  { path: '/orders', name: 'orders', component: OrdersView, meta: { title: 'My orders', customer: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { title: 'Create an account', guest: true } },
  { path: '/login', name: 'login', component: LoginView, meta: { title: 'Log in', guest: true } },
  { path: '/admin/login', name: 'admin-login', component: LoginView, props: { portal: 'admin' }, meta: { title: 'Administrator login', guest: true } },
  { path: '/admin', name: 'admin', component: AdminDashboardView, meta: { title: 'Admin dashboard', admin: true } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView, meta: { title: 'Page not found' } },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from, saved) => saved || { top: 0 },
});

// Only a safe in-site path may be used after login (no redirects to other sites).
export function safeRedirect(value, fallback = '/') {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.admin && !auth.isAdmin) {
    return { name: 'admin-login', query: { redirect: to.fullPath } };
  }
  if (to.meta.customer && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.customer && auth.isAdmin) {
    return { name: 'admin' };
  }
  if (to.meta.guest && auth.isLoggedIn) {
    return auth.isAdmin ? { name: 'admin' } : { name: 'catalogue' };
  }
  return true;
});

router.afterEach((to) => {
  document.title = `${to.meta.title} | SkyBridge Services Portal`;
});
