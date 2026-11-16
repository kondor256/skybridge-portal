<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api';
import { formatDate, formatMoney, quantityLabel, STATUS_LABELS } from '../format';

const route = useRoute();
const orders = ref([]);
const loading = ref(true);
const error = ref('');

const placedId = computed(() => Number(route.query.placed) || null);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    orders.value = (await api.get('/orders')).orders;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <h1>My orders</h1>

  <p v-if="placedId" class="alert alert-success" role="status" data-testid="order-placed">
    Thank you. Order #{{ placedId }} has been placed. The SkyBridge team will contact you to confirm the start date.
  </p>

  <p v-if="loading" class="muted">Loading your orders…</p>

  <p v-else-if="error" class="alert alert-error" role="alert">
    {{ error }}
    <button type="button" class="btn btn-small btn-secondary" @click="load">Try again</button>
  </p>

  <div v-else-if="orders.length === 0" class="empty">
    <h2>You have no orders yet</h2>
    <RouterLink :to="{ name: 'catalogue' }" class="btn btn-primary">Browse services</RouterLink>
  </div>

  <ul v-else class="order-list">
    <li v-for="order in orders" :key="order.id" class="card order-card" :class="{ highlight: order.id === placedId }">
      <header>
        <div>
          <h2>Order #{{ order.id }}</h2>
          <p class="muted">{{ formatDate(order.createdAt) }} · {{ order.companyName ?? 'Company name unavailable' }}</p>
        </div>
        <span class="status" :class="`status-${order.status}`">{{ STATUS_LABELS[order.status] || order.status }}</span>
      </header>

      <table class="table">
        <thead>
          <tr>
            <th scope="col">Service package</th>
            <th scope="col">Quantity</th>
            <th scope="col" class="num">Unit price</th>
            <th scope="col" class="num">Line total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in order.items" :key="index">
            <td>{{ item.name }}</td>
            <td>{{ quantityLabel(item.quantity, item.unit) }}</td>
            <td class="num">{{ formatMoney(item.unitPrice) }}</td>
            <td class="num">{{ formatMoney(item.lineTotal) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- A3: a field that failed its integrity (GCM tag) check is shown as unavailable, never as wrong data. -->
      <p v-if="order.unavailableFields?.includes('notes')" class="order-notes muted" data-testid="field-unavailable">
        <strong>Notes:</strong> unavailable (the stored value failed its integrity check)
      </p>
      <p v-else-if="order.notes" class="order-notes"><strong>Notes:</strong> {{ order.notes }}</p>

      <dl class="totals totals-inline">
        <div><dt>Subtotal</dt><dd>{{ formatMoney(order.subtotal) }}</dd></div>
        <div><dt>GST (15%)</dt><dd>{{ formatMoney(order.gst) }}</dd></div>
        <div class="total"><dt>Total</dt><dd>{{ formatMoney(order.total) }}</dd></div>
      </dl>
    </li>
  </ul>
</template>
