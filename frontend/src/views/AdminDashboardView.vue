<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { formatDate, formatMoney, IMAGES, unitLabel, UNITS } from '../format';
import { useToastStore } from '../stores/toast';
import FormField from '../components/FormField.vue';
import ProductImage from '../components/ProductImage.vue';

const route = useRoute();
const router = useRouter();
const toast = useToastStore();

const products = ref([]);
const categories = ref([]);
const loading = ref(true);
const loadError = ref('');

const CUSTOM_IMAGE = 'custom';
const blankForm = () => ({
  name: '', categoryId: '', summary: '', description: '', featuresText: '', price: '',
  unit: 'project', duration: '', imageChoice: IMAGES[0].value, customImageUrl: '', isActive: true,
});

const editingId = ref(null); // null = closed, 0 = new package, otherwise the product id
const form = reactive(blankForm());
const errors = reactive({});
const formError = ref('');
const saving = ref(false);
const deleting = ref(null); // the product waiting for delete confirmation
const deleteBusy = ref(false);
const firstField = ref(null);

const activeCount = computed(() => products.value.filter((p) => p.isActive).length);
const formTitle = computed(() => (editingId.value === 0 ? 'Add service package' : 'Edit service package'));

async function load() {
  loadError.value = '';
  try {
    const [productData, categoryData] = await Promise.all([api.get('/admin/products'), api.get('/categories')]);
    products.value = productData.products;
    categories.value = categoryData.categories;
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      // The session ended (e.g. it expired): back to the admin login page.
      window.location.assign('/admin/login');
      return;
    }
    loadError.value = err.message;
  } finally {
    loading.value = false;
  }
}

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key]);
  formError.value = '';
}

// An error message disappears as soon as the administrator changes that field.
const ERROR_KEYS = { featuresText: 'features', imageChoice: 'imageUrl', customImageUrl: 'imageUrl' };
watch(
  () => ({ ...form }),
  (now, before) => {
    for (const key of Object.keys(now)) {
      if (now[key] !== before[key]) delete errors[ERROR_KEYS[key] || key];
    }
  },
);

async function openForm(product = null) {
  clearErrors();
  Object.assign(form, blankForm());
  if (product) {
    const bundled = IMAGES.some((image) => image.value === product.imageUrl);
    Object.assign(form, {
      name: product.name,
      categoryId: product.categoryId,
      summary: product.summary,
      description: product.description,
      featuresText: product.features.join('\n'),
      price: product.price,
      unit: product.unit,
      duration: product.duration,
      imageChoice: bundled ? product.imageUrl : CUSTOM_IMAGE,
      customImageUrl: bundled ? '' : product.imageUrl,
      isActive: product.isActive,
    });
  }
  editingId.value = product ? product.id : 0;
  await nextTick();
  firstField.value?.focus();
}

function closeForm() {
  editingId.value = null;
  if (route.query.edit) router.replace({ query: {} });
}

function validate() {
  clearErrors();
  if (form.name.trim().length < 3) errors.name = 'Enter a name (3 to 120 characters).';
  if (!form.categoryId) errors.categoryId = 'Choose a category.';
  if (form.summary.trim().length < 10) errors.summary = 'Enter a summary (10 to 255 characters).';
  if (form.price === '' || form.price === null || Number.isNaN(Number(form.price))) errors.price = 'Enter a price.';
  else if (Number(form.price) < 0) errors.price = 'Price cannot be negative.';
  if (form.imageChoice === CUSTOM_IMAGE && !/^https:\/\/\S+$/.test(form.customImageUrl.trim())) {
    errors.imageUrl = 'Enter an image address that starts with https://.';
  }
  return Object.keys(errors).length === 0;
}

async function save() {
  if (!validate()) {
    formError.value = 'Please correct the highlighted fields.';
    return;
  }
  const payload = {
    name: form.name,
    categoryId: Number(form.categoryId),
    summary: form.summary,
    description: form.description,
    features: form.featuresText.split('\n').map((line) => line.trim()).filter(Boolean),
    price: Number(form.price),
    unit: form.unit,
    duration: form.duration,
    imageUrl: form.imageChoice === CUSTOM_IMAGE ? form.customImageUrl.trim() : form.imageChoice,
    isActive: form.isActive,
  };

  saving.value = true;
  try {
    if (editingId.value === 0) {
      const { product } = await api.post('/admin/products', payload);
      toast.show(`${product.name} was added to the catalogue.`);
    } else {
      const { product } = await api.put(`/admin/products/${editingId.value}`, payload);
      toast.show(`${product.name} was updated.`);
    }
    closeForm();
    await load();
  } catch (err) {
    formError.value = err.message;
    Object.assign(errors, err.fields);
    if (err.status === 404) await load();
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  const product = deleting.value;
  deleteBusy.value = true;
  try {
    await api.delete(`/admin/products/${product.id}`);
    toast.show(`${product.name} was deleted.`);
  } catch (err) {
    toast.error(err.message);
  } finally {
    deleteBusy.value = false;
    deleting.value = null;
    await load();
  }
}

onMounted(async () => {
  await load();
  const product = products.value.find((p) => p.id === Number(route.query.edit));
  if (product) openForm(product);
});
</script>

<template>
  <div class="page-heading">
    <div>
      <h1>Admin dashboard</h1>
      <p class="muted">Add, edit and delete service packages. Changes are saved to the database and appear in the catalogue straight away.</p>
    </div>
    <button type="button" class="btn btn-primary" data-testid="add-product" @click="openForm()">Add service package</button>
  </div>

  <ul class="stats" aria-label="Catalogue summary">
    <li class="card"><strong data-testid="stat-total">{{ products.length }}</strong> packages in total</li>
    <li class="card"><strong>{{ activeCount }}</strong> visible to customers</li>
    <li class="card"><strong>{{ products.length - activeCount }}</strong> hidden</li>
  </ul>

  <p v-if="loadError" class="alert alert-error" role="alert">
    {{ loadError }}
    <button type="button" class="btn btn-small btn-secondary" @click="load">Try again</button>
  </p>
  <p v-else-if="loading" class="muted">Loading service packages…</p>

  <div v-else class="card table-card">
    <table class="table admin-table" data-testid="admin-table">
      <thead>
        <tr>
          <th scope="col">ID</th>
          <th scope="col">Service package</th>
          <th scope="col">Category</th>
          <th scope="col" class="num">Price</th>
          <th scope="col">Status</th>
          <th scope="col">Updated</th>
          <th scope="col"><span class="visually-hidden">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="product in products" :key="product.id">
          <td>{{ product.id }}</td>
          <td>
            <div class="cart-item">
              <ProductImage :src="product.imageUrl" alt="" />
              <div>
                <RouterLink v-if="product.isActive" :to="{ name: 'product', params: { id: product.id } }">{{ product.name }}</RouterLink>
                <span v-else>{{ product.name }}</span>
                <small>{{ product.summary }}</small>
              </div>
            </div>
          </td>
          <td>{{ product.category }}</td>
          <td class="num">{{ formatMoney(product.price) }}<small>{{ unitLabel(product.unit) }}</small></td>
          <td>
            <span class="status" :class="product.isActive ? 'status-completed' : 'status-cancelled'">{{ product.isActive ? 'Visible' : 'Hidden' }}</span>
          </td>
          <td>{{ formatDate(product.updatedAt) }}</td>
          <td class="actions">
            <button type="button" class="btn btn-small btn-secondary" :aria-label="`Edit ${product.name}`" @click="openForm(product)">Edit</button>
            <button type="button" class="btn btn-small btn-danger-outline" :aria-label="`Delete ${product.name}`" @click="deleting = product">Delete</button>
          </td>
        </tr>
        <tr v-if="products.length === 0">
          <td colspan="7" class="muted">There are no service packages yet. Add the first one.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Add / edit form -->
  <div v-if="editingId !== null" class="modal-backdrop" @keydown.esc="closeForm">
    <form class="modal card" role="dialog" aria-modal="true" aria-labelledby="form-title" novalidate data-testid="product-form" @submit.prevent="save">
      <h2 id="form-title">{{ formTitle }}</h2>

      <p v-if="formError" class="alert alert-error" role="alert">{{ formError }}</p>

      <FormField id="p-name" v-slot="field" label="Name" :error="errors.name">
        <input :id="field.id" ref="firstField" v-model="form.name" type="text" maxlength="120" :aria-invalid="field.invalid" :aria-describedby="field.describedBy" />
      </FormField>

      <div class="field-row">
        <FormField id="p-category" v-slot="field" label="Category" :error="errors.categoryId">
          <select :id="field.id" v-model="form.categoryId" :aria-invalid="field.invalid" :aria-describedby="field.describedBy">
            <option value="" disabled>Choose a category</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
        </FormField>

        <FormField id="p-duration" v-slot="field" label="Duration" optional :error="errors.duration">
          <input :id="field.id" v-model="form.duration" type="text" maxlength="60" placeholder="2 weeks" :aria-invalid="field.invalid" :aria-describedby="field.describedBy" />
        </FormField>
      </div>

      <div class="field-row">
        <FormField id="p-price" v-slot="field" label="Price (NZD, excl. GST)" :error="errors.price">
          <input :id="field.id" v-model="form.price" type="number" min="0" step="0.01" inputmode="decimal" :aria-invalid="field.invalid" :aria-describedby="field.describedBy" />
        </FormField>

        <FormField id="p-unit" v-slot="field" label="Priced" :error="errors.unit">
          <select :id="field.id" v-model="form.unit" :aria-invalid="field.invalid" :aria-describedby="field.describedBy">
            <option v-for="unit in UNITS" :key="unit.value" :value="unit.value">{{ unit.label }}</option>
          </select>
        </FormField>
      </div>

      <FormField id="p-summary" v-slot="field" label="Summary" :error="errors.summary" hint="One sentence shown on the catalogue card.">
        <input :id="field.id" v-model="form.summary" type="text" maxlength="255" :aria-invalid="field.invalid" :aria-describedby="field.describedBy" />
      </FormField>

      <FormField id="p-description" v-slot="field" label="Description" optional :error="errors.description">
        <textarea :id="field.id" v-model="form.description" rows="4" maxlength="5000" :aria-invalid="field.invalid" :aria-describedby="field.describedBy"></textarea>
      </FormField>

      <FormField id="p-features" v-slot="field" label="What is included" optional :error="errors.features" hint="One item per line, at most 10.">
        <textarea :id="field.id" v-model="form.featuresText" rows="4" :aria-invalid="field.invalid" :aria-describedby="field.describedBy"></textarea>
      </FormField>

      <div class="field-row">
        <FormField id="p-image" v-slot="field" label="Image" :error="form.imageChoice === 'custom' ? '' : errors.imageUrl">
          <select :id="field.id" v-model="form.imageChoice" :aria-describedby="field.describedBy">
            <option v-for="image in IMAGES" :key="image.value" :value="image.value">{{ image.label }}</option>
            <option :value="CUSTOM_IMAGE">Other image (web address)</option>
          </select>
        </FormField>

        <FormField v-if="form.imageChoice === CUSTOM_IMAGE" id="p-image-url" v-slot="field" label="Image address" :error="errors.imageUrl">
          <input :id="field.id" v-model="form.customImageUrl" type="url" maxlength="500" placeholder="https://" :aria-invalid="field.invalid" :aria-describedby="field.describedBy" />
        </FormField>
      </div>

      <label class="checkbox">
        <input v-model="form.isActive" type="checkbox" />
        Visible to customers in the catalogue
      </label>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" :disabled="saving" @click="closeForm">Cancel</button>
        <button type="submit" class="btn btn-primary" :disabled="saving" data-testid="save-product">
          {{ saving ? 'Saving…' : editingId === 0 ? 'Add package' : 'Save changes' }}
        </button>
      </div>
    </form>
  </div>

  <!-- Delete confirmation -->
  <div v-if="deleting" class="modal-backdrop" @keydown.esc="deleting = null">
    <div class="modal modal-small card" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-text">
      <h2 id="delete-title">Delete this service package?</h2>
      <p id="delete-text">
        <strong>{{ deleting.name }}</strong> will be removed from the catalogue and from customers' carts.
        Orders that were already placed keep their copy of the name and price. This cannot be undone.
      </p>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" :disabled="deleteBusy" @click="deleting = null">Cancel</button>
        <button type="button" class="btn btn-danger" :disabled="deleteBusy" data-testid="confirm-delete" @click="confirmDelete">
          {{ deleteBusy ? 'Deleting…' : 'Delete package' }}
        </button>
      </div>
    </div>
  </div>
</template>
