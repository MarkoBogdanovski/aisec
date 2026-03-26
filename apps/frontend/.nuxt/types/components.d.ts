
import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T> = DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>> & T

type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }> & T

interface _GlobalComponents {
  ContractAnalyzeContractForm: typeof import("../../components/contract/AnalyzeContractForm.vue")['default']
  ContractDetail: typeof import("../../components/contract/ContractDetail.vue")['default']
  ContractHistory: typeof import("../../components/contract/ContractHistory.vue")['default']
  ContractFindingsList: typeof import("../../components/contract/FindingsList.vue")['default']
  ContractJobStatus: typeof import("../../components/contract/JobStatus.vue")['default']
  ContractRiskScoreCard: typeof import("../../components/contract/RiskScoreCard.vue")['default']
  HomeFeatureCard: typeof import("../../components/home/FeatureCard.vue")['default']
  HomeFeaturesGrid: typeof import("../../components/home/FeaturesGrid.vue")['default']
  HomeQuickContractLookup: typeof import("../../components/home/QuickContractLookup.vue")['default']
  HomeQuickWalletLookup: typeof import("../../components/home/QuickWalletLookup.vue")['default']
  IncidentList: typeof import("../../components/incident/IncidentList.vue")['default']
  MarketEventsList: typeof import("../../components/market/MarketEventsList.vue")['default']
  SharedEntityRelationsGraph: typeof import("../../components/shared/EntityRelationsGraph.vue")['default']
  SharedInvestigationWorkspace: typeof import("../../components/shared/InvestigationWorkspace.vue")['default']
  SharedQuickSearch: typeof import("../../components/shared/QuickSearch.vue")['default']
  SharedScoreBadge: typeof import("../../components/shared/ScoreBadge.vue")['default']
  SharedSearchableDropdown: typeof import("../../components/shared/SearchableDropdown.vue")['default']
  WalletAnalyzeWalletForm: typeof import("../../components/wallet/AnalyzeWalletForm.vue")['default']
  WalletFundFlowGraph: typeof import("../../components/wallet/FundFlowGraph.vue")['default']
  WalletReputationGauge: typeof import("../../components/wallet/ReputationGauge.vue")['default']
  NuxtWelcome: typeof import("../../node_modules/nuxt/dist/app/components/welcome.vue")['default']
  NuxtLayout: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
  NuxtErrorBoundary: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
  ClientOnly: typeof import("../../node_modules/nuxt/dist/app/components/client-only")['default']
  DevOnly: typeof import("../../node_modules/nuxt/dist/app/components/dev-only")['default']
  ServerPlaceholder: typeof import("../../node_modules/nuxt/dist/app/components/server-placeholder")['default']
  NuxtLink: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-link")['default']
  NuxtLoadingIndicator: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
  NuxtTime: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
  NuxtRouteAnnouncer: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
  NuxtImg: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
  NuxtPicture: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
  NuxtPage: typeof import("../../node_modules/nuxt/dist/pages/runtime/page")['default']
  NoScript: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['NoScript']
  Link: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Link']
  Base: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Base']
  Title: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Title']
  Meta: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Meta']
  Style: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Style']
  Head: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Head']
  Html: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Html']
  Body: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Body']
  NuxtIsland: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-island")['default']
  LazyContractAnalyzeContractForm: LazyComponent<typeof import("../../components/contract/AnalyzeContractForm.vue")['default']>
  LazyContractDetail: LazyComponent<typeof import("../../components/contract/ContractDetail.vue")['default']>
  LazyContractHistory: LazyComponent<typeof import("../../components/contract/ContractHistory.vue")['default']>
  LazyContractFindingsList: LazyComponent<typeof import("../../components/contract/FindingsList.vue")['default']>
  LazyContractJobStatus: LazyComponent<typeof import("../../components/contract/JobStatus.vue")['default']>
  LazyContractRiskScoreCard: LazyComponent<typeof import("../../components/contract/RiskScoreCard.vue")['default']>
  LazyHomeFeatureCard: LazyComponent<typeof import("../../components/home/FeatureCard.vue")['default']>
  LazyHomeFeaturesGrid: LazyComponent<typeof import("../../components/home/FeaturesGrid.vue")['default']>
  LazyHomeQuickContractLookup: LazyComponent<typeof import("../../components/home/QuickContractLookup.vue")['default']>
  LazyHomeQuickWalletLookup: LazyComponent<typeof import("../../components/home/QuickWalletLookup.vue")['default']>
  LazyIncidentList: LazyComponent<typeof import("../../components/incident/IncidentList.vue")['default']>
  LazyMarketEventsList: LazyComponent<typeof import("../../components/market/MarketEventsList.vue")['default']>
  LazySharedEntityRelationsGraph: LazyComponent<typeof import("../../components/shared/EntityRelationsGraph.vue")['default']>
  LazySharedInvestigationWorkspace: LazyComponent<typeof import("../../components/shared/InvestigationWorkspace.vue")['default']>
  LazySharedQuickSearch: LazyComponent<typeof import("../../components/shared/QuickSearch.vue")['default']>
  LazySharedScoreBadge: LazyComponent<typeof import("../../components/shared/ScoreBadge.vue")['default']>
  LazySharedSearchableDropdown: LazyComponent<typeof import("../../components/shared/SearchableDropdown.vue")['default']>
  LazyWalletAnalyzeWalletForm: LazyComponent<typeof import("../../components/wallet/AnalyzeWalletForm.vue")['default']>
  LazyWalletFundFlowGraph: LazyComponent<typeof import("../../components/wallet/FundFlowGraph.vue")['default']>
  LazyWalletReputationGauge: LazyComponent<typeof import("../../components/wallet/ReputationGauge.vue")['default']>
  LazyNuxtWelcome: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
  LazyNuxtLayout: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
  LazyNuxtErrorBoundary: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
  LazyClientOnly: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/client-only")['default']>
  LazyDevOnly: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/dev-only")['default']>
  LazyServerPlaceholder: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
  LazyNuxtLink: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
  LazyNuxtLoadingIndicator: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
  LazyNuxtTime: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
  LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
  LazyNuxtImg: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
  LazyNuxtPicture: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
  LazyNuxtPage: LazyComponent<typeof import("../../node_modules/nuxt/dist/pages/runtime/page")['default']>
  LazyNoScript: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
  LazyLink: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Link']>
  LazyBase: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Base']>
  LazyTitle: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Title']>
  LazyMeta: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Meta']>
  LazyStyle: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Style']>
  LazyHead: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Head']>
  LazyHtml: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Html']>
  LazyBody: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Body']>
  LazyNuxtIsland: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-island")['default']>
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}

export {}
