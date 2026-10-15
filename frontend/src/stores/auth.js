import { defineStore } from 'pinia';
import { api } from '../api';
import { useCartStore } from './cart';

export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null }),
  getters: {
    isLoggedIn: (state) => state.user !== null,
    isAdmin: (state) => state.user?.role === 'admin',
    isCustomer: (state) => state.user?.role === 'customer',
  },
  actions: {
    // Called once when the site loads: is there still a session on the server?
    async fetchMe() {
      try {
        this.user = (await api.get('/auth/me')).user;
      } catch {
        this.user = null;
      }
    },
    async register(form) {
      this.user = (await api.post('/auth/register', form)).user;
      await useCartStore().fetch();
    },
    async login(email, password, portal = 'customer') {
      this.user = (await api.post('/auth/login', { email, password, portal })).user;
      await useCartStore().fetch();
    },
    async logout() {
      await api.post('/auth/logout');
      this.user = null;
      useCartStore().reset();
    },
  },
});
