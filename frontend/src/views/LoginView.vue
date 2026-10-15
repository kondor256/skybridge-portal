<script setup>
// One login form for both roles. /login is the customer page; /admin/login
// passes portal="admin" and the server then accepts administrators only.
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { safeRedirect } from '../router';
import { rules } from '../validation';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import FormField from '../components/FormField.vue';

const props = defineProps({ portal: { type: String, default: 'customer' } });

const auth = useAuthStore();
const toast = useToastStore();
const route = useRoute();
const router = useRouter();

const isAdminPortal = computed(() => props.portal === 'admin');
const form = reactive({ email: '', password: '' });
const errors = reactive({ email: '', password: '' });
const formError = ref('');
const submitting = ref(false);

function validate() {
  errors.email = rules.email(form.email);
  errors.password = rules.password(form.password);
  return !errors.email && !errors.password;
}

async function submit() {
  formError.value = '';
  if (!validate()) return;
  submitting.value = true;
  try {
    await auth.login(form.email, form.password, props.portal);
    toast.show(`Welcome back, ${auth.user.fullName}.`);
    router.push(auth.isAdmin ? { name: 'admin' } : safeRedirect(route.query.redirect));
  } catch (err) {
    formError.value = err.message;
    Object.assign(errors, err.fields);
    form.password = '';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <form class="card form-card" :class="{ 'admin-card': isAdminPortal }" novalidate data-testid="login-form" @submit.prevent="submit">
      <span v-if="isAdminPortal" class="role-tag">Staff only</span>
      <h1>{{ isAdminPortal ? 'Administrator login' : 'Log in' }}</h1>
      <p class="muted">
        {{ isAdminPortal ? 'Manage the SkyBridge service catalogue.' : 'Log in to place an order and see your orders.' }}
      </p>

      <p v-if="route.query.redirect && !formError" class="alert alert-info">Please log in to continue.</p>
      <p v-if="formError" class="alert alert-error" role="alert" data-testid="form-error">{{ formError }}</p>

      <FormField id="email" v-slot="field" label="Email address" :error="errors.email">
        <input :id="field.id" v-model="form.email" type="email" maxlength="254" autocomplete="username" :aria-invalid="field.invalid" :aria-describedby="field.describedBy" />
      </FormField>

      <FormField id="password" v-slot="field" label="Password" :error="errors.password">
        <input :id="field.id" v-model="form.password" type="password" maxlength="72" autocomplete="current-password" :aria-invalid="field.invalid" :aria-describedby="field.describedBy" />
      </FormField>

      <button type="submit" class="btn btn-primary btn-large btn-block" :disabled="submitting">
        {{ submitting ? 'Logging in…' : 'Log in' }}
      </button>

      <p v-if="isAdminPortal" class="form-footer">
        Not a staff member?
        <RouterLink :to="{ name: 'login' }">Customer login</RouterLink>
      </p>
      <p v-else class="form-footer">
        New to SkyBridge?
        <RouterLink :to="{ name: 'register', query: route.query }">Create an account</RouterLink>
      </p>
    </form>
  </div>
</template>
