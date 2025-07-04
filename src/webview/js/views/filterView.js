import { state, dom } from '../state.js';
import * as api from '../api.js';
import { navigateTo, goBack, renderPrompts, updateFilterView } from '../uiManager.js';

function getAllTagsFromState() {
    const prompts = state.prompts || [];
    const allTags = prompts.reduce((acc, p) => {
        return p && p.tags ? [...acc, ...p.tags] : acc;
    }, []);
    return [...new Set(allTags)].sort();
}

export function renderFilterTags() {
    const { tagFilterOptions } = dom.filterViewElements;
    if (!tagFilterOptions) return;

    const allTags = getAllTagsFromState();
    // 确保 stagedFilter 已初始化
    if (!state.stagedFilter) {
        state.stagedFilter = { searchTerm: '', sortBy: 'newest', category: 'all', selectedTags: [] };
    }
    const selectedTags = state.stagedFilter.selectedTags || [];

    tagFilterOptions.innerHTML = allTags.map(tag => `
        <button 
            class="btn tag-filter-btn ${selectedTags.includes(tag) ? 'active' : ''}" 
            data-tag="${tag}">
            ${tag}
        </button>
    `).join('');
}

function handleSearchInput(e) {
    state.filter.searchTerm = e.target.value;
    renderPrompts();
}

async function openFilterView() {
    try {
        // Always fetch the latest prompts to ensure tags are up-to-date
        const response = await api.postMessageWithResponse('getPrompts');
        if (response && response.data) {
            state.prompts = response.data;
        } else {
            console.warn('Could not refresh prompts for filter view.');
        }
    } catch (error) {
        console.error('Error fetching prompts for filter view:', error);
        // Don't block the UI, proceed with existing state data
    }
    
    // Clone the current filter state for editing, so changes aren't applied live
    state.stagedFilter = JSON.parse(JSON.stringify(state.filter));
    
    renderFilterTags(); // Render tags before showing the view
    updateFilterView();
    navigateTo('filter');
}

function applyFilters() {
    state.filter = JSON.parse(JSON.stringify(state.stagedFilter));
    renderPrompts();
    goBack();
}

function resetFilters() {
    state.stagedFilter = { 
        searchTerm: state.filter.searchTerm, // Keep search term
        sortBy: 'newest', 
        category: 'all', 
        selectedTags: [] // Clear selected tags
    };
    updateFilterView();
}

/*
// This logic will be handled by eventHandlers.js
function handleStatusClick(e) {
   // ...
}

function handleTagClick(e) {
    // ...
}
*/

export function init() {
    // All event listeners are now managed in eventHandlers.js
    // dom.mainViewElements.searchInput.addEventListener('input', handleSearchInput);
    // dom.mainViewElements.filterButton.addEventListener('click', openFilterView);

    // // Filter View listeners
    // dom.filterViewElements.applyButton.addEventListener('click', applyFilters);
    // dom.filterViewElements.resetButton.addEventListener('click', resetFilters);
    // dom.filterViewElements.statusOptions.addEventListener('click', handleStatusClick);
    // dom.filterViewElements.tagFilterOptions.addEventListener('click', handleTagClick);
} 

export { openFilterView, applyFilters, resetFilters }; 