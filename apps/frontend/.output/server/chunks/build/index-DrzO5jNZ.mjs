import { defineComponent, mergeProps, unref, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrInterpolate } from 'vue/server-renderer';
import { _ as __nuxt_component_0, d as defineStore } from './server.mjs';
import { u as useApi } from './useApi-DDBd4HqR.mjs';
import { S as ScoreBadge } from './ScoreBadge-zQDtmeWm.mjs';
import { _ as _export_sfc } from './_plugin-vue_export-helper-1tPrXgE0.mjs';
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

const useIncidentsStore = defineStore("incidents", {
  state: () => ({
    items: [],
    loading: false
  }),
  actions: {
    async fetchIncidents(severity, status) {
      this.loading = true;
      try {
        const { getIncidents } = useApi();
        this.items = await getIncidents({ severity, status });
      } catch (error) {
        console.error("Failed to fetch incidents:", error);
      } finally {
        this.loading = false;
      }
    }
  }
});
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "IncidentList",
  __ssrInlineRender: true,
  setup(__props) {
    const store = useIncidentsStore();
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "incident-list card" }, _attrs))} data-v-2d63c95d><h3 data-v-2d63c95d>Incidents</h3>`);
      if (unref(store).loading) {
        _push(`<div data-v-2d63c95d>Loading...</div>`);
      } else if (unref(store).items.length) {
        _push(`<div data-v-2d63c95d><!--[-->`);
        ssrRenderList(unref(store).items, (incident) => {
          _push(`<div class="incident-item" data-v-2d63c95d><h4 data-v-2d63c95d>${ssrInterpolate(incident.title)}</h4><p data-v-2d63c95d>Severity: `);
          _push(ssrRenderComponent(ScoreBadge, {
            severity: incident.severity
          }, null, _parent));
          _push(`</p><p data-v-2d63c95d>Status: ${ssrInterpolate(incident.status)}</p><p data-v-2d63c95d>Created: ${ssrInterpolate(incident.createdAt)}</p>`);
          _push(ssrRenderComponent(_component_NuxtLink, {
            to: `/incidents/${incident.id}`
          }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(`View Details`);
              } else {
                return [
                  createTextVNode("View Details")
                ];
              }
            }),
            _: 2
          }, _parent));
          _push(`</div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<p data-v-2d63c95d>No incidents found.</p>`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/incident/IncidentList.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const IncidentList = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-2d63c95d"]]);
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "incidents-page rounded-[28px] border border-white/20 bg-white/[0.04] p-6 backdrop-blur-xl" }, _attrs))} data-v-e1fbbce8><h1 class="mb-5 text-3xl font-semibold text-[#b7f7d5]" data-v-e1fbbce8>Security Incidents</h1>`);
      _push(ssrRenderComponent(IncidentList, null, null, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/incidents/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e1fbbce8"]]);

export { index as default };
//# sourceMappingURL=index-DrzO5jNZ.mjs.map
