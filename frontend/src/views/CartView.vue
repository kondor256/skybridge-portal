<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { formatMoney, unitLabel } from '../format';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import { useToastStore } from '../stores/toast';
import ProductImage from '../components/ProductImage.vue';
import QuantityInput from '../components/QuantityInput.vue';

const auth = useAuthStore();
const cartStore = useCartStore();
const toast = useToastStore();
const router = useRouter();

const busy = ref(null);
const confirmingClear = ref(false);

async function run(key, action, message) {
  busy.value = key;
  try {
    await action();
    if (message) toast.show(message);
  } catch (err) {
    toast.error(err.message);
    await cartStore.fetch();
  } finally {
    busy.value = null;
  }
}

const setQuantity = (item, quantity) => run(item.productId, () => cartStore.setQuantity(item.productId, quantity));
const remove = (item) => run(item.productId, () => cartStore.remove(item.productId), `${item.name} was removed from your cart.`);

async function clear() {
  confirmingClear.value = false;
  await run('all', () => cartStore.clear(), 'Your cart is now empty.');
}

function checkout() {
  router.push(auth.isLoggedIn ? { name: 'checkout' } : { name: 'login', query: { redirect: '/checkout' } });
}

// Read the cart again when the page opens: it may have changed in another tab.
onMounted(() => cartStore.fetch());
</script>

<template>
  <h1>Your cart</h1>

  <div v-if="cartStore.cart.items.length === 0" class="empty" data-testid="cart-empty">
    <h2>Your cart is empty</h2>
    <p>Browse the service packages and add the ones you need.</p>
    <RouterLink :to="{ name: 'catalogue' }" class="btn btn-primary">Browse services</RouterLink>
  </div>

  <div v-else class="cart-layout">
    <div class="card table-card">
      <table class="table cart-table" data-testid="cart-table">
        <thead>
          <tr>
            <th scope="col">Service package</th>
            <th scope="col" class="num">Unit price</th>
            <th scope="col">Quantity</th>
            <th scope="col" class="num">Line total</th>
            <th scope="col"><span class="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in cartStore.cart.items" :key="item.productId">
            <td>
              <div class="cart-item">
                <ProductImage :src="item.imageUrl" alt="" />
                <div>
                  <RouterLink :to="{ name: 'product', params: { id: item.productId } }">{{ item.name }}</RouterLink>
                  <small>{{ item.category }}</small>
                </div>
              </div>
            </td>
            <td class="num" data-label="Unit price">
              {{ formatMoney(item.price) }}<small>{{ unitLabel(item.unit) }}</small>
            </td>
            <td data-label="Quantity">
              <QuantityInput
                :model-value="item.quantity"
                :label="`quantity of ${item.name}`"
                :disabled="busy !== null"
                @update:model-value="setQuantity(item, $event)"
              />
            </td>
            <td class="num strong" data-label="Line total">{{ formatMoney(item.lineTotal) }}</td>
            <td class="actions">
              <button type="button" class="btn btn-small btn-danger-outline" :disabled="busy !== null" @click="remove(item)">Remove</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="table-footer">
        <RouterLink :to="{ name: 'catalogue' }" class="btn btn-secondary">Continue browsing</RouterLink>
        <template v-if="confirmingClear">
          <span>Remove all items?</span>
          <button type="button" class="btn btn-small btn-danger" @click="clear">Yes, empty the cart</button>
          <button type="button" class="btn btn-small btn-secondary" @click="confirmingClear = false">Keep items</button>
        </template>
        <button v-else type="button" class="btn btn-ghost" :disabled="busy !== null" @click="confirmingClear = true">Empty cart</button>
      </div>
    </div>

    <aside class="card summary-card" aria-label="Order summary">
      <h2>Summary</h2>
      <dl class="totals" data-testid="cart-totals">
        <div><dt>Subtotal</dt><dd>{{ formatMoney(cartStore.cart.subtotal) }}</dd></div>
        <div><dt>GST (15%)</dt><dd>{{ formatMoney(cartStore.cart.gst) }}</dd></div>
        <div class="total"><dt>Total</dt><dd>{{ formatMoney(cartStore.cart.total) }}</dd></div>
      </dl>
      <button type="button" class="btn btn-primary btn-large btn-block" :disabled="busy !== null" data-testid="checkout" @click="checkout">
        Proceed to checkout
      </button>
      <p v-if="!auth.isLoggedIn" class="field-hint">You will be asked to log in or register first. Your cart is kept.</p>
    </aside>
  </div>
</template>
