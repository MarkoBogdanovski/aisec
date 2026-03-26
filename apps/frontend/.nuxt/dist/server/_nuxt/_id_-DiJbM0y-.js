import { defineComponent, ref, mergeProps, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrInterpolate, ssrRenderComponent } from "vue/server-renderer";
import { useRoute } from "vue-router";
import { u as useApi } from "./useApi-DDBd4HqR.js";
import { S as ScoreBadge } from "./ScoreBadge-zQDtmeWm.js";
import { _ as _export_sfc } from "./_plugin-vue_export-helper-1tPrXgE0.js";
import "../server.mjs";
import "C:/Users/Marko/aisec/apps/frontend/node_modules/ofetch/dist/node.mjs";
import "#internal/nuxt/paths";
import "C:/Users/Marko/aisec/apps/frontend/node_modules/hookable/dist/index.mjs";
import "C:/Users/Marko/aisec/apps/frontend/node_modules/unctx/dist/index.mjs";
import "C:/Users/Marko/aisec/apps/frontend/node_modules/h3/dist/index.mjs";
import "C:/Users/Marko/aisec/apps/frontend/node_modules/defu/dist/defu.mjs";
import "C:/Users/Marko/aisec/apps/frontend/node_modules/ufo/dist/index.mjs";
import "C:/Users/Marko/aisec/apps/frontend/node_modules/klona/dist/index.mjs";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "[id]",
  __ssrInlineRender: true,
  setup(__props) {
    useRoute();
    useApi();
    const incident = ref(null);
    const loading = ref(true);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "incident-detail" }, _attrs))} data-v-ed149b4f><h1 data-v-ed149b4f>Incident Details</h1>`);
      if (loading.value) {
        _push(`<div data-v-ed149b4f>Loading...</div>`);
      } else if (incident.value) {
        _push(`<div data-v-ed149b4f><h2 data-v-ed149b4f>${ssrInterpolate(incident.value.title)}</h2><p data-v-ed149b4f>Severity: `);
        _push(ssrRenderComponent(ScoreBadge, {
          severity: incident.value.severity
        }, null, _parent));
        _push(`</p><p data-v-ed149b4f>Status: ${ssrInterpolate(incident.value.status)}</p><p data-v-ed149b4f>Created: ${ssrInterpolate(incident.value.createdAt)}</p></div>`);
      } else {
        _push(`<p data-v-ed149b4f>Incident not found.</p>`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/incidents/[id].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _id_ = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-ed149b4f"]]);
export {
  _id_ as default
};
//# sourceMappingURL=_id_-DiJbM0y-.js.map
