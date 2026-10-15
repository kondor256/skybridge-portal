<script setup>
// Quantity stepper, 1 to 99. Emits a change only for a valid whole number.
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: Number, required: true },
  label: { type: String, default: 'Quantity' },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const MIN = 1;
const MAX = 99;
const typed = ref(String(props.modelValue));

watch(
  () => props.modelValue,
  (value) => {
    typed.value = String(value);
  },
);

function commit(value) {
  const number = Math.min(MAX, Math.max(MIN, Math.round(Number(value)) || MIN));
  typed.value = String(number);
  if (number !== props.modelValue) emit('update:modelValue', number);
}
</script>

<template>
  <div class="quantity">
    <button type="button" :disabled="disabled || modelValue <= MIN" :aria-label="`Decrease ${label}`" @click="commit(modelValue - 1)">−</button>
    <input
      v-model="typed"
      type="number"
      inputmode="numeric"
      :min="MIN"
      :max="MAX"
      :disabled="disabled"
      :aria-label="label"
      @change="commit(typed)"
      @keydown.enter.prevent="commit(typed)"
    />
    <button type="button" :disabled="disabled || modelValue >= MAX" :aria-label="`Increase ${label}`" @click="commit(modelValue + 1)">+</button>
  </div>
</template>
