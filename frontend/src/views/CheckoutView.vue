<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { formatMoney, quantityLabel } from '../format';
import { movingToSubmit, rules } from '../validation';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import FormField from '../components/FormField.vue';

const auth = useAuthStore();
const cartStore = useCartStore();
const router = useRouter();

const form = reactive({ companyName: '', contactPhone: auth.user?.phone || '', notes: '' });
const errors = reactive({ companyName: '', contactPhone: '', notes: '' });
const formError = ref('');
const submitting = ref(false);

function validate() {
  errors.companyName = rules.companyName(form.companyName);
  errors.contactPhone = rules.phone(form.contactPhone);
  errors.notes = form.notes.length > 1000 ? 'Notes must be 1000 characters or fewer.' : '';
  return !errors.companyName && !errors.contactPhone && !errors.notes;
}

async function placeOrder() {
  formError.value = '';
  if (!validate()) return;
  submitting.value = true;
  try {
    const { order } = await api.post('/orders', form);
    cartStore.reset();
    router.push({ name: 'orders', query: { placed: order.id } });
  } catch (err) {
    formError.value = err.message;
    Object.assign(errors, err.fields);
    await cartStore.fetch();
  } finally {
    submitting.value = false;
  }
}

onMounted(() => cartStore.fetch());
</script>

<template>
  <h1>Checkout</h1>

  <div v-if="cartStore.cart.items.length === 0" class="empty">
    <h2>Your cart is empty</h2>
    <p>Add a service package before you check out.</p>
    <RouterLink :to="{ name: 'catalogue' }" class="btn btn-primary">Browse services</RouterLink>
  </div>

  <div v-else class="cart-layout">
    <form class="card form-card" novalidate @submit.prevent="placeOrder">
      <h2>Order details</h2>
      <p class="muted">Ordering as {{ auth.user.fullName }} ({{ auth.user.email }}). No payment is taken online; SkyBridge sends an invoice after confirming the order.</p>

      <p v-if="formError" class="alert alert-error" role="alert">{{ formError }}</p>

      <FormField id="companyName" v-slot="field" label="Organisation name" :error="errors.companyName">
        <input :id="field.id" v-model="form.companyName" type="text" maxlength="120" autocomplete="organization" :aria-invalid="field.invalid" :aria-describedby="field.describedBy" @blur="movingToSubmit($event) || (errors.companyName = rules.companyName(form.companyName))" />
      </FormField>

      <FormField id="contactPhone" v-slot="field" label="Contact phone" :error="errors.contactPhone">
        <input :id="field.id" v-model="form.contactPhone" type="tel" maxlength="20" autocomplete="tel" :aria-invalid="field.invalid" :aria-describedby="field.describedBy" @blur="movingToSubmit($event) || (errors.contactPhone = rules.phone(form.contactPhone))" />
      </FormField>

      <FormField id="notes" v-slot="field" label="Notes for the SkyBridge team" optional :error="errors.notes" hint="For example your preferred start date.">
        <textarea :id="field.id" v-model="form.notes" rows="4" maxlength="1000" :aria-invalid="field.invalid" :aria-describedby="field.describedBy"></textarea>
      </FormField>

      <div class="form-actions">
        <RouterLink :to="{ name: 'cart' }" class="btn btn-secondary">Back to cart</RouterLink>
        <button type="submit" class="btn btn-primary btn-large" :disabled="submitting" data-testid="place-order">
          {{ submitting ? 'Placing order…' : 'Place order' }}
        </button>
      </div>
    </form>

    <aside class="card summary-card" aria-label="Order summary">
      <h2>Your order</h2>
      <ul class="summary-items">
        <li v-for="item in cartStore.cart.items" :key="item.productId">
          <span>{{ item.name }}<small>{{ quantityLabel(item.quantity, item.unit) }}</small></span>
          <span>{{ formatMoney(item.lineTotal) }}</span>
        </li>
      </ul>
      <dl class="totals">
        <div><dt>Subtotal</dt><dd>{{ formatMoney(cartStore.cart.subtotal) }}</dd></div>
        <div><dt>GST (15%)</dt><dd>{{ formatMoney(cartStore.cart.gst) }}</dd></div>
        <div class="total"><dt>Total</dt><dd>{{ formatMoney(cartStore.cart.total) }}</dd></div>
      </dl>
    </aside>
  </div>
</template>
