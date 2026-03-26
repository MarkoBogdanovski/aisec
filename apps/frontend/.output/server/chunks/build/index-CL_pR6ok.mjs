import { u as useState, _ as __nuxt_component_0, a as __nuxt_component_0$1 } from './server.mjs';
import { defineComponent, ref, mergeProps, unref, withCtx, createVNode, openBlock, createBlock, toDisplayString, computed, watch, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderComponent, ssrRenderList, ssrRenderClass, ssrRenderAttr, ssrIncludeBooleanAttr, ssrRenderStyle } from 'vue/server-renderer';
import { _ as _export_sfc } from './_plugin-vue_export-helper-1tPrXgE0.mjs';
import { u as useApi } from './useApi-DDBd4HqR.mjs';
import { ForceLayout } from 'v-network-graph/lib/force-layout';
import { defineConfigs } from 'v-network-graph';
import '../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'unhead/plugins';
import 'vue-router';

const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  __name: "SearchableDropdown",
  __ssrInlineRender: true,
  props: {
    modelValue: {},
    options: {},
    label: { default: "Selection" },
    placeholder: { default: "Select an option" },
    searchPlaceholder: { default: "Search options..." },
    searchable: { type: Boolean, default: true }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const rootRef = ref(null);
    ref(null);
    const open = ref(false);
    const query = ref("");
    const activeIndex = ref(0);
    const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue));
    const filteredOptions = computed(() => {
      if (!props.searchable) return props.options;
      const normalized = query.value.trim().toLowerCase();
      if (!normalized) return props.options;
      return props.options.filter(
        (option) => `${option.label} ${option.description || ""} ${option.value}`.toLowerCase().includes(normalized)
      );
    });
    watch(filteredOptions, (options) => {
      if (activeIndex.value > options.length - 1) {
        activeIndex.value = Math.max(0, options.length - 1);
      }
    });
    return (_ctx, _push, _parent, _attrs) => {
      var _a, _b;
      _push(`<div${ssrRenderAttrs(mergeProps({
        ref_key: "rootRef",
        ref: rootRef,
        class: ["relative", open.value ? "z-[320]" : "z-10"]
      }, _attrs))} data-v-98d75a68><button type="button" class="${ssrRenderClass([open.value ? "border-emerald-400/60 bg-white/[0.06]" : "hover:border-emerald-400/40 hover:bg-white/[0.05]", "group flex w-full items-center gap-3 rounded-[18px] border border-white/20 bg-white/[0.04] px-4 py-3 text-left shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition duration-200"])}" data-v-98d75a68><div class="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-200" data-v-98d75a68><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-v-98d75a68><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 7h18M6 12h12M10 17h4" data-v-98d75a68></path></svg></div><div class="min-w-0 flex-1" data-v-98d75a68><p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/85" data-v-98d75a68>${ssrInterpolate(__props.label)}</p><p class="${ssrRenderClass([selectedOption.value ? "text-neutral-100" : "text-neutral-500", "mt-1 truncate text-sm"])}" data-v-98d75a68>${ssrInterpolate(((_a = selectedOption.value) == null ? void 0 : _a.label) || __props.placeholder)}</p></div>`);
      if ((_b = selectedOption.value) == null ? void 0 : _b.description) {
        _push(`<div class="hidden rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] text-neutral-300 sm:block" data-v-98d75a68>${ssrInterpolate(selectedOption.value.description)}</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<svg class="${ssrRenderClass([open.value ? "rotate-180 text-emerald-200" : "group-hover:text-neutral-200", "h-4 w-4 shrink-0 text-neutral-400 transition"])}" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-v-98d75a68><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="m6 9 6 6 6-6" data-v-98d75a68></path></svg></button>`);
      if (open.value) {
        _push(`<div class="absolute left-0 top-[calc(100%+0.5rem)] z-[320] w-full overflow-hidden rounded-[22px] border border-white/20 bg-[#06070c] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl" data-v-98d75a68><div class="mb-2 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-2" data-v-98d75a68><svg class="h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-v-98d75a68><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" data-v-98d75a68></path></svg><input${ssrRenderAttr("value", query.value)} type="text"${ssrRenderAttr("placeholder", __props.searchable ? __props.searchPlaceholder : "Selection list")}${ssrIncludeBooleanAttr(!__props.searchable) ? " readonly" : ""} class="w-full bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 outline-none" data-v-98d75a68></div><div class="custom-dropdown-scroll max-h-60 overflow-y-auto pr-1" data-v-98d75a68><!--[-->`);
        ssrRenderList(filteredOptions.value, (option, index2) => {
          _push(`<button type="button" class="${ssrRenderClass([index2 === activeIndex.value ? "bg-emerald-500/18 text-emerald-100" : "text-neutral-200 hover:bg-emerald-500/12 hover:text-emerald-50", "mb-1 flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition"])}" data-v-98d75a68><div class="min-w-0" data-v-98d75a68><p class="truncate text-sm font-medium" data-v-98d75a68>${ssrInterpolate(option.label)}</p>`);
          if (option.description) {
            _push(`<p class="truncate text-xs text-neutral-400" data-v-98d75a68>${ssrInterpolate(option.description)}</p>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div>`);
          if (__props.modelValue === option.value) {
            _push(`<span class="ml-3 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-2 py-0.5 text-[11px] text-emerald-200" data-v-98d75a68> Selected </span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</button>`);
        });
        _push(`<!--]-->`);
        if (filteredOptions.value.length === 0) {
          _push(`<p class="px-3 py-3 text-sm text-neutral-500" data-v-98d75a68>No matches found.</p>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup$5 = _sfc_main$5.setup;
_sfc_main$5.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/shared/SearchableDropdown.vue");
  return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
const SearchableDropdown = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["__scopeId", "data-v-98d75a68"]]);
const connected = ref(false);
const lastMessage = ref(null);
const handlers = /* @__PURE__ */ new Map();
const subscriptionCounts = /* @__PURE__ */ new Map();
let socket = null;
const send = (payload) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }
  socket.send(JSON.stringify(payload));
};
const connect = () => {
  {
    return;
  }
};
const disconnect = () => {
  socket == null ? void 0 : socket.close();
  socket = null;
  connected.value = false;
};
const subscribeToJob = (jobId, handler) => {
  var _a;
  if (!handlers.has(jobId)) {
    handlers.set(jobId, /* @__PURE__ */ new Set());
  }
  handlers.get(jobId).add(handler);
  subscriptionCounts.set(jobId, ((_a = subscriptionCounts.get(jobId)) != null ? _a : 0) + 1);
  send({ action: "subscribe", jobId });
  return () => {
    var _a2;
    const listeners = handlers.get(jobId);
    listeners == null ? void 0 : listeners.delete(handler);
    if (listeners && listeners.size === 0) {
      handlers.delete(jobId);
    }
    const nextCount = ((_a2 = subscriptionCounts.get(jobId)) != null ? _a2 : 1) - 1;
    if (nextCount <= 0) {
      subscriptionCounts.delete(jobId);
      send({ action: "unsubscribe", jobId });
    } else {
      subscriptionCounts.set(jobId, nextCount);
    }
    if (subscriptionCounts.size === 0) {
      disconnect();
    }
  };
};
const useWebSocket = () => ({
  connected,
  lastMessage,
  connect,
  disconnect,
  subscribeToJob
});
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "QuickContractLookup",
  __ssrInlineRender: true,
  emits: ["completed"],
  setup(__props, { emit: __emit }) {
    useApi();
    const { connected: socketConnected } = useWebSocket();
    const loading = ref(false);
    const jobId = ref(null);
    const jobStatus = ref("idle");
    const error = ref("");
    const form = ref({
      chain_id: "1",
      contract_address: "",
      priority: "normal"
    });
    const chainOptions = [
      { value: "1", label: "Ethereum Mainnet", description: "Chain ID 1" },
      { value: "137", label: "Polygon", description: "Chain ID 137" },
      { value: "56", label: "BNB Smart Chain", description: "Chain ID 56" },
      { value: "42161", label: "Arbitrum", description: "Chain ID 42161" },
      { value: "10", label: "Optimism", description: "Chain ID 10" },
      { value: "43114", label: "Avalanche", description: "Chain ID 43114" },
      { value: "8453", label: "Base", description: "Chain ID 8453" }
    ];
    const priorityOptions = [
      { value: "low", label: "Low", description: "Standard processing" },
      { value: "normal", label: "Normal", description: "Balanced speed and cost" },
      { value: "high", label: "High", description: "Fastest processing" }
    ];
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-5 rounded-[22px] border border-white/20 bg-white/[0.035] p-5 text-left backdrop-blur-xl" }, _attrs))}><div class="space-y-3"><h3 class="flex items-center gap-2 text-lg font-semibold text-neutral-100"><span class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/12 text-emerald-200"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"></path></svg></span> Contract Analysis </h3><p class="text-sm text-neutral-400">Scan a contract and map the connected risk entities below.</p></div><form class="space-y-4"><div>`);
      _push(ssrRenderComponent(SearchableDropdown, {
        modelValue: form.value.chain_id,
        "onUpdate:modelValue": ($event) => form.value.chain_id = $event,
        label: "Network",
        options: chainOptions,
        placeholder: "Select a network",
        "search-placeholder": "Search networks..."
      }, null, _parent));
      _push(`</div><div><label for="address" class="mb-2 block text-xs uppercase tracking-wide text-neutral-400">Contract Address</label><input id="address"${ssrRenderAttr("value", form.value.contract_address)} type="text" placeholder="0x..." required class="w-full rounded-[18px] border border-white/20 bg-white/[0.04] px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition focus:border-emerald-400/55 focus:bg-white/[0.05] focus:ring-1 focus:ring-emerald-400/30"></div><div>`);
      _push(ssrRenderComponent(SearchableDropdown, {
        modelValue: form.value.priority,
        "onUpdate:modelValue": ($event) => form.value.priority = $event,
        label: "Priority",
        options: priorityOptions,
        placeholder: "Select priority",
        searchable: false
      }, null, _parent));
      _push(`</div><button type="submit"${ssrIncludeBooleanAttr(loading.value) ? " disabled" : ""} class="w-full rounded-[18px] border border-emerald-300/35 bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">${ssrInterpolate(loading.value ? "Analyzing..." : "Analyze Contract")}</button></form>`);
      if (jobId.value) {
        _push(`<div class="rounded-xl border border-emerald-400/30 bg-white/[0.03] p-3 backdrop-blur-xl"><p class="mb-1 text-xs text-neutral-300">Job ID: ${ssrInterpolate(jobId.value)}</p><p class="text-xs text-emerald-300">Status: ${ssrInterpolate(jobStatus.value)}</p>`);
        if (unref(socketConnected)) {
          _push(`<p class="mt-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">Live updates connected</p>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      if (error.value) {
        _push(`<div class="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">${ssrInterpolate(error.value)}</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup$4 = _sfc_main$4.setup;
_sfc_main$4.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/home/QuickContractLookup.vue");
  return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "QuickWalletLookup",
  __ssrInlineRender: true,
  emits: ["completed"],
  setup(__props, { emit: __emit }) {
    useApi();
    const loading = ref(false);
    const error = ref("");
    const notImplemented = ref(false);
    const form = ref({
      chain_id: "1",
      wallet_address: "",
      priority: "normal"
    });
    const chainOptions = [
      { value: "1", label: "Ethereum Mainnet", description: "Chain ID 1" },
      { value: "137", label: "Polygon", description: "Chain ID 137" },
      { value: "56", label: "BNB Smart Chain", description: "Chain ID 56" },
      { value: "42161", label: "Arbitrum", description: "Chain ID 42161" },
      { value: "10", label: "Optimism", description: "Chain ID 10" },
      { value: "43114", label: "Avalanche", description: "Chain ID 43114" },
      { value: "8453", label: "Base", description: "Chain ID 8453" }
    ];
    const priorityOptions = [
      { value: "low", label: "Low", description: "Standard processing" },
      { value: "normal", label: "Normal", description: "Balanced speed and cost" },
      { value: "high", label: "High", description: "Fastest processing" }
    ];
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-5 rounded-[22px] border border-white/20 bg-white/[0.035] p-5 text-left backdrop-blur-xl" }, _attrs))}><div class="space-y-3"><h3 class="flex items-center gap-2 text-lg font-semibold text-neutral-100"><span class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/12 text-emerald-200"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3Z"></path></svg></span> Wallet Intelligence </h3><p class="text-sm text-neutral-400">Trace wallet exposure and connected counterparties from the landing workspace.</p></div><form class="space-y-4"><div>`);
      _push(ssrRenderComponent(SearchableDropdown, {
        modelValue: form.value.chain_id,
        "onUpdate:modelValue": ($event) => form.value.chain_id = $event,
        label: "Network",
        options: chainOptions,
        placeholder: "Select a network",
        "search-placeholder": "Search networks..."
      }, null, _parent));
      _push(`</div><div><label for="walletAddress" class="mb-2 block text-xs uppercase tracking-wide text-neutral-400">Wallet Address</label><input id="walletAddress"${ssrRenderAttr("value", form.value.wallet_address)} type="text" placeholder="0x..." required class="w-full rounded-[18px] border border-white/20 bg-white/[0.04] px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition focus:border-emerald-400/55 focus:bg-white/[0.05] focus:ring-1 focus:ring-emerald-400/30"></div><div>`);
      _push(ssrRenderComponent(SearchableDropdown, {
        modelValue: form.value.priority,
        "onUpdate:modelValue": ($event) => form.value.priority = $event,
        label: "Priority",
        options: priorityOptions,
        placeholder: "Select priority",
        searchable: false
      }, null, _parent));
      _push(`</div><button type="submit"${ssrIncludeBooleanAttr(loading.value) ? " disabled" : ""} class="w-full rounded-[18px] border border-emerald-300/35 bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">${ssrInterpolate(loading.value ? "Analyzing..." : "Analyze Wallet")}</button></form>`);
      if (notImplemented.value) {
        _push(`<div class="rounded-xl border border-emerald-400/30 bg-white/[0.03] p-3 backdrop-blur-xl"><p class="text-xs font-medium text-neutral-200">Coming Soon</p><p class="mt-1 text-xs text-neutral-400">Wallet intelligence is using the frontend relation model until the backend path is ready.</p></div>`);
      } else {
        _push(`<!---->`);
      }
      if (error.value) {
        _push(`<div class="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">${ssrInterpolate(error.value)}</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/home/QuickWalletLookup.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "EntityRelationsGraph",
  __ssrInlineRender: true,
  props: {
    entities: {},
    relations: {}
  },
  setup(__props) {
    const props = __props;
    const nodeColor = (type) => {
      switch (type) {
        case "wallet":
          return "#22c55e";
        case "contract":
          return "#10b981";
        case "flagged-service":
          return "#ef4444";
        case "funding-source":
          return "#06b6d4";
        case "counterparty":
          return "#f59e0b";
        default:
          return "#64748b";
      }
    };
    const darkenHex = (hex, factor = 0.45) => {
      const sanitized = hex.replace("#", "");
      const value = parseInt(sanitized, 16);
      const red = Math.max(0, Math.floor((value >> 16 & 255) * factor));
      const green = Math.max(0, Math.floor((value >> 8 & 255) * factor));
      const blue = Math.max(0, Math.floor((value & 255) * factor));
      return `rgb(${red}, ${green}, ${blue})`;
    };
    const formatTypeLabel = (type) => type.replace(/-/g, " ");
    ref();
    ref(null);
    ref({ nodes: {} });
    const selectedNodes = ref([]);
    const selectedEntityId = ref(null);
    const focusedType = ref(null);
    const tooltipPosition = ref(null);
    const entitiesById = computed(
      () => Object.fromEntries(props.entities.map((entity) => [entity.id, entity]))
    );
    computed(() => {
      var _a;
      if (!selectedEntityId.value) return null;
      return (_a = entitiesById.value[selectedEntityId.value]) != null ? _a : null;
    });
    const legendItems = computed(() => {
      const counts = props.entities.reduce((acc, entity) => {
        var _a;
        acc[entity.type] = ((_a = acc[entity.type]) != null ? _a : 0) + 1;
        return acc;
      }, {});
      return Object.keys(counts).map((type) => {
        var _a;
        return {
          type,
          label: formatTypeLabel(type),
          count: (_a = counts[type]) != null ? _a : 0,
          color: nodeColor(type)
        };
      });
    });
    computed(() => {
      if (!tooltipPosition.value) {
        return { top: "1rem", left: "1rem" };
      }
      return {
        left: `${tooltipPosition.value.x}px`,
        top: `${tooltipPosition.value.y}px`
      };
    });
    const resolveNodeVisuals = (entity) => {
      const active = !focusedType.value || entity.type === focusedType.value;
      const baseColor = nodeColor(entity.type);
      return {
        color: active ? baseColor : darkenHex(baseColor, 0.32),
        strokeColor: active ? "#ecfccb" : "rgba(82, 82, 91, 0.7)",
        labelColor: active ? "#f8fafc" : "#6b7280"
      };
    };
    computed(
      () => Object.fromEntries(
        props.entities.map((entity) => [
          entity.id,
          (() => {
            const visuals = resolveNodeVisuals(entity);
            return {
              name: entity.label,
              type: entity.type,
              riskScore: entity.riskScore,
              color: visuals.color,
              labelColor: visuals.labelColor,
              strokeColor: visuals.strokeColor
            };
          })()
        ])
      )
    );
    const edgeColor = (strength) => {
      if (strength >= 0.85) return "#22c55e";
      if (strength >= 0.7) return "#34d399";
      if (strength >= 0.55) return "#f59e0b";
      return "#64748b";
    };
    computed(
      () => Object.fromEntries(
        props.relations.map((relation) => [
          relation.id,
          {
            source: relation.source,
            target: relation.target,
            label: relation.label,
            strength: relation.strength,
            color: edgeColor(relation.strength)
          }
        ])
      )
    );
    defineConfigs({
      view: {
        autoPanAndZoomOnLoad: "fit-content",
        fitContentMargin: 24,
        layoutHandler: new ForceLayout({
          positionFixedByDrag: false,
          positionFixedByClickWithAltKey: false
        }),
        minZoomLevel: 0.25,
        maxZoomLevel: 4
      },
      node: {
        selectable: true,
        draggable: true,
        normal: {
          type: "circle",
          radius: (node) => 18 + Math.round(node.riskScore / 100 * 18),
          color: (node) => node.color,
          strokeColor: (node) => node.strokeColor,
          strokeWidth: 2
        },
        hover: {
          type: "circle",
          radius: (node) => 20 + Math.round(node.riskScore / 100 * 18),
          color: (node) => node.color,
          strokeColor: "#f8fafc",
          strokeWidth: 3
        },
        selected: {
          type: "circle",
          radius: (node) => 22 + Math.round(node.riskScore / 100 * 18),
          color: (node) => node.color,
          strokeColor: "#ffffff",
          strokeWidth: 4
        },
        label: {
          visible: true,
          text: (node) => node.name,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: 11,
          color: (node) => node.labelColor,
          background: {
            visible: true,
            color: "rgba(9, 11, 18, 0.82)",
            borderRadius: 8,
            padding: { vertical: 3, horizontal: 6 }
          },
          lineHeight: 1.3,
          direction: "south",
          directionAutoAdjustment: true,
          margin: 6,
          handleNodeEvents: true
        },
        focusring: {
          visible: true,
          width: 3,
          padding: 4,
          color: "rgba(255,255,255,0.65)"
        }
      },
      edge: {
        selectable: false,
        gap: 16,
        type: "curve",
        normal: {
          width: (edge) => 1.5 + edge.strength * 3.5,
          color: (edge) => edge.color,
          dasharray: (edge) => edge.strength < 0.6 ? "6 5" : void 0,
          animate: true,
          animationSpeed: 20
        },
        hover: {
          width: (edge) => 2.5 + edge.strength * 3.5,
          color: (edge) => edge.color,
          animate: true,
          animationSpeed: 28
        },
        selected: {
          width: (edge) => 2.5 + edge.strength * 3.5,
          color: (edge) => edge.color,
          animate: true,
          animationSpeed: 28
        },
        marker: {
          source: {
            type: "none",
            width: 0,
            height: 0,
            margin: -1,
            offset: 0,
            units: "strokeWidth",
            color: null
          },
          target: {
            type: "arrow",
            width: 5,
            height: 5,
            margin: 4,
            offset: 0,
            units: "strokeWidth",
            color: (edge) => edge.color
          }
        },
        label: {
          visible: true,
          text: (edge) => edge.label,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: 9,
          color: "#cbd5e1",
          background: {
            visible: true,
            color: "rgba(15, 23, 42, 0.84)",
            borderRadius: 6,
            padding: { vertical: 2, horizontal: 4 }
          },
          lineHeight: 1.2,
          margin: 4,
          padding: 4
        }
      }
    });
    const clearFocus = () => {
      selectedNodes.value = [];
      selectedEntityId.value = null;
      focusedType.value = null;
      tooltipPosition.value = null;
    };
    watch(
      () => props.entities,
      (entities) => {
        const selected = selectedEntityId.value ? entities.find((entity) => entity.id === selectedEntityId.value) : null;
        if (!selected && selectedEntityId.value) {
          clearFocus();
        }
      },
      { immediate: true, deep: true }
    );
    return (_ctx, _push, _parent, _attrs) => {
      const _component_ClientOnly = __nuxt_component_0$1;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "glass-panel-soft p-5 md:p-6" }, _attrs))}><div class="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p class="eyebrow-label">Interactive Network Graph</p><h3 class="mt-2 text-lg font-semibold tracking-tight text-neutral-100">Entity Relations</h3></div><div class="flex items-center gap-2"><button type="button" class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-[#06070c]/92 text-neutral-200 transition hover:border-emerald-400/45 hover:text-white"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 12h14"></path></svg></button><button type="button" class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-[#06070c]/92 text-neutral-200 transition hover:border-emerald-400/45 hover:text-white"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 5v14M5 12h14"></path></svg></button></div></div><div class="mb-4 flex flex-wrap items-center gap-2"><button type="button" class="${ssrRenderClass([!focusedType.value ? "border-emerald-400/45 bg-emerald-500/10 text-emerald-200" : "border-white/20 bg-[#06070c]/92 text-neutral-400", "rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition"])}"> All Types </button><!--[-->`);
      ssrRenderList(legendItems.value, (item) => {
        _push(`<button type="button" class="${ssrRenderClass([focusedType.value === item.type || !focusedType.value && item.count > 0 ? "border-white/20 bg-[#06070c]/92 text-neutral-200" : "border-white/10 bg-[#06070c]/92 text-neutral-500", "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition"])}"><span class="h-2.5 w-2.5 rounded-full" style="${ssrRenderStyle({ backgroundColor: item.color })}"></span><span>${ssrInterpolate(item.label)}</span><span class="text-neutral-500">${ssrInterpolate(item.count)}</span></button>`);
      });
      _push(`<!--]--></div>`);
      _push(ssrRenderComponent(_component_ClientOnly, null, {
        fallback: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="flex h-[420px] w-full items-center justify-center rounded-[22px] border border-white/20 bg-[#06070c]/92 text-sm text-neutral-500 backdrop-blur-xl"${_scopeId}> Loading graph... </div>`);
          } else {
            return [
              createVNode("div", { class: "flex h-[420px] w-full items-center justify-center rounded-[22px] border border-white/20 bg-[#06070c]/92 text-sm text-neutral-500 backdrop-blur-xl" }, " Loading graph... ")
            ];
          }
        })
      }, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/shared/EntityRelationsGraph.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "InvestigationWorkspace",
  __ssrInlineRender: true,
  props: {
    result: {}
  },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      if (__props.result) {
        _push(`<section${ssrRenderAttrs(mergeProps({ class: "mt-12 w-full max-w-6xl" }, _attrs))}><div class="glass-panel relative overflow-hidden p-6 md:p-7"><div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_28%)]"></div><div class="relative mb-6 flex flex-wrap items-start justify-between gap-5"><div class="max-w-2xl"><p class="eyebrow-label">Investigation Workspace</p><h2 class="mt-3 text-2xl font-semibold tracking-tight text-neutral-100 md:text-[2rem]">${ssrInterpolate(__props.result.subject)}</h2><p class="mt-3 text-sm leading-6 text-neutral-300/90">${ssrInterpolate(__props.result.summary)}</p></div><div class="grid min-w-[240px] gap-3 sm:grid-cols-2"><div class="glass-stat"><p class="panel-kicker">Severity</p><p class="mt-2 text-sm font-medium tracking-wide text-neutral-100">${ssrInterpolate(__props.result.severity)}</p></div><div class="glass-stat"><p class="panel-kicker">Risk Score</p><p class="mt-2 text-sm font-medium tracking-wide text-neutral-100">${ssrInterpolate(__props.result.score)}/100</p></div></div></div><div class="relative">`);
        _push(ssrRenderComponent(_sfc_main$2, {
          entities: __props.result.entities,
          relations: __props.result.relations
        }, null, _parent));
        _push(`</div><div class="glass-panel-soft relative mt-5 p-5 md:p-6"><div class="mb-4 flex items-center justify-between gap-3"><div><p class="panel-kicker">Fraud Signals</p><h3 class="mt-2 text-lg font-semibold tracking-tight text-neutral-100">Key indicators</h3></div><span class="rounded-full border border-white/20 bg-[#06070c]/92 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400 backdrop-blur-xl">${ssrInterpolate(__props.result.findings.length)} indicators </span></div><ul class="grid gap-3 md:grid-cols-2"><!--[-->`);
        ssrRenderList(__props.result.findings, (finding, index2) => {
          _push(`<li class="glass-stat min-h-[132px] text-sm text-neutral-300/90 transition-colors hover:border-white/20"><p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500"> Signal ${ssrInterpolate(index2 + 1)}</p><p class="mt-3 font-medium text-neutral-100">${ssrInterpolate(finding.category || finding.severity || "Signal")}</p><p class="mt-2 leading-6">${ssrInterpolate(finding.description || JSON.stringify(finding))}</p></li>`);
        });
        _push(`<!--]--></ul></div></div></section>`);
      } else {
        _push(`<!---->`);
      }
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/shared/InvestigationWorkspace.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const analysisMode = useState("analysis-mode", () => "contract");
    const investigation = ref(null);
    const highlightLinks = [
      {
        title: "Spring Cleaning Update is live!",
        subtitle: "See what's new",
        to: "/market",
        iconTone: "text-amber-300",
        iconPath: "M12 3v3m0 12v3m6.36-15.36-2.12 2.12M7.76 16.24l-2.12 2.12M21 12h-3M6 12H3m15.36 6.36-2.12-2.12M7.76 7.76 5.64 5.64M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"
      },
      {
        title: "Enhance your investigations with Palette",
        subtitle: "Pivot across contracts, wallets, and incidents",
        to: "/",
        iconTone: "text-emerald-300",
        iconPath: "M12 21a9 9 0 1 1 9-9 2 2 0 0 1-2 2h-1a2 2 0 1 0 0 4h.5A2.5 2.5 0 0 1 21 20.5 8.5 8.5 0 0 1 12 21Zm-4.5-9a1 1 0 1 0 0-.01V12Zm4-4a1 1 0 1 0 0-.01V8Zm4 4a1 1 0 1 0 0-.01V12Zm-4 4a1 1 0 1 0 0-.01V16Z"
      }
    ];
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<section${ssrRenderAttrs(mergeProps({ class: "relative flex min-h-[calc(100vh-120px)] items-center justify-center overflow-hidden px-4 py-16 sm:px-6 lg:px-8" }, _attrs))} data-v-d3299358><div class="absolute inset-x-[12%] top-24 h-64 rounded-full bg-emerald-500/20 blur-[140px]" data-v-d3299358></div><div class="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center text-center" data-v-d3299358><p class="animate-rise text-sm font-semibold tracking-[0.12em] text-neutral-300 md:text-base" data-v-d3299358> OSINT Platform Search </p><h1 class="animate-rise-delay mt-8 max-w-5xl bg-gradient-to-r from-emerald-200 via-green-300 to-emerald-500 bg-clip-text text-5xl font-black leading-[0.92] tracking-[-0.05em] text-transparent sm:text-6xl md:text-7xl lg:text-[6.25rem]" data-v-d3299358> Reveal what&#39;s behind any data instantly </h1><p class="animate-rise-delay-2 mt-8 max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base" data-v-d3299358> Search contracts, wallets, incidents, market entities, and threat signals through a single investigation surface built for speed. </p><div class="animate-rise-delay-3 mt-8 w-full max-w-xl" data-v-d3299358><div class="rounded-[28px] border border-white/20 bg-white/[0.045] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-4" data-v-d3299358><div class="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/[0.035] px-4 py-3 backdrop-blur-xl" data-v-d3299358><div class="text-left" data-v-d3299358><p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/90" data-v-d3299358>Active Search</p><p class="mt-1 text-sm text-neutral-300" data-v-d3299358>${ssrInterpolate(unref(analysisMode) === "contract" ? "Smart contract lookup" : "Wallet intelligence lookup")}</p></div><span class="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200" data-v-d3299358>${ssrInterpolate(unref(analysisMode) === "contract" ? "Contract" : "Wallet")}</span></div>`);
      if (unref(analysisMode) === "contract") {
        _push(ssrRenderComponent(_sfc_main$4, {
          onCompleted: ($event) => investigation.value = $event
        }, null, _parent));
      } else {
        _push(ssrRenderComponent(_sfc_main$3, {
          onCompleted: ($event) => investigation.value = $event
        }, null, _parent));
      }
      _push(`</div></div>`);
      _push(ssrRenderComponent(_sfc_main$1, { result: investigation.value }, null, _parent));
      _push(`<div class="animate-rise-delay-3 mt-14 flex w-full max-w-lg flex-col gap-3" data-v-d3299358><!--[-->`);
      ssrRenderList(highlightLinks, (item) => {
        _push(ssrRenderComponent(_component_NuxtLink, {
          key: item.title,
          to: item.to,
          class: "group flex items-center justify-between rounded-[22px] border border-white/20 bg-white/[0.04] px-4 py-3 text-left shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition hover:border-emerald-400/45 hover:bg-white/[0.05] hover:backdrop-blur-xl"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<div class="flex items-center gap-4" data-v-d3299358${_scopeId}><div class="${ssrRenderClass([item.iconTone, "flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5"])}" data-v-d3299358${_scopeId}><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-v-d3299358${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"${ssrRenderAttr("d", item.iconPath)} data-v-d3299358${_scopeId}></path></svg></div><div data-v-d3299358${_scopeId}><p class="text-sm font-semibold text-neutral-100" data-v-d3299358${_scopeId}>${ssrInterpolate(item.title)}</p><p class="text-xs text-neutral-400" data-v-d3299358${_scopeId}>${ssrInterpolate(item.subtitle)}</p></div></div><svg class="h-4 w-4 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-v-d3299358${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 12h14m-5-5 5 5-5 5" data-v-d3299358${_scopeId}></path></svg>`);
            } else {
              return [
                createVNode("div", { class: "flex items-center gap-4" }, [
                  createVNode("div", {
                    class: ["flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5", item.iconTone]
                  }, [
                    (openBlock(), createBlock("svg", {
                      class: "h-5 w-5",
                      fill: "none",
                      stroke: "currentColor",
                      viewBox: "0 0 24 24"
                    }, [
                      createVNode("path", {
                        "stroke-linecap": "round",
                        "stroke-linejoin": "round",
                        "stroke-width": "1.8",
                        d: item.iconPath
                      }, null, 8, ["d"])
                    ]))
                  ], 2),
                  createVNode("div", null, [
                    createVNode("p", { class: "text-sm font-semibold text-neutral-100" }, toDisplayString(item.title), 1),
                    createVNode("p", { class: "text-xs text-neutral-400" }, toDisplayString(item.subtitle), 1)
                  ])
                ]),
                (openBlock(), createBlock("svg", {
                  class: "h-4 w-4 text-neutral-500 transition group-hover:translate-x-1 group-hover:text-emerald-200",
                  fill: "none",
                  stroke: "currentColor",
                  viewBox: "0 0 24 24"
                }, [
                  createVNode("path", {
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                    "stroke-width": "1.8",
                    d: "M5 12h14m-5-5 5 5-5 5"
                  })
                ]))
              ];
            }
          }),
          _: 2
        }, _parent));
      });
      _push(`<!--]--></div></div></section>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-d3299358"]]);

export { index as default };
//# sourceMappingURL=index-CL_pR6ok.mjs.map
