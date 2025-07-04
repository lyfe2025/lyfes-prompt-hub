import { state, dom } from './state.js';
import * as categoryView from './views/categoryView.js';
import * as editView from './views/editView.js';
import * as filterView from './views/filterView.js';
import * as settingsView from './views/settingsView.js';
import { renderBackupList } from './views/settings/backupManagementView.js';
import * as api from './api.js';

// --- Globals ---
let activeView = 'main';

// --- Navigation ---

function navigateTo(viewName) {
    const cleanViewName = viewName.replace('-view', '');
    const targetView = dom.views[cleanViewName];
    if (!targetView) {
        console.error(`Navigation failed: View '${cleanViewName}' not found.`);
        return;
    }

    Object.values(dom.views).forEach(v => v.classList.add('hidden'));
    targetView.classList.remove('hidden');

    // Special case for views that need rendering upon navigation
    if (cleanViewName === 'main') {
        // 返回主页时主动获取最新数据并刷新界面
        api.postMessageWithResponse('getAppData')
            .then(response => {
                const appData = api.parseAppDataResponse(response);
                
                // 更新全局状态
                state.appData = appData;
                state.prompts = appData.prompts;
                console.log('[Navigation] Main view refreshed with latest data:', state.prompts.length, 'prompts');
                
                // 刷新主页界面
                renderAll();
            })
            .catch(err => {
                console.error('[Navigation] Failed to refresh main view data:', err);
                renderAll(); // 出错时仍然刷新界面，使用缓存数据
            });
    } else if (cleanViewName === 'categoryManagement') {
        // 主动从后端获取最新数据，确保分类列表是最新的
        api.postMessageWithResponse('getAppData')
            .then(response => {
                const appData = api.parseAppDataResponse(response);
                
                // 更新全局状态
                state.appData = appData;
                state.prompts = appData.prompts;
                console.log('[Navigation] Category management view refreshed with latest data:', state.appData.categories.length, 'categories');
                
                // 渲染分类管理界面
                categoryView.render();
            })
            .catch(err => {
                console.error('[Navigation] Failed to refresh category management data:', err);
                // 出错时仍然渲染界面，使用缓存数据
                categoryView.render();
            });
    } else if (cleanViewName === 'settings') {
        settingsView.init(renderAll);
        // 主动从后端获取最新的设置数据，确保云同步状态显示正确
        api.postMessageWithResponse('getAppData')
            .then(response => {
                const appData = response.data; // 从响应中提取真正的appData
                if (appData && appData.settings) {
                    // 更新前端状态中的设置数据
                    if (state.appData) {
                        state.appData.settings = appData.settings;
                    }
                    renderSettingsStatus(appData.settings);
                }
            })
            .catch(err => {
                console.error('Failed to get latest settings data:', err);
                // 如果获取失败，仍使用缓存数据
                if (state.appData && state.appData.settings) {
                    renderSettingsStatus(state.appData.settings);
                }
            });
    } else if (cleanViewName === 'backupManagement') {
        api.listBackups()
            .then(response => {
                // 确保从响应中提取备份数组
                const backups = response.data || response || [];
                // 确保 backups 是数组
                if (Array.isArray(backups)) {
                    renderBackupList(backups);
                } else {
                    console.error('Backups data is not an array:', backups);
                    renderBackupList([]);
                }
            })
            .catch(err => {
                console.error('Failed to list backups:', err);
                api.showToast(`刷新备份列表失败: ${err.message}`, 'error');
                renderBackupList([]); // Render empty list on error
            });
    }

    const viewId = `${cleanViewName}-view`;
    if (state.viewStack[state.viewStack.length - 1] !== viewId) {
        state.viewStack.push(viewId);
    }
}

function goBack() {
    if (state.viewStack.length <= 1) return;

    state.viewStack.pop();
    
    const previousViewId = state.viewStack[state.viewStack.length - 1];
    const cleanViewName = previousViewId.replace('-view', '');
    
    Object.values(dom.views).forEach(v => v.classList.add('hidden'));
    if (dom.views[cleanViewName]) {
        dom.views[cleanViewName].classList.remove('hidden');
        
        // 如果返回到主页，主动刷新数据
        if (cleanViewName === 'main') {
            api.postMessageWithResponse('getAppData')
                .then(response => {
                    const appData = api.parseAppDataResponse(response);
                    
                    // 更新全局状态
                    state.appData = appData;
                    state.prompts = appData.prompts;
                    console.log('[GoBack] Main view refreshed with latest data:', state.prompts.length, 'prompts');
                    
                    // 刷新主页界面
                    renderAll();
                })
                .catch(err => {
                    console.error('[GoBack] Failed to refresh main view data:', err);
                    renderAll(); // 出错时仍然刷新界面，使用缓存数据
                });
        }
    } else {
         console.error(`Go back failed: View '${cleanViewName}' not found.`);
         dom.views.main.classList.remove('hidden');
         // 当找不到目标视图时，也刷新主页数据
         api.postMessageWithResponse('getAppData')
             .then(response => {
                 const appData = api.parseAppDataResponse(response);
                 
                 state.appData = appData;
                 state.prompts = appData.prompts;
                 renderAll();
             })
             .catch(err => {
                 console.error('[GoBack] Fallback main view data refresh failed:', err);
                 renderAll();
             });
    }
}

function navigateToSettings() {
    // This function ensures that navigating 'back' to settings cleans up the view stack.
    // For instance, from Main -> Settings -> Backup Management, the stack is
    // ['main', 'settings', 'backupManagement']. Going back should result in
    // ['main', 'settings'], not ['main', 'settings', 'backupManagement', 'settings'].
    const settingsIndex = state.viewStack.lastIndexOf('settings-view');

    if (settingsIndex !== -1) {
        // Cut the stack back to the point where settings was the last view
        state.viewStack.splice(settingsIndex + 1);
    } else {
        // This case should ideally not be hit if the flow is correct,
        // but as a robust fallback, reset the stack to a valid state.
        state.viewStack = ['main-view', 'settings-view'];
    }
    
    // Now, call navigateTo. It will not push 'settings-view' again because
    // it's already the last item on the stack. It will just display it.
    navigateTo('settings');
}

// --- Rendering ---

function renderAll() {
    renderPrompts();
    updateCategories();
    updateFilterView();
    categoryView.render();
    if (state.appData && state.appData.settings) {
        renderSettingsStatus(state.appData.settings);
    }
}

// 注册预览按钮到预览管理器
function registerPreviewButtons(prompts) {
    // 动态导入预览管理器
    import('./promptPreview.js').then(module => {
        // 清理之前的注册
        module.previewManager.clearPreviewButtons();
        
        // 为每个提示词注册预览按钮
        prompts.forEach(prompt => {
            const promptItem = document.querySelector(`[data-id="${prompt.id}"]`);
            if (promptItem) {
                const previewBtn = promptItem.querySelector('.preview-prompt-btn');
                if (previewBtn) {
                    module.previewManager.registerPreviewButton(prompt.id, previewBtn);
                }
            }
        });
    }).catch(err => {
        console.error('Failed to register preview buttons:', err);
    });
}

function renderPrompts() {
    if (!state.prompts) {
        return;
    }
    let filtered = state.prompts.filter(p => {
        if (!p) return false;

        const search = state.filter.searchTerm.toLowerCase();
        const titleMatch = p.title.toLowerCase().includes(search);
        const contentMatch = p.content.toLowerCase().includes(search);

        let categoryMatch = state.filter.category === 'all';
        if (state.filter.category === 'favorites') {
            categoryMatch = p.isFavorite;
        } else if (state.filter.category !== 'all') {
            categoryMatch = p.category === state.filter.category;
        }
        
        const selectedTags = state.filter.selectedTags || [];
        const tagMatch = selectedTags.length === 0 || (p.tags && p.tags.some(tag => selectedTags.includes(tag)));

        return (titleMatch || contentMatch) && categoryMatch && tagMatch;
    });

    filtered.sort((a, b) => {
        if (state.filter.category === 'favorites' && a.isFavorite !== b.isFavorite) {
            return b.isFavorite - a.isFavorite;
        }
        switch (state.filter.sortBy) {
            case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
            case 'title_asc': return a.title.localeCompare(b.title);
            case 'title_desc': return b.title.localeCompare(a.title);
            default: return new Date(b.createdAt) - new Date(a.createdAt);
        }
    });

    dom.promptListContainer.innerHTML = filtered.map(p => `
        <div class="prompt-item" data-id="${p.id}">
            <div class="prompt-item-content">
                <div class="prompt-item-title">${p.title}</div>
                <div class="prompt-tags">${(p.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
            </div>
            <div class="prompt-item-actions">
                <button class="btn action-btn preview-prompt-btn" title="预览">
                    <i class="codicon codicon-eye"></i>
                    <span>预览</span>
                </button>
                <button class="btn action-btn favorite-btn ${p.isFavorite ? 'favorited' : ''}" title="${p.isFavorite ? '取消收藏' : '收藏'}">
                    <i class="codicon ${p.isFavorite ? 'codicon-star-full' : 'codicon-star-empty'}"></i>
                    <span>${p.isFavorite ? '已收藏' : '收藏'}</span>
                </button>
            </div>
        </div>`).join('');
    dom.noResultsMessage.classList.toggle('hidden', filtered.length !== 0);

    // 注册预览按钮
    registerPreviewButtons(filtered);
}

function renderCategoryDropdown() {
    const { categorySelect, categoryDropdownMenu } = dom.editViewElements;
    const categories = state.appData?.categories || [];
    dom.categoryDropdownMenu.innerHTML = categories.map(cat => `
        <div class="dropdown-item" data-value="${cat}">${cat}</div>
    `).join('');
}

function renderTags() {
    dom.tagPillsContainer.innerHTML = state.currentTags.map(tag => `
        <span class="tag-pill">
            ${tag}
            <button type="button" class="tag-remove-btn" data-tag="${tag}">&times;</button>
        </span>`).join('');
    
    // 当没有标签时隐藏容器，有标签时显示容器
    dom.tagPillsContainer.classList.toggle('hidden', state.currentTags.length === 0);
}

function updateCategories() {
    const { categories } = state.appData;
    const { category } = state.filter;

    const createHtml = (cat, name, isActive) => `<button class="btn category-tab ${isActive ? 'active' : ''}" data-category="${cat}">${name}</button>`;

    let tabsHtml = createHtml('favorites', '收藏', category === 'favorites');
    tabsHtml += createHtml('all', '全部', category === 'all');

    if (categories && Array.isArray(categories)) {
        tabsHtml += categories
            .map(cat => createHtml(cat, cat, category === cat))
            .join('');
    }

    dom.mainViewElements.categoryTabsContainer.innerHTML = tabsHtml;
}

function updateFilterView() {
    // Always re-render Tag Buttons to ensure new tags are included
    const tagContainer = document.getElementById('tag-filter-options');
    if (tagContainer) {
        const allTags = state.prompts.reduce((acc, p) => {
            return p && p.tags ? [...acc, ...p.tags] : acc;
        }, []);
        const uniqueTags = [...new Set(allTags)];
        tagContainer.innerHTML = uniqueTags.map(tag => 
            `<button class="btn filter-btn" data-tag="${tag}">${tag}</button>`
        ).join('');

        // Update active state for all tag buttons
        tagContainer.querySelectorAll('.filter-btn').forEach(btn => {
            const tag = btn.dataset.tag;
            // 确保 stagedFilter 已初始化
            if (!state.stagedFilter) {
                state.stagedFilter = { searchTerm: '', sortBy: 'newest', category: 'all', selectedTags: [] };
            }
            const isActive = state.stagedFilter.selectedTags && state.stagedFilter.selectedTags.includes(tag);
            btn.classList.toggle('active', isActive);
        });
    }
}

// --- Forms & UI State ---

function showEditForm(id, isCreate = false) {
    const prompt = isCreate ? 
        { title: '', content: '', category: '', tags: [], id: null, isActive: true } :
        state.prompts.find(p => p.id == id);

    if (!prompt) {
        console.error('Prompt not found for editing:', id);
        return;
    }

    const { editViewElements: elements } = dom;
    
    // 设置标题
    elements.viewTitle.textContent = isCreate ? '创建提示词' : '编辑提示词';
    
    // 填充表单
    elements.titleInput.value = prompt.title;
    elements.promptInput.value = prompt.content;
    elements.idInput.value = prompt.id || '';
    
    // 设置分类 - 创建时留空，编辑时使用现有分类
    elements.categorySelect.value = prompt.category || '';
    renderCategoryDropdown();

    // 更新状态和UI
    state.currentTags = [...(prompt.tags || [])];
    renderTags();
    elements.deleteButton.classList.toggle('hidden', isCreate);

    navigateTo('edit');
    editView.render();
}

function renderSettingsStatus(status) {
    console.log('[UIManager] renderSettingsStatus called with:', {
        status: status ? {
            cloudSync: status.cloudSync,
            syncProvider: status.syncProvider,
            gistId: status.gistId,
            isValidated: status.isValidated,
            autoSync: status.autoSync
        } : null
    });

    if (!status) {
        console.log('[UIManager] renderSettingsStatus early return: no status');
        return;
    }

    settingsView.updateCloudSyncView(status);

    const isEnabled = status.cloudSync;
    
    if (dom.settingsViewElements.syncToCloudButton) {
        dom.settingsViewElements.syncToCloudButton.disabled = !isEnabled;
    }
    
    if (dom.settingsViewElements.syncFromCloudButton) {
        dom.settingsViewElements.syncFromCloudButton.disabled = !isEnabled;
    }
}

function showSettingsSaveStatus(isSuccess, message = '已保存') {
    // Note: The HTML id is 'auto-sync-toggle', but the status span is 'autoSyncStatus'.
    const statusEl = document.getElementById('autoSyncStatus');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.classList.toggle('error', !isSuccess);
        statusEl.classList.add('visible');
        setTimeout(() => {
            statusEl.classList.remove('visible');
        }, isSuccess ? 2000 : 5000);
    }
}

export {
    // Navigation
    navigateTo,
    goBack,
    navigateToSettings,
    // Rendering
    renderAll,
    renderPrompts,
    renderCategoryDropdown,
    renderTags,
    updateCategories,
    updateFilterView,
    // Forms & UI State
    showEditForm,
    renderSettingsStatus,
    showSettingsSaveStatus,
    // Globals
    dom
};
