<template>
  <div class="quick-search-container">
    <div class="search-backdrop">
      <div class="grid-pattern"></div>
    </div>
    <div class="search-content">
      <div class="search-header">
        <h2>Quick Search</h2>
        <p>Instant contract and wallet intelligence</p>
      </div>
      
      <div class="search-form">
        <div class="search-type-tabs">
          <button 
            @click="searchType = 'contract'"
            :class="['tab-button', { active: searchType === 'contract' }]"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2v-4a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Contract
          </button>
          <button 
            @click="searchType = 'wallet'"
            :class="['tab-button', { active: searchType === 'wallet' }]"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Wallet
          </button>
        </div>

        <div class="search-input-group">
          <div class="input-wrapper">
            <input
              v-model="searchQuery"
              :placeholder="searchType === 'contract' ? 'Enter contract address...' : 'Enter wallet address...'"
              class="search-input"
              @keyup.enter="performSearch"
            />
            <button @click="performSearch" class="search-button">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

        <div class="recent-searches" v-if="recentSearches.length > 0">
          <h3>Recent Searches</h3>
          <div class="recent-list">
            <div 
              v-for="item in recentSearches" 
              :key="item.id"
              @click="selectRecentSearch(item)"
              class="recent-item"
            >
              <div class="recent-icon">
                <svg v-if="item.type === 'contract'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2v-4a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div class="recent-content">
                <div class="recent-address">{{ item.query }}</div>
                <div class="recent-time">{{ formatTime(item.timestamp) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface RecentSearch {
  id: string;
  query: string;
  type: 'contract' | 'wallet';
  timestamp: Date;
}

const searchType = ref<'contract' | 'wallet'>('contract');
const searchQuery = ref('');
const recentSearches = ref<RecentSearch[]>([]);

const performSearch = () => {
  if (!searchQuery.value.trim()) return;

  // Add to recent searches
  const newSearch: RecentSearch = {
    id: Date.now().toString(),
    query: searchQuery.value,
    type: searchType.value,
    timestamp: new Date(),
  };

  recentSearches.value.unshift(newSearch);
  if (recentSearches.value.length > 5) {
    recentSearches.value = recentSearches.value.slice(0, 5);
  }

  // Save to localStorage
  localStorage.setItem('recentSearches', JSON.stringify(recentSearches.value));

  // Navigate to appropriate page
  if (searchType.value === 'contract') {
    navigateTo(`/?mode=contract&query=${encodeURIComponent(searchQuery.value)}`);
  } else {
    navigateTo(`/?mode=wallet&query=${encodeURIComponent(searchQuery.value)}`);
  }
};

const selectRecentSearch = (item: RecentSearch) => {
  searchType.value = item.type;
  searchQuery.value = item.query;
  performSearch();
};

const formatTime = (timestamp: Date) => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

onMounted(() => {
  const saved = localStorage.getItem('recentSearches');
  if (saved) {
    recentSearches.value = JSON.parse(saved);
  }
});
</script>

<style scoped>
.quick-search-container {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
}

.search-backdrop {
  position: absolute;
  inset: 0;
  opacity: 0.18;
  pointer-events: none;
}

.grid-pattern {
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: grid-move 20s linear infinite;
}

@keyframes grid-move {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

.search-content {
  position: relative;
  z-index: 1;
  padding: 20px;
}

.search-header {
  text-align: center;
  margin-bottom: 24px;
}

.search-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
}

.search-header p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.search-type-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  justify-content: center;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.18);
}

.tab-button.active {
  background: rgba(16, 185, 129, 0.14);
  border-color: rgba(110, 231, 183, 0.4);
  color: white;
}

.search-input-group {
  margin-bottom: 24px;
}

.input-wrapper {
  display: flex;
  gap: 8px;
  max-width: 500px;
  margin: 0 auto;
}

.search-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.04);
  color: white;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
  backdrop-filter: blur(20px);
}

.search-input:focus {
  border-color: rgba(110, 231, 183, 0.45);
  background: rgba(255, 255, 255, 0.06);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-button {
  padding: 10px;
  border-radius: 12px;
  background: linear-gradient(135deg, #059669 0%, #22c55e 100%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: white;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.search-button:hover {
  transform: translateY(-2px);
}

.recent-searches h3 {
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin-bottom: 12px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.18);
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(18px);
}

.recent-item:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.16);
}

.recent-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
}

.recent-content {
  flex: 1;
}

.recent-address {
  font-size: 14px;
  color: white;
  font-family: monospace;
  margin-bottom: 4px;
}

.recent-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}
</style>
