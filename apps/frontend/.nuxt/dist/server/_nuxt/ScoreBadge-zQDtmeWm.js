import { defineComponent, computed, mergeProps, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrInterpolate } from "vue/server-renderer";
import { _ as _export_sfc } from "./_plugin-vue_export-helper-1tPrXgE0.js";
const useRiskColor = (score) => {
  if (score >= 75) return "#ef4444";
  if (score >= 50) return "#f97316";
  if (score >= 25) return "#eab308";
  return "#22c55e";
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ScoreBadge",
  __ssrInlineRender: true,
  props: {
    score: {},
    severity: {}
  },
  setup(__props) {
    const props = __props;
    const score = computed(() => props.score ?? 0);
    const color = computed(() => useRiskColor(score.value));
    const label = computed(() => props.severity ? props.severity.toUpperCase() : `Score ${score.value}`);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<span${ssrRenderAttrs(mergeProps({
        class: "badge",
        style: { background: color.value }
      }, _attrs))} data-v-888a1f28>${ssrInterpolate(label.value)}</span>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/shared/ScoreBadge.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const ScoreBadge = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-888a1f28"]]);
export {
  ScoreBadge as S
};
//# sourceMappingURL=ScoreBadge-zQDtmeWm.js.map
