import { defineStore } from 'pinia';
import { api } from '../api';

const emptyCart = () => ({ items: [], count: 0, subtotal: 0, gst: 0, total: 0 });

// The cart itself is stored in the database; this store holds the latest copy
// the server returned, so the header badge and the cart page stay in step.
export const useCartStore = defineStore('cart', {
  state: () => ({ cart: emptyCart() }),
  actions: {
    reset() {
      this.cart = emptyCart();
    },
    async fetch() {
      try {
        this.cart = (await api.get('/cart')).cart;
      } catch {
        this.reset();
      }
    },
    async add(productId, quantity = 1) {
      this.cart = (await api.post('/cart/items', { productId, quantity })).cart;
    },
    async setQuantity(productId, quantity) {
      this.cart = (await api.patch(`/cart/items/${productId}`, { quantity })).cart;
    },
    async remove(productId) {
      this.cart = (await api.delete(`/cart/items/${productId}`)).cart;
    },
    async clear() {
      this.cart = (await api.delete('/cart')).cart;
    },
  },
});
