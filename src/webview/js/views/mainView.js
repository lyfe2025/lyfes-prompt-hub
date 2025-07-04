import { dom, state } from '../state.js';
import { showEditForm, updateCategories, renderPrompts, navigateTo } from '../uiManager.js';
import * as api from '../api.js';
import { openFilterView } from './filterView.js';
import { cleanupPreview } from '../promptPreview.js';

// 辅助函数：隐藏预览窗口
function hidePreviewIfVisible() {
    import('../promptPreview.js').then(module => {
        if (module.previewManager.isPreviewVisible) {
            module.previewManager.immediateHidePreview();
        }
    });
}

function handlePromptItemClick(event) {
    const promptItem = event.target.closest('.prompt-item');
    if (!promptItem) return;

    const promptId = promptItem.dataset.id;

    // Handle preview button click
    const previewBtn = event.target.closest('.preview-prompt-btn');
    if (previewBtn) {
        event.stopPropagation();

        const prompt = state.getPrompts().find(p => p.id === promptId);
        if (prompt) {
            // 同步导入预览管理器，避免异步导致的时序问题
            import('../promptPreview.js').then(module => {
                // 检查是否正在预览同一个提示词
                const isCurrentlyPreviewing = module.previewManager.isPreviewVisible && 
                                             module.previewManager.currentPromptId === promptId;
                
                if (isCurrentlyPreviewing) {
                    // 如果正在预览同一个提示词，则取消预览
                    module.previewManager.immediateHidePreview();
        } else {
                    // 如果未预览或预览的是其他提示词，则显示当前提示词的预览
                    module.previewManager.registerPreviewButton(promptId, previewBtn);
                    module.previewManager.showPreview(prompt, previewBtn);
                }
            }).catch(error => {
                console.error('Failed to load preview module:', error);
            });
        }
        return;
    }

    // 检查当前是否有预览窗口显示
    import('../promptPreview.js').then(module => {
        if (module.previewManager.isPreviewVisible) {
            // 如果有预览窗口显示，第一次点击只取消预览，不执行其他操作
            module.previewManager.immediateHidePreview();
            event.stopPropagation();
            return;
        }
        
        // 如果没有预览窗口，继续执行原有逻辑
        processItemClick();
    });

    function processItemClick() {
    // Handle favorite button click
    const favoriteBtn = event.target.closest('.favorite-btn');
    if (favoriteBtn) {
        event.stopPropagation();
        api.toggleFavorite(promptId).then(response => {
            if (response.success) {
                const { id, isFavorite } = response.data;
                const prompt = state.getPrompts().find(p => p.id === id);
                if (prompt) {
                    prompt.isFavorite = isFavorite;
                }

                // Optimistically update UI
                const icon = favoriteBtn.querySelector('i');
                const span = favoriteBtn.querySelector('span');
                if (icon && span) {
                    icon.classList.toggle('codicon-star-full', isFavorite);
                    icon.classList.toggle('codicon-star-empty', !isFavorite);
                    favoriteBtn.classList.toggle('favorited', isFavorite);
                    favoriteBtn.title = isFavorite ? '取消收藏' : '收藏';
                    span.textContent = isFavorite ? '已收藏' : '收藏';
                }

                // If we are in the favorites category, re-render to update the list
                if (state.getCurrentCategory() === 'favorites') {
                    renderPrompts();
                }
            }
        }).catch(error => {
            console.error('Toggle favorite failed:', error);
            // Revert optimistic UI update on error
            const icon = favoriteBtn.querySelector('i');
            const span = favoriteBtn.querySelector('span');
            if (icon && span) {
                // Find the current state and revert
                const prompt = state.getPrompts().find(p => p.id === promptId);
                const currentFavoriteState = prompt ? prompt.isFavorite : false;
                icon.classList.toggle('codicon-star-full', currentFavoriteState);
                icon.classList.toggle('codicon-star-empty', !currentFavoriteState);
                favoriteBtn.classList.toggle('favorited', currentFavoriteState);
                favoriteBtn.title = currentFavoriteState ? '取消收藏' : '收藏';
                span.textContent = currentFavoriteState ? '已收藏' : '收藏';
            }
        });
        return;
    }
    
    // Handle click on item to edit or select
    if (promptId) {
        // 添加选中状态
        const allItems = document.querySelectorAll('.prompt-item');
        allItems.forEach(item => item.classList.remove('selected'));
        promptItem.classList.add('selected');
        
        showEditForm(promptId, false);
        }
    }
}

function handleCategoryTabClick(e) {
    if (e.target.matches('.category-tab')) {
        hidePreviewIfVisible();
        
        const category = e.target.dataset.category;
        state.filter.category = category;
        updateCategories(); // Re-render tabs to show active state
        renderPrompts(); // Re-render prompts for the selected category
    }
}

function handleSearchInput(e) {
    hidePreviewIfVisible();
    
    state.filter.searchTerm = e.target.value;
    renderPrompts();
}

function handleAddPrompt() {
    hidePreviewIfVisible();
    showEditForm(null, true);
}

function handleCategoryClick(categoryName) {
    state.setCurrentCategory(categoryName);
    const prompts = state.getPrompts();
    let filteredPrompts;
    if (categoryName === 'all') {
        filteredPrompts = prompts;
    } else if (categoryName === 'favorites') {
        filteredPrompts = prompts.filter(p => p.isFavorite);
    } else {
        filteredPrompts = prompts.filter(p => p.category === categoryName);
    }
    renderPrompts();
}

export function init() {
    dom.mainViewElements.promptListContainer.addEventListener('click', handlePromptItemClick);
    dom.mainViewElements.categoryTabsContainer.addEventListener('click', handleCategoryTabClick);
    dom.mainViewElements.manageCategoriesButton.addEventListener('click', () => {
        hidePreviewIfVisible();
        navigateTo('categoryManagement');
    });
    dom.mainViewElements.addPromptButton.addEventListener('click', handleAddPrompt);
    dom.mainViewElements.searchInput.addEventListener('input', handleSearchInput);
    dom.mainViewElements.filterButton.addEventListener('click', () => {
        hidePreviewIfVisible();
        openFilterView();
    });
    dom.mainViewElements.settingsButton.addEventListener('click', () => {
        hidePreviewIfVisible();
        navigateTo('settings');
    });
    
    // 添加键盘快捷键支持
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // 添加收藏按钮的悬停事件监听器
    dom.mainViewElements.promptListContainer.addEventListener('mouseenter', handleFavoriteButtonHover, true);
    dom.mainViewElements.promptListContainer.addEventListener('mouseleave', handleFavoriteButtonHover, true);
}

function handleKeyboardShortcuts(event) {
    // Ctrl+C 或 Cmd+C 在选中提示词时直接复制内容
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        const selectedPromptItem = document.querySelector('.prompt-item.selected');
        if (selectedPromptItem) {
            const promptId = selectedPromptItem.dataset.id;
            // 直接调用API复制，不需要按钮
            api.copyPrompt(promptId);
            event.preventDefault();
        }
    }
    
    // 空格键 或 回车键 在选中提示词时显示预览
    if (event.key === ' ' || event.key === 'Enter') {
        const selectedPromptItem = document.querySelector('.prompt-item.selected');
        if (selectedPromptItem) {
            const promptId = selectedPromptItem.dataset.id;
            const prompt = state.getPrompts().find(p => p.id === promptId);
            if (prompt) {
                event.preventDefault();
                import('../promptPreview.js').then(module => {
                    module.previewManager.showPreview(prompt, selectedPromptItem);
                });
            }
        }
    }
}

function handleFavoriteButtonHover(event) {
    const favoriteBtn = event.target.closest('.favorite-btn');
    if (!favoriteBtn) return;

    const span = favoriteBtn.querySelector('span');
    if (!span) return;

    const promptItem = favoriteBtn.closest('.prompt-item');
    if (!promptItem) return;

    const promptId = promptItem.dataset.id;
    const prompt = state.getPrompts().find(p => p.id === promptId);
    if (!prompt) return;

    if (event.type === 'mouseenter') {
        if (prompt.isFavorite) {
            // 已收藏 -> 悬停时显示"取消收藏"并应用高亮样式
            span.textContent = '取消收藏';
            favoriteBtn.title = '取消收藏';
            favoriteBtn.classList.add('unfavoriting');
            favoriteBtn.classList.remove('favorited');
        } else {
            // 未收藏 -> 悬停时显示"收藏"并应用高亮样式
            span.textContent = '收藏';
            favoriteBtn.title = '收藏';
            favoriteBtn.classList.add('unfavoriting');
        }
    } else if (event.type === 'mouseleave') {
        if (prompt.isFavorite) {
            // 离开时恢复"已收藏"状态
            span.textContent = '已收藏';
            favoriteBtn.title = '取消收藏';
            favoriteBtn.classList.remove('unfavoriting');
            favoriteBtn.classList.add('favorited');
        } else {
            // 离开时恢复"收藏"状态
            span.textContent = '收藏';
            favoriteBtn.title = '收藏';
            favoriteBtn.classList.remove('unfavoriting');
        }
    }
}

export function render() {
    renderPrompts();
} 