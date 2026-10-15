import { defineStore } from 'pinia';

let nextId = 1;

// Short confirmation messages in the corner of the page ("Added to cart").
export const useToastStore = defineStore('toast', {
  state: () => ({ toasts: [] }),
  actions: {
    show(message, type = 'success') {
      const id = nextId++;
      this.toasts.push({ id, message, type });
      setTimeout(() => this.dismiss(id), 4000);
    },
    error(message) {
      this.show(message, 'error');
    },
    dismiss(id) {
      this.toasts = this.toasts.filter((toast) => toast.id !== id);
    },
  },
});
