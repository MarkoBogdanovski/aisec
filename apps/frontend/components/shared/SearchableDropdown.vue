<template>
  <div ref="rootRef" class="relative" :class="open ? 'z-[320]' : 'z-10'">
    <button
      type="button"
      class="group flex w-full items-center gap-3 rounded-[18px] border border-white/20 bg-white/[0.04] px-4 py-3 text-left shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition duration-200"
      :class="open ? 'border-emerald-400/60 bg-white/[0.06]' : 'hover:border-emerald-400/40 hover:bg-white/[0.05]'"
      @click="toggleOpen"
      @keydown.down.prevent="openAndFocusFirst"
      @keydown.enter.prevent="toggleOpen"
    >
      <div class="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-200">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 7h18M6 12h12M10 17h4" />
        </svg>
      </div>

      <div class="min-w-0 flex-1">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/85">{{ label }}</p>
        <p class="mt-1 truncate text-sm" :class="selectedOption ? 'text-neutral-100' : 'text-neutral-500'">
          {{ selectedOption?.label || placeholder }}
        </p>
      </div>

      <div v-if="selectedOption?.description" class="hidden rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] text-neutral-300 sm:block">
        {{ selectedOption.description }}
      </div>

      <svg class="h-4 w-4 shrink-0 text-neutral-400 transition" :class="open ? 'rotate-180 text-emerald-200' : 'group-hover:text-neutral-200'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute left-0 top-[calc(100%+0.5rem)] z-[320] w-full overflow-hidden rounded-[22px] border border-white/20 bg-[#06070c] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl"
    >
      <div class="mb-2 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-2">
        <svg class="h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
        </svg>
        <input
          ref="searchInputRef"
          v-model="query"
          type="text"
          :placeholder="searchable ? searchPlaceholder : 'Selection list'"
          :readonly="!searchable"
          class="w-full bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 outline-none"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="selectActive"
          @keydown.esc.prevent="close"
        />
      </div>

      <div class="custom-dropdown-scroll max-h-60 overflow-y-auto pr-1">
        <button
          v-for="(option, index) in filteredOptions"
          :key="option.value"
          type="button"
          class="mb-1 flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition"
          :class="index === activeIndex ? 'bg-emerald-500/18 text-emerald-100' : 'text-neutral-200 hover:bg-emerald-500/12 hover:text-emerald-50'"
          @mouseenter="activeIndex = index"
          @click="selectOption(option.value)"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{{ option.label }}</p>
            <p v-if="option.description" class="truncate text-xs text-neutral-400">{{ option.description }}</p>
          </div>
          <span v-if="modelValue === option.value" class="ml-3 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-2 py-0.5 text-[11px] text-emerald-200">
            Selected
          </span>
        </button>

        <p v-if="filteredOptions.length === 0" class="px-3 py-3 text-sm text-neutral-500">No matches found.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

const props = withDefaults(defineProps<{
  modelValue: string;
  options: DropdownOption[];
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
}>(), {
  label: 'Selection',
  placeholder: 'Select an option',
  searchPlaceholder: 'Search options...',
  searchable: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const rootRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const open = ref(false);
const query = ref('');
const activeIndex = ref(0);

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue));

const filteredOptions = computed(() => {
  if (!props.searchable) return props.options;
  const normalized = query.value.trim().toLowerCase();
  if (!normalized) return props.options;
  return props.options.filter((option) =>
    `${option.label} ${option.description || ''} ${option.value}`.toLowerCase().includes(normalized),
  );
});

watch(filteredOptions, (options) => {
  if (activeIndex.value > options.length - 1) {
    activeIndex.value = Math.max(0, options.length - 1);
  }
});

const focusSearch = async () => {
  await nextTick();
  searchInputRef.value?.focus();
  searchInputRef.value?.select();
};

const close = () => {
  open.value = false;
  query.value = '';
  activeIndex.value = 0;
};

const toggleOpen = async () => {
  open.value = !open.value;
  if (open.value) {
    await focusSearch();
  } else {
    close();
  }
};

const openAndFocusFirst = async () => {
  if (!open.value) {
    open.value = true;
    activeIndex.value = 0;
    await focusSearch();
  } else {
    move(1);
  }
};

const move = (direction: number) => {
  if (filteredOptions.value.length === 0) return;
  activeIndex.value = (activeIndex.value + direction + filteredOptions.value.length) % filteredOptions.value.length;
};

const selectOption = (value: string) => {
  emit('update:modelValue', value);
  close();
};

const selectActive = () => {
  const option = filteredOptions.value[activeIndex.value];
  if (option) {
    selectOption(option.value);
  }
};

const handleClickOutside = (event: MouseEvent) => {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    close();
  }
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<style scoped>
.custom-dropdown-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(16, 185, 129, 0.7) rgba(255, 255, 255, 0.06);
}

.custom-dropdown-scroll::-webkit-scrollbar {
  width: 10px;
}

.custom-dropdown-scroll::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
}

.custom-dropdown-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.9), rgba(34, 197, 94, 0.72));
  border-radius: 999px;
  border: 2px solid rgba(6, 12, 10, 0.7);
}

.custom-dropdown-scroll::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(52, 211, 153, 0.95), rgba(74, 222, 128, 0.8));
}
</style>
