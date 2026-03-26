
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


export const ContractAnalyzeContractForm: typeof import("../components/contract/AnalyzeContractForm.vue")['default']
export const ContractDetail: typeof import("../components/contract/ContractDetail.vue")['default']
export const ContractHistory: typeof import("../components/contract/ContractHistory.vue")['default']
export const ContractFindingsList: typeof import("../components/contract/FindingsList.vue")['default']
export const ContractJobStatus: typeof import("../components/contract/JobStatus.vue")['default']
export const ContractRiskScoreCard: typeof import("../components/contract/RiskScoreCard.vue")['default']
export const HomeFeatureCard: typeof import("../components/home/FeatureCard.vue")['default']
export const HomeFeaturesGrid: typeof import("../components/home/FeaturesGrid.vue")['default']
export const HomeQuickContractLookup: typeof import("../components/home/QuickContractLookup.vue")['default']
export const HomeQuickWalletLookup: typeof import("../components/home/QuickWalletLookup.vue")['default']
export const IncidentList: typeof import("../components/incident/IncidentList.vue")['default']
export const MarketEventsList: typeof import("../components/market/MarketEventsList.vue")['default']
export const SharedEntityRelationsGraph: typeof import("../components/shared/EntityRelationsGraph.vue")['default']
export const SharedInvestigationWorkspace: typeof import("../components/shared/InvestigationWorkspace.vue")['default']
export const SharedQuickSearch: typeof import("../components/shared/QuickSearch.vue")['default']
export const SharedScoreBadge: typeof import("../components/shared/ScoreBadge.vue")['default']
export const SharedSearchableDropdown: typeof import("../components/shared/SearchableDropdown.vue")['default']
export const WalletAnalyzeWalletForm: typeof import("../components/wallet/AnalyzeWalletForm.vue")['default']
export const WalletFundFlowGraph: typeof import("../components/wallet/FundFlowGraph.vue")['default']
export const WalletReputationGauge: typeof import("../components/wallet/ReputationGauge.vue")['default']
export const NuxtWelcome: typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']
export const NuxtLayout: typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
export const NuxtErrorBoundary: typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
export const ClientOnly: typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']
export const DevOnly: typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']
export const ServerPlaceholder: typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']
export const NuxtLink: typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']
export const NuxtLoadingIndicator: typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
export const NuxtTime: typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
export const NuxtRouteAnnouncer: typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
export const NuxtImg: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
export const NuxtPicture: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
export const NuxtPage: typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']
export const NoScript: typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']
export const Link: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']
export const Base: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']
export const Title: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']
export const Meta: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']
export const Style: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']
export const Head: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']
export const Html: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']
export const Body: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']
export const NuxtIsland: typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']
export const LazyContractAnalyzeContractForm: LazyComponent<typeof import("../components/contract/AnalyzeContractForm.vue")['default']>
export const LazyContractDetail: LazyComponent<typeof import("../components/contract/ContractDetail.vue")['default']>
export const LazyContractHistory: LazyComponent<typeof import("../components/contract/ContractHistory.vue")['default']>
export const LazyContractFindingsList: LazyComponent<typeof import("../components/contract/FindingsList.vue")['default']>
export const LazyContractJobStatus: LazyComponent<typeof import("../components/contract/JobStatus.vue")['default']>
export const LazyContractRiskScoreCard: LazyComponent<typeof import("../components/contract/RiskScoreCard.vue")['default']>
export const LazyHomeFeatureCard: LazyComponent<typeof import("../components/home/FeatureCard.vue")['default']>
export const LazyHomeFeaturesGrid: LazyComponent<typeof import("../components/home/FeaturesGrid.vue")['default']>
export const LazyHomeQuickContractLookup: LazyComponent<typeof import("../components/home/QuickContractLookup.vue")['default']>
export const LazyHomeQuickWalletLookup: LazyComponent<typeof import("../components/home/QuickWalletLookup.vue")['default']>
export const LazyIncidentList: LazyComponent<typeof import("../components/incident/IncidentList.vue")['default']>
export const LazyMarketEventsList: LazyComponent<typeof import("../components/market/MarketEventsList.vue")['default']>
export const LazySharedEntityRelationsGraph: LazyComponent<typeof import("../components/shared/EntityRelationsGraph.vue")['default']>
export const LazySharedInvestigationWorkspace: LazyComponent<typeof import("../components/shared/InvestigationWorkspace.vue")['default']>
export const LazySharedQuickSearch: LazyComponent<typeof import("../components/shared/QuickSearch.vue")['default']>
export const LazySharedScoreBadge: LazyComponent<typeof import("../components/shared/ScoreBadge.vue")['default']>
export const LazySharedSearchableDropdown: LazyComponent<typeof import("../components/shared/SearchableDropdown.vue")['default']>
export const LazyWalletAnalyzeWalletForm: LazyComponent<typeof import("../components/wallet/AnalyzeWalletForm.vue")['default']>
export const LazyWalletFundFlowGraph: LazyComponent<typeof import("../components/wallet/FundFlowGraph.vue")['default']>
export const LazyWalletReputationGauge: LazyComponent<typeof import("../components/wallet/ReputationGauge.vue")['default']>
export const LazyNuxtWelcome: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
export const LazyNuxtLayout: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
export const LazyNuxtErrorBoundary: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
export const LazyClientOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']>
export const LazyDevOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']>
export const LazyServerPlaceholder: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const LazyNuxtLink: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
export const LazyNuxtLoadingIndicator: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
export const LazyNuxtTime: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
export const LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
export const LazyNuxtImg: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
export const LazyNuxtPicture: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
export const LazyNuxtPage: LazyComponent<typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']>
export const LazyNoScript: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
export const LazyLink: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']>
export const LazyBase: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']>
export const LazyTitle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']>
export const LazyMeta: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']>
export const LazyStyle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']>
export const LazyHead: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']>
export const LazyHtml: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']>
export const LazyBody: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']>
export const LazyNuxtIsland: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']>

export const componentNames: string[]
