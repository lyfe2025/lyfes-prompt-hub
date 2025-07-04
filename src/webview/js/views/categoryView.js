import { dom, state } from '../state.js';
import * as api from '../api.js';
import { goBack } from '../uiManager.js';

let refreshCallback = () => {};

function createCategoryItemElement(categoryName, isEditing = false, isNew = false) {
    const item = document.createElement('div');
    item.className = 'category-manage-item';
    if (isNew) {
        item.classList.add('new-category-item');
    }
    item.dataset.categoryName = categoryName || '';

    const displayName = categoryName || '';

    item.innerHTML = `
        <div class="category-name-wrapper">
            <span class="category-name ${isEditing ? 'hidden' : ''}">${displayName}</span>
            <input type="text" class="category-input ${isEditing ? '' : 'hidden'}" value="${displayName}" placeholder="输入分类名称" />
        </div>
        <div class="category-manage-actions">
            <button class="btn-icon btn-save ${isEditing ? '' : 'hidden'}" title="保存">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
            </button>
            <button class="btn-icon btn-cancel ${isEditing ? '' : 'hidden'}" title="取消">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
            </button>
            <button class="btn-icon btn-delete" title="删除">
                 <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.5 3h3v1h-1v9.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 4 13.5V4h-1V3h3V2.5A1.5 1.5 0 0 1 7.5 1h1A1.5 1.5 0 0 1 10 2.5v.5Zm-4 1h-1v9.5a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5V4h-1v9H6.5V4Zm2-1.5V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5V3h2Z"/></svg>
            </button>
        </div>
    `;
    return item;
}

function handleAddCategory() {
    const { categoryViewElements: elements } = dom;
    const container = elements ? elements.container : null;
    if (!container) return;

    if (container.querySelector('.new-category-item')) {
        container.querySelector('.new-category-item .category-input').focus();
        return;
    }

    const newItem = createCategoryItemElement('', true, true);
    container.prepend(newItem);
    newItem.querySelector('.category-input').focus();
}

async function handleDeleteCategory(categoryName) {
    try {
        const confirmed = await api.showConfirmation('确认删除', `确定要删除分类 "${categoryName}" 吗？`);
        if (!confirmed) return;

        console.log('[CategoryView] Deleting category:', categoryName);
        await api.postMessageWithResponse('deleteCategory', { name: categoryName });
        
        api.showToast(`分类 "${categoryName}" 已成功删除。`, 'success');

        // 主动从后端获取最新数据并更新全局状态
        console.log('[CategoryView] Fetching latest data after deletion...');
        const response = await api.postMessageWithResponse('getAppData');
        const appData = api.parseAppDataResponse(response);
        
        // 更新全局状态
        state.appData = appData;
        state.prompts = appData.prompts;
        
        console.log('[CategoryView] Updated global state - categories:', state.appData.categories.length, 'prompts:', state.prompts.length);
        console.log('[CategoryView] Categories list:', state.appData.categories);

        // 重新渲染分类列表
        console.log('[CategoryView] Re-rendering category list...');
        render();
        
        // 调用刷新回调，更新其他界面组件
        if (refreshCallback) {
            console.log('[CategoryView] Calling refresh callback...');
            refreshCallback();
        }
        
        console.log('[CategoryView] Category deletion completed successfully');
        
    } catch (error) {
        console.error('[CategoryView] 删除分类失败:', error);
        api.showToast(error.message || '删除分类失败，请重试。', 'error');
    }
}

function toggleEditMode(item, isEditing) {
    if (!item) return;
    
    const nameSpan = item.querySelector('.category-name');
    const input = item.querySelector('.category-input');
    
    const saveBtn = item.querySelector('.btn-save');
    const cancelBtn = item.querySelector('.btn-cancel');

    if (nameSpan) nameSpan.classList.toggle('hidden', isEditing);
    if (input) input.classList.toggle('hidden', !isEditing);
    if (saveBtn) saveBtn.classList.toggle('hidden', !isEditing);
    if (cancelBtn) cancelBtn.classList.toggle('hidden', !isEditing);

    if (isEditing && input) {
        input.focus();
        input.select();
    }
}

async function handleCategoryListClick(e) {
    const item = e.target.closest('.category-manage-item');
    if (!item) return;

    const originalName = item.dataset.categoryName;
    const isNewItem = item.classList.contains('new-category-item');

    if (e.target.closest('.category-name')) {
        toggleEditMode(item, true);
        return;
    }
    
    if (e.target.closest('.btn-cancel')) {
        if (isNewItem) {
            item.remove();
        } else {
            const input = item.querySelector('.category-input');
            if (input) input.value = originalName;
            toggleEditMode(item, false);
        }
        return;
    }

    if (e.target.closest('.btn-save')) {
        const input = item.querySelector('.category-input');
        if (!input) return;

        const newName = input.value.trim();
        if (!newName) {
            api.showToast('分类名称不能为空', 'error');
            return;
        }

        try {
            let result;
            if (isNewItem) {
                result = await api.postMessageWithResponse('addCategory', { name: newName });
            } else if (newName !== originalName) {
                result = await api.postMessageWithResponse('renameCategory', { oldName: originalName, newName: newName });
            } else {
                result = true; // 没有变化，直接成功
            }

            if (result) {
                const message = isNewItem ? '分类已添加' : (newName !== originalName ? '分类已重命名' : '');
                if (message) api.showToast(message, 'success');
                
                // 主动从后端获取最新数据并更新全局状态
                const response = await api.postMessageWithResponse('getAppData');
                const appData = api.parseAppDataResponse(response);
                
                // 更新全局状态
                state.appData = appData;
                state.prompts = appData.prompts;
                console.log('[CategoryView] Data refreshed after category operation:', state.appData.categories.length, 'categories');

                // 重新渲染分类列表
                render();
                
                // 调用刷新回调，更新其他界面组件
                if (refreshCallback) refreshCallback();
            }
        } catch (err) {
            const action = isNewItem ? '添加' : '重命名';
            api.showToast(`${action}失败: ${err.message}`, 'error');
            if (!isNewItem) {
                toggleEditMode(item, false);
            }
        }
        return;
    }

    if (e.target.closest('.btn-delete')) {
        if (isNewItem) {
            item.remove();
            return;
        }
        await handleDeleteCategory(originalName);
    }
}

export function init(refreshFunc) {
    if (refreshFunc) {
        refreshCallback = refreshFunc;
    }
    const { categoryViewElements: elements } = dom;
    if (elements && elements.addCategoryButton) {
        elements.addCategoryButton.addEventListener('click', handleAddCategory);
    }
    if (elements && elements.backButton) {
        elements.backButton.addEventListener('click', goBack);
    }
    if (elements && elements.container) {
        elements.container.addEventListener('click', handleCategoryListClick);
    }
    
    // Initial load
    render();
}

export function render() {
    console.log('[CategoryView] Starting render...');
    console.log('[CategoryView] Current state.appData:', state.appData);
    
    const { categoryViewElements: elements } = dom;
    const container = elements ? elements.container : null;

    if (!container) {
        console.error("[CategoryView] Category view container not found!");
        return;
    }

    // 确保state.appData存在并且有categories数组
    if (!state.appData) {
        console.warn('[CategoryView] state.appData is null, showing loading message');
        container.innerHTML = '<div class="no-categories-message">正在加载分类数据...</div>';
        return;
    }

    const categories = state.appData.categories;
    if (!Array.isArray(categories)) {
        console.error('[CategoryView] categories is not an array:', categories);
        console.error('[CategoryView] Full appData structure:', state.appData);
        container.innerHTML = '<div class="no-categories-message">分类数据格式错误</div>';
        return;
    }

    console.log('[CategoryView] Rendering categories:', categories.length, 'categories:', categories);
    
    container.innerHTML = ''; // Clear the list first
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="no-categories-message">暂无分类</div>';
        return;
    }
    
    categories.forEach((category, index) => {
        console.log(`[CategoryView] Creating item for category ${index}:`, category);
        const item = createCategoryItemElement(category);
        container.appendChild(item);
    });
    
    console.log('[CategoryView] Rendered', container.children.length, 'category items');
} 