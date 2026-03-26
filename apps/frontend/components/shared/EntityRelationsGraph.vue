<template>
  <div class="glass-panel-soft p-5 md:p-6">
    <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="eyebrow-label">Interactive Network Graph</p>
        <h3 class="mt-2 text-lg font-semibold tracking-tight text-neutral-100">Entity Relations</h3>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-[#06070c]/92 text-neutral-200 transition hover:border-emerald-400/45 hover:text-white"
          @click="zoomOut"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-[#06070c]/92 text-neutral-200 transition hover:border-emerald-400/45 hover:text-white"
          @click="zoomIn"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition"
        :class="!focusedType ? 'border-emerald-400/45 bg-emerald-500/10 text-emerald-200' : 'border-white/20 bg-[#06070c]/92 text-neutral-400'"
        @click="clearFocus"
      >
        All Types
      </button>
      <button
        v-for="item in legendItems"
        :key="item.type"
        type="button"
        class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition"
        :class="focusedType === item.type || (!focusedType && item.count > 0)
          ? 'border-white/20 bg-[#06070c]/92 text-neutral-200'
          : 'border-white/10 bg-[#06070c]/92 text-neutral-500'"
        @click="toggleTypeFocus(item.type)"
      >
        <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: item.color }"></span>
        <span>{{ item.label }}</span>
        <span class="text-neutral-500">{{ item.count }}</span>
      </button>
    </div>

    <ClientOnly>
      <div
        ref="graphPanelRef"
        class="relative h-[420px] w-full overflow-hidden rounded-[22px] border border-white/20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.07),transparent_30%),linear-gradient(180deg,rgba(6,7,12,0.92),rgba(6,7,12,0.92))] backdrop-blur-xl"
      >
        <VNetworkGraph
          ref="graphRef"
          v-model:layouts="layouts"
          v-model:selected-nodes="selectedNodes"
          class="entity-graph h-full w-full"
          :nodes="nodes"
          :edges="edges"
          :configs="configs"
          :event-handlers="eventHandlers"
        />

        <div
          v-if="tooltipEntity"
          class="pointer-events-none absolute z-[340] w-[260px] max-w-[calc(100%-2rem)] rounded-[20px] border border-white/20 bg-[#06070c] p-4 text-left shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          :style="tooltipStyle"
        >
          <div class="flex items-start gap-3">
            <div
              class="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 text-lg"
              :style="{ backgroundColor: `${nodeColor(tooltipEntity.type)}20` }"
            >
              {{ tooltipEntity.icon }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate text-sm font-semibold text-neutral-100">{{ tooltipEntity.label }}</p>
                <span class="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-neutral-400">
                  {{ formatTypeLabel(tooltipEntity.type) }}
                </span>
              </div>
              <p class="mt-2 text-xs leading-5 text-neutral-300">{{ tooltipEntity.message }}</p>
              <div class="mt-3 flex items-center justify-between gap-3">
                <span class="text-[11px] uppercase tracking-[0.16em] text-neutral-500">{{ formatFraudLabel(tooltipEntity.fraudType) }}</span>
                <span class="text-sm font-medium text-neutral-100">{{ tooltipEntity.riskScore }}/100</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #fallback>
        <div class="flex h-[420px] w-full items-center justify-center rounded-[22px] border border-white/20 bg-[#06070c]/92 text-sm text-neutral-500 backdrop-blur-xl">
          Loading graph...
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ForceLayout } from 'v-network-graph/lib/force-layout';
import { VNetworkGraph, defineConfigs, type Edge, type Edges, type EventHandlers, type Layouts, type Node, type Nodes, type VNetworkGraphInstance } from 'v-network-graph';
import type { EntityType, InvestigationEntity, InvestigationRelation } from '~/types/investigation';

const props = defineProps<{
  entities: InvestigationEntity[];
  relations: InvestigationRelation[];
}>();

type GraphNode = Node & {
  name: string;
  type: InvestigationEntity['type'];
  riskScore: number;
  color: string;
  labelColor: string;
  strokeColor: string;
};

type GraphEdge = Edge & {
  label: string;
  strength: number;
  color: string;
};

type TooltipPosition = {
  x: number;
  y: number;
};

const nodeColor = (type: InvestigationEntity['type']) => {
  switch (type) {
    case 'wallet':
      return '#22c55e';
    case 'contract':
      return '#10b981';
    case 'flagged-service':
      return '#ef4444';
    case 'funding-source':
      return '#06b6d4';
    case 'counterparty':
      return '#f59e0b';
    default:
      return '#64748b';
  }
};

const darkenHex = (hex: string, factor = 0.45) => {
  const sanitized = hex.replace('#', '');
  const value = parseInt(sanitized, 16);
  const red = Math.max(0, Math.floor(((value >> 16) & 255) * factor));
  const green = Math.max(0, Math.floor(((value >> 8) & 255) * factor));
  const blue = Math.max(0, Math.floor((value & 255) * factor));

  return `rgb(${red}, ${green}, ${blue})`;
};

const formatTypeLabel = (type: EntityType) => type.replace(/-/g, ' ');
const formatFraudLabel = (type: string) => type.replace(/-/g, ' ');

const graphRef = ref<VNetworkGraphInstance>();
const graphPanelRef = ref<HTMLDivElement | null>(null);
const layouts = ref<Layouts>({ nodes: {} });
const selectedNodes = ref<string[]>([]);
const selectedEntityId = ref<string | null>(null);
const focusedType = ref<EntityType | null>(null);
const tooltipPosition = ref<TooltipPosition | null>(null);

const entitiesById = computed(() =>
  Object.fromEntries(props.entities.map((entity) => [entity.id, entity])),
);

const tooltipEntity = computed(() => {
  if (!selectedEntityId.value) return null;
  return entitiesById.value[selectedEntityId.value] ?? null;
});

const legendItems = computed(() => {
  const counts = props.entities.reduce<Record<string, number>>((acc, entity) => {
    acc[entity.type] = (acc[entity.type] ?? 0) + 1;
    return acc;
  }, {});

  return Object.keys(counts).map((type) => ({
    type: type as EntityType,
    label: formatTypeLabel(type as EntityType),
    count: counts[type] ?? 0,
    color: nodeColor(type as EntityType),
  }));
});

const tooltipStyle = computed(() => {
  if (!tooltipPosition.value) {
    return { top: '1rem', left: '1rem' };
  }

  return {
    left: `${tooltipPosition.value.x}px`,
    top: `${tooltipPosition.value.y}px`,
  };
});

const resolveNodeVisuals = (entity: InvestigationEntity) => {
  const active = !focusedType.value || entity.type === focusedType.value;
  const baseColor = nodeColor(entity.type);

  return {
    color: active ? baseColor : darkenHex(baseColor, 0.32),
    strokeColor: active ? '#ecfccb' : 'rgba(82, 82, 91, 0.7)',
    labelColor: active ? '#f8fafc' : '#6b7280',
  };
};

const nodes = computed<Nodes>(() =>
  Object.fromEntries(
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
          strokeColor: visuals.strokeColor,
        } satisfies GraphNode;
      })(),
    ]),
  ),
);

const edgeColor = (strength: number) => {
  if (strength >= 0.85) return '#22c55e';
  if (strength >= 0.7) return '#34d399';
  if (strength >= 0.55) return '#f59e0b';
  return '#64748b';
};

const edges = computed<Edges>(() =>
  Object.fromEntries(
    props.relations.map((relation) => [
      relation.id,
      {
        source: relation.source,
        target: relation.target,
        label: relation.label,
        strength: relation.strength,
        color: edgeColor(relation.strength),
      } satisfies GraphEdge,
    ]),
  ),
);

const configs = defineConfigs<GraphNode, GraphEdge>({
  view: {
    autoPanAndZoomOnLoad: 'fit-content',
    fitContentMargin: 24,
    layoutHandler: new ForceLayout({
      positionFixedByDrag: false,
      positionFixedByClickWithAltKey: false,
    }),
    minZoomLevel: 0.25,
    maxZoomLevel: 4,
  },
  node: {
    selectable: true,
    draggable: true,
    normal: {
      type: 'circle',
      radius: (node) => 18 + Math.round((node.riskScore / 100) * 18),
      color: (node) => node.color,
      strokeColor: (node) => node.strokeColor,
      strokeWidth: 2,
    },
    hover: {
      type: 'circle',
      radius: (node) => 20 + Math.round((node.riskScore / 100) * 18),
      color: (node) => node.color,
      strokeColor: '#f8fafc',
      strokeWidth: 3,
    },
    selected: {
      type: 'circle',
      radius: (node) => 22 + Math.round((node.riskScore / 100) * 18),
      color: (node) => node.color,
      strokeColor: '#ffffff',
      strokeWidth: 4,
    },
    label: {
      visible: true,
      text: (node) => node.name,
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: 11,
      color: (node) => node.labelColor,
      background: {
        visible: true,
        color: 'rgba(9, 11, 18, 0.82)',
        borderRadius: 8,
        padding: { vertical: 3, horizontal: 6 },
      },
      lineHeight: 1.3,
      direction: 'south',
      directionAutoAdjustment: true,
      margin: 6,
      handleNodeEvents: true,
    },
    focusring: {
      visible: true,
      width: 3,
      padding: 4,
      color: 'rgba(255,255,255,0.65)',
    },
  },
  edge: {
    selectable: false,
    gap: 16,
    type: 'curve',
    normal: {
      width: (edge) => 1.5 + edge.strength * 3.5,
      color: (edge) => edge.color,
      dasharray: (edge) => (edge.strength < 0.6 ? '6 5' : undefined),
      animate: true,
      animationSpeed: 20,
    },
    hover: {
      width: (edge) => 2.5 + edge.strength * 3.5,
      color: (edge) => edge.color,
      animate: true,
      animationSpeed: 28,
    },
    selected: {
      width: (edge) => 2.5 + edge.strength * 3.5,
      color: (edge) => edge.color,
      animate: true,
      animationSpeed: 28,
    },
    marker: {
      source: {
        type: 'none',
        width: 0,
        height: 0,
        margin: -1,
        offset: 0,
        units: 'strokeWidth',
        color: null,
      },
      target: {
        type: 'arrow',
        width: 5,
        height: 5,
        margin: 4,
        offset: 0,
        units: 'strokeWidth',
        color: (edge) => edge.color,
      },
    },
    label: {
      visible: true,
      text: (edge) => edge.label,
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: 9,
      color: '#cbd5e1',
      background: {
        visible: true,
        color: 'rgba(15, 23, 42, 0.84)',
        borderRadius: 6,
        padding: { vertical: 2, horizontal: 4 },
      },
      lineHeight: 1.2,
      margin: 4,
      padding: 4,
    },
  },
});

const eventHandlers: EventHandlers = {
  'node:click': ({ node, event }) => {
    selectedNodes.value = [node];
    selectedEntityId.value = node;
    focusedType.value = entitiesById.value[node]?.type ?? null;

    const rect = graphPanelRef.value?.getBoundingClientRect();
    if (rect) {
      const x = Math.min(Math.max(16, event.clientX - rect.left + 16), rect.width - 276);
      const y = Math.min(Math.max(16, event.clientY - rect.top - 24), rect.height - 132);
      tooltipPosition.value = { x, y };
    }
  },
  'view:click': () => {
    clearFocus();
  },
};

const clearFocus = () => {
  selectedNodes.value = [];
  selectedEntityId.value = null;
  focusedType.value = null;
  tooltipPosition.value = null;
};

const toggleTypeFocus = (type: EntityType) => {
  if (focusedType.value === type) {
    clearFocus();
    return;
  }

  focusedType.value = type;
  selectedEntityId.value = null;
  tooltipPosition.value = null;
  selectedNodes.value = [];
};

const zoomIn = () => {
  graphRef.value?.zoomIn();
};

const zoomOut = () => {
  graphRef.value?.zoomOut();
};

watch(
  () => props.entities,
  (entities) => {
    const selected = selectedEntityId.value ? entities.find((entity) => entity.id === selectedEntityId.value) : null;
    if (!selected && selectedEntityId.value) {
      clearFocus();
    }
  },
  { immediate: true, deep: true },
);
</script>
