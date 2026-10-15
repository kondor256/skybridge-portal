<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { formatMoney, unitLabel } from '../format';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import { useToastStore } from '../stores/toast';
import ProductImage from '../components/ProductImage.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const cartStore = useCartStore();
const toast = useToastStore();

const categories = ref([]);
const products = ref([]);
const loading = ref(true);
const error = ref('');
const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
const adding = ref(null);

const activeCategory = computed(() => (typeof route.query.category === 'string' ? route.query.category : ''));
const totalCount = computed(() => categories.value.reduce((sum, c) => sum + c.productCount, 0));

// The catalogue is always read from the database, so a package that an
// administrator has just added, changed or deleted shows the new state.
async function load() {
  loading.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams();
    if (activeCategory.value) params.set('category', activeCategory.value);
    if (search.value.trim()) params.set('q', search.value.trim());
    const query = params.toString();
    const [categoryData, productData] = await Promise.all([
      api.get('/categories'),
      api.get(`/products${query ? `?${query}` : ''}`),
    ]);
    categories.value = categoryData.categories;
    products.value = productData.products;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function setCategory(slug) {
  router.replace({ query: { ...(slug && { category: slug }), ...(search.value.trim() && { q: search.value.trim() }) } });
}

function submitSearch() {
  router.replace({ query: { ...(activeCategory.value && { category: activeCategory.value }), ...(search.value.trim() && { q: search.value.trim() }) } });
}

function clearFilters() {
  search.value = '';
  router.replace({ query: {} });
}

async function addToCart(product) {
  adding.value = product.id;
  try {
    await cartStore.add(product.id, 1);
    toast.show(`${product.name} was added to your cart.`);
  } catch (err) {
    toast.error(err.message);
    if (err.status === 404) load();
  } finally {
    adding.value = null;
  }
}

onMounted(load);
watch(() => route.query, load);
</script>

<template>
  <section class="hero">
    <h1>Service packages for a secure, automated and data-driven organisation</h1>
    <p>
      Choose a fixed-price package from SkyBridge Tech Innovations, add it to your cart and place your order online.
      Prices are in New Zealand dollars and exclude GST.
    </p>
  </section>

  <section aria-label="Filter service packages" class="filters">
    <div class="tabs" role="group" aria-label="Service category">
      <button type="button" class="tab" :class="{ active: activeCategory === '' }" :aria-pressed="activeCategory === ''" @click="setCategory('')">
        All services <span class="tab-count">{{ totalCount }}</span>
      </button>
      <button
        v-for="category in categories"
        :key="category.id"
        type="button"
        class="tab"
        :class="{ active: activeCategory === category.slug }"
        :aria-pressed="activeCategory === category.slug"
        @click="setCategory(category.slug)"
      >
        {{ category.name }} <span class="tab-count">{{ category.productCount }}</span>
      </button>
    </div>

    <form class="search" role="search" @submit.prevent="submitSearch">
      <label for="search" class="visually-hidden">Search service packages</label>
      <input id="search" v-model="search" type="search" placeholder="Search packages" maxlength="100" />
      <button type="submit" class="btn btn-secondary">Search</button>
    </form>
  </section>

  <p v-if="error" class="alert alert-error" role="alert">
    {{ error }}
    <button type="button" class="btn btn-small btn-secondary" @click="load">Try again</button>
  </p>

  <p v-else-if="loading && products.length === 0" class="muted">Loading service packages…</p>

  <div v-else-if="products.length === 0" class="empty">
    <h2>No service packages found</h2>
    <p>Try another category or search word.</p>
    <button type="button" class="btn btn-secondary" @click="clearFilters">Show all services</button>
  </div>

  <ul v-else class="product-grid" data-testid="product-grid">
    <li v-for="product in products" :key="product.id" class="card product-card">
      <RouterLink :to="{ name: 'product', params: { id: product.id } }" class="card-image" tabindex="-1" aria-hidden="true">
        <ProductImage :src="product.imageUrl" alt="" />
      </RouterLink>
      <div class="card-body">
        <span class="category-tag" :class="`tag-${product.categorySlug}`">{{ product.category }}</span>
        <h2>
          <RouterLink :to="{ name: 'product', params: { id: product.id } }">{{ product.name }}</RouterLink>
        </h2>
        <p class="summary">{{ product.summary }}</p>
        <p class="price">
          {{ formatMoney(product.price) }} <small>{{ unitLabel(product.unit) }}</small>
        </p>
        <div class="card-actions">
          <RouterLink :to="{ name: 'product', params: { id: product.id } }" class="btn btn-secondary">View details</RouterLink>
          <button v-if="!auth.isAdmin" type="button" class="btn btn-primary" :disabled="adding === product.id" @click="addToCart(product)">
            {{ adding === product.id ? 'Adding…' : 'Add to cart' }}
          </button>
        </div>
      </div>
    </li>
  </ul>
</template>
