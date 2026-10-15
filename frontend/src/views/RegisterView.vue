<script setup>
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { safeRedirect } from '../router';
import { movingToSubmit, passwordChecks, rules } from '../validation';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import FormField from '../components/FormField.vue';

const auth = useAuthStore();
const toast = useToastStore();
const route = useRoute();
const router = useRouter();

const form = reactive({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
const errors = reactive({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
const formError = ref('');
const submitting = ref(false);

const checks = computed(() => passwordChecks(form.password));

const validators = {
  fullName: () => rules.fullName(form.fullName),
  email: () => rules.email(form.email),
  phone: () => rules.optionalPhone(form.phone),
  password: () => rules.newPassword(form.password),
  confirmPassword: () => {
    if (!form.confirmPassword) return 'Enter your password again.';
    return form.confirmPassword === form.password ? '' : 'The two passwords do not match.';
  },
};

function check(field, event) {
  if (movingToSubmit(event)) return;
  errors[field] = validators[field]();
}

function validateAll() {
  Object.keys(validators).forEach((field) => check(field));
  return Object.values(errors).every((message) => !message);
}

async function submit() {
  formError.value = '';
  if (!validateAll()) {
    formError.value = 'Please correct the highlighted fields.';
    return;
  }
  submitting.value = true;
  try {
    await auth.register({ ...form });
    toast.show(`Welcome, ${auth.user.fullName}. Your account has been created.`);
    router.push(safeRedirect(route.query.redirect));
  } catch (err) {
    formError.value = err.message;
    Object.assign(errors, err.fields);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <form class="card form-card" novalidate data-testid="register-form" @submit.prevent="submit">
      <h1>Create an account</h1>
      <p class="muted">Register to place orders and follow their progress.</p>

      <p v-if="formError" class="alert alert-error" role="alert" data-testid="form-error">{{ formError }}</p>

      <FormField id="fullName" v-slot="field" label="Full name" :error="errors.fullName">
        <input :id="field.id" v-model="form.fullName" type="text" maxlength="100" autocomplete="name" :aria-invalid="field.invalid" :aria-describedby="field.describedBy" @blur="check('fullName', $event)" />
      </FormField>

      <FormField id="email" v-slot="field" label="Email address" :error="errors.email">
        <input :id="field.id" v-model="form.email" type="email" maxlength="254" autocomplete="email" :aria-invalid="field.invalid" :aria-describedby="field.describedBy" @blur="check('email', $event)" />
      </FormField>

      <FormField id="phone" v-slot="field" label="Phone" optional :error="errors.phone" hint="For example +64 21 555 0142.">
        <input :id="field.id" v-model="form.phone" type="tel" maxlength="20" autocomplete="tel" :aria-invalid="field.invalid" :aria-describedby="field.describedBy" @blur="check('phone', $event)" />
      </FormField>

      <FormField id="password" v-slot="field" label="Password" :error="errors.password">
        <input :id="field.id" v-model="form.password" type="password" maxlength="72" autocomplete="new-password" :aria-invalid="field.invalid" :aria-describedby="field.describedBy" @blur="check('password', $event)" />
      </FormField>
      <ul class="password-checks" aria-label="Password rules">
        <li v-for="item in checks" :key="item.label" :class="{ ok: item.ok }">{{ item.ok ? '✓' : '○' }} {{ item.label }}</li>
      </ul>

      <FormField id="confirmPassword" v-slot="field" label="Confirm password" :error="errors.confirmPassword">
        <input :id="field.id" v-model="form.confirmPassword" type="password" maxlength="72" autocomplete="new-password" :aria-invalid="field.invalid" :aria-describedby="field.describedBy" @blur="check('confirmPassword', $event)" />
      </FormField>

      <button type="submit" class="btn btn-primary btn-large btn-block" :disabled="submitting">
        {{ submitting ? 'Creating account…' : 'Create account' }}
      </button>

      <p class="form-footer">
        Already registered?
        <RouterLink :to="{ name: 'login', query: route.query }">Log in</RouterLink>
      </p>
    </form>
  </div>
</template>
