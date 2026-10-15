<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '../api';
import { formatMoney, quantityLabel, unitLabel } from '../format';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import { useToastStore } from '../stores/toast';
import ProductImage from '../components/ProductImage.vue';
import QuantityInput from '../components/QuantityInput.vue';

const props = defineProps({ id: { type: String, required: true } });

const auth = useAuthStore();
const cartStore = useCartStore();
const toast = useToastStore();

const product = ref(null);
const loading = ref(true);
const error = ref('');
const quantity = ref(1);
const adding = ref(false);

const inCart = computed(() => cartStore.cart.items.find((item) => item.productId === product.value?.id));
const paragraphs = computed(() => (product.value?.description || '').split(/\n+/).filter(Boolean));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    product.value = (await api.get(`/products/${props.id}`)).product;
    document.title = `${product.value.name} | SkyBridge Services Portal`;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function addToCart() {
  adding.value = true;
  try {
    await cartStore.add(product.value.id, quantity.value);
    toast.show(`${quantityLabel(quantity.value, product.value.unit)} of ${product.value.name} added to your cart.`);
    quantity.value = 1;
  } catch (err) {
    toast.error(err.message);
  } finally {
    adding.value = false;
  }
}

onMounted(load);
</script>

<template>
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <RouterLink :to="{ name: 'catalogue' }">Services</RouterLink>
    <template v-if="product">
      <span aria-hidden="true">›</span>
      <RouterLink :to="{ name: 'catalogue', query: { category: product.categorySlug } }">{{ product.category }}</RouterLink>
      <span aria-hidden="true">›</span>
      <span aria-current="page">{{ product.name }}</span>
    </template>
  </nav>

  <p v-if="loading" class="muted">Loading…</p>

  <div v-else-if="error" class="empty">
    <h1>Service package not available</h1>
    <p>{{ error }}</p>
    <RouterLink :to="{ name: 'catalogue' }" class="btn btn-primary">Back to all services</RouterLink>
  </div>

  <article v-else class="product-detail">
    <div class="detail-image card">
      <ProductImage :src="product.imageUrl" alt="" />
    </div>

    <div class="detail-main">
      <span class="category-tag" :class="`tag-${product.categorySlug}`">{{ product.category }}</span>
      <h1>{{ product.name }}</h1>
      <p class="lead">{{ product.summary }}</p>

      <p class="price price-large">
        {{ formatMoney(product.price) }} <small>{{ unitLabel(product.unit) }}, excl. GST</small>
      </p>
      <p v-if="product.duration" class="muted">Duration: {{ product.duration }}</p>

      <div v-if="auth.isAdmin" class="alert alert-info">
        You are logged in as an administrator.
        <RouterLink :to="{ name: 'admin', query: { edit: product.id } }">Edit this package</RouterLink>
      </div>
      <form v-else class="add-form" @submit.prevent="addToCart">
        <div>
          <span class="field-label">Quantity ({{ product.unit }}s)</span>
          <QuantityInput v-model="quantity" :label="`quantity of ${product.name}`" :disabled="adding" />
        </div>
        <button type="submit" class="btn btn-primary btn-large" :disabled="adding" data-testid="add-to-cart">
          {{ adding ? 'Adding…' : 'Add to cart' }}
        </button>
      </form>
      <p v-if="inCart" class="in-cart" data-testid="in-cart">
        In your cart: {{ quantityLabel(inCart.quantity, product.unit) }}.
        <RouterLink :to="{ name: 'cart' }">View cart</RouterLink>
      </p>

      <section v-if="paragraphs.length">
        <h2>About this package</h2>
        <p v-for="(paragraph, index) in paragraphs" :key="index">{{ paragraph }}</p>
      </section>

      <section v-if="product.features.length">
        <h2>What is included</h2>
        <ul class="feature-list">
          <li v-for="feature in product.features" :key="feature">{{ feature }}</li>
        </ul>
      </section>
    </div>
  </article>
</template>
