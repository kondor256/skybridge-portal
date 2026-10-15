<script setup>
// Label + control + hint + error message. The control goes in the default slot
// and receives the ids it needs for the label and for screen readers.
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  optional: { type: Boolean, default: false },
});
</script>

<template>
  <div class="field" :class="{ 'field-invalid': error }">
    <label :for="id">
      {{ label }}
      <span v-if="optional" class="optional">(optional)</span>
    </label>
    <slot :id="id" :described-by="error ? `${id}-error` : hint ? `${id}-hint` : undefined" :invalid="error ? 'true' : undefined" />
    <p v-if="error" :id="`${id}-error`" class="field-error" role="alert">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="field-hint">{{ hint }}</p>
  </div>
</template>
