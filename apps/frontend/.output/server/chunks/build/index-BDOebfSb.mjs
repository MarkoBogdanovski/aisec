import { defineComponent, mergeProps, ref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrInterpolate } from 'vue/server-renderer';
import { u as useApi } from './useApi-DDBd4HqR.mjs';
import { S as ScoreBadge } from './ScoreBadge-zQDtmeWm.mjs';
import { _ as _export_sfc } from './_plugin-vue_export-helper-1tPrXgE0.mjs';
import './server.mjs';
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

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "MarketEventsList",
  __ssrInlineRender: true,
  setup(__props) {
    useApi();
    const events = ref([]);
    const loading = ref(true);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "market-events card" }, _attrs))} data-v-d6f09ca5><h3 data-v-d6f09ca5>Recent Market Events</h3>`);
      if (loading.value) {
        _push(`<div data-v-d6f09ca5>Loading...</div>`);
      } else if (events.value.length) {
        _push(`<div data-v-d6f09ca5><!--[-->`);
        ssrRenderList(events.value, (event) => {
          _push(`<div class="event-item" data-v-d6f09ca5><p data-v-d6f09ca5>Token: ${ssrInterpolate(event.tokenAddress)}</p><p data-v-d6f09ca5>Type: ${ssrInterpolate(event.eventType)}</p><p data-v-d6f09ca5>Severity: `);
          _push(ssrRenderComponent(ScoreBadge, {
            severity: event.severity
          }, null, _parent));
          _push(`</p><p data-v-d6f09ca5>Detected: ${ssrInterpolate(event.detectedAt)}</p></div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<p data-v-d6f09ca5>No events found.</p>`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/market/MarketEventsList.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const MarketEventsList = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-d6f09ca5"]]);
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "market-page rounded-[28px] border border-white/20 bg-white/[0.04] p-6 backdrop-blur-xl" }, _attrs))} data-v-e7f041c3><h1 class="mb-5 text-3xl font-semibold text-[#b7f7d5]" data-v-e7f041c3>Market Anomalies</h1>`);
      _push(ssrRenderComponent(MarketEventsList, null, null, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/market/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e7f041c3"]]);

export { index as default };
//# sourceMappingURL=index-BDOebfSb.mjs.map
