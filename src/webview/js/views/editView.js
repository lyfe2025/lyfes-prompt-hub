import { dom, state } from '../state.js';
import { goBack, renderTags, renderCategoryDropdown } from '../uiManager.js';
import * as api from '../api.js';

let refreshCallback = () => {};
let isInitialized = false;

function getAllTagsFromState() {
    if (!state.prompts) return [];
    const allTags = state.prompts.reduce((acc, p) => {
        return p && p.tags ? [...acc, ...p.tags] : acc;
    }, []);
    return [...new Set(allTags)].sort();
}

function renderAvailableTags() {
    const container = dom.editViewElements.allTagsContainer;
    if (!container) return;

    const allTags = getAllTagsFromState();
    const available = allTags.filter(t => !state.currentTags.includes(t));
    container.innerHTML = available.map(tag => `
        <span class="tag-pill available-tag" data-tag="${tag}">
            ${tag}
            <button type="button" class="tag-remove-btn permanent-delete" data-tag="${tag}" title="永久删除该标签">&times;</button>
        </span>
    `).join('');
    container.classList.toggle('hidden', available.length === 0);
}

async function handleAllTagsContainerClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (e.target.classList.contains('permanent-delete')) {
        const tagToDelete = e.target.dataset.tag;
        if (!tagToDelete) return;

        try {
            // 使用VS Code确认对话框而不是原生confirm()
            const confirmed = await api.showConfirmation('确认删除', `确定要从所有提示词中永久删除标签 '${tagToDelete}' 吗？\n\n此操作无法撤销。`);
            if (!confirmed) {
                return;
            }

            // 执行删除操作
            await api.postMessageWithResponse('deleteTag', { name: tagToDelete });
            
            // 主动从后端获取最新数据并更新全局状态
            const response = await api.postMessageWithResponse('getAppData');
            const appData = api.parseAppDataResponse(response);
            
            // 更新全局状态
            state.appData = appData;
            state.prompts = appData.prompts;
            console.log('[EditView] Data refreshed after tag deletion:', state.prompts.length, 'prompts');
            
            // 重新加载标签列表并更新UI
            state.currentTags = state.currentTags.filter(tag => tag !== tagToDelete);
            
            renderTags();
            renderAvailableTags();
            
            // 确保数据刷新完成
            if (refreshCallback) {
                await refreshCallback();
            }

            // 仅在所有操作成功后显示消息
            api.showToast(`标签 '${tagToDelete}' 已被永久删除。`, 'success');

        } catch (err) {
            console.error('删除标签失败:', err);
            api.showToast(`删除标签失败: ${err.message || err}`, 'error');
        }
    } else if (e.target.classList.contains('available-tag')) {
        // 添加标签功能
        const tagToAdd = e.target.dataset.tag;
        if (tagToAdd && !state.currentTags.includes(tagToAdd)) {
            state.currentTags.push(tagToAdd);
            renderTags();
            renderAvailableTags();
        }
    }
}

function handleFormSubmit(event) {
    event.preventDefault();
    const elements = dom.editViewElements;

    const promptData = {
        title: elements.titleInput.value,
        content: elements.promptInput.value,
        category: elements.categorySelect.value.trim() || 'default',
        tags: state.currentTags,
    };
    
    const promptId = elements.idInput.value;
    if (promptId) {
        promptData.id = parseInt(promptId, 10);
    }

    api.postMessageWithResponse('savePrompt', { prompt: promptData })
        .then(async () => {
            // 主动从后端获取最新数据并更新全局状态
            const response = await api.postMessageWithResponse('getAppData');
            const appData = api.parseAppDataResponse(response);
            
            // 更新全局状态
            state.appData = appData;
            state.prompts = appData.prompts;
            console.log('[EditView] Data refreshed after prompt save:', state.prompts.length, 'prompts');
            
            // 确保数据刷新完成后再返回首页
            if (refreshCallback) {
                await refreshCallback();
            }
            goBack();
        })
        .catch(err => {
            console.error('Save failed:', err);
            api.showToast(`保存失败: ${err.message}`, 'error');
        });
}

function handleCancel(e) {
    e.preventDefault();
    goBack();
}

function handleTagInput(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const tag = e.target.value.trim();
        if (tag && !state.currentTags.includes(tag)) {
            state.currentTags.push(tag);
            renderTags();
            renderAvailableTags();
        }
        e.target.value = '';
    }
}

function handleTagPillRemove(e) {
    if (e.target.classList.contains('tag-remove-btn')) {
        e.preventDefault();
        e.stopPropagation();
        
        const tagToRemove = e.target.dataset.tag;
        state.currentTags = state.currentTags.filter(tag => tag !== tagToRemove);
        
        renderTags();
        renderAvailableTags();
    }
}

function handleCategoryDropdownInteraction(e) {
    const { categoryWrapper, categoryDropdownMenu, categorySelect } = dom.editViewElements;

    if (e.target.classList.contains('dropdown-item')) {
        categorySelect.value = e.target.dataset.value;
        categoryDropdownMenu.classList.add('hidden');
        return;
    }

    if (categoryWrapper.contains(e.target)) {
        renderCategoryDropdown();
        categoryDropdownMenu.classList.toggle('hidden');
    } 
    else {
        categoryDropdownMenu.classList.add('hidden');
    }
}

async function handleDeletePrompt(e) {
    e.preventDefault();
    e.stopPropagation();

    const promptId = dom.editViewElements.idInput.value;
    if (!promptId) {
        api.showToast('无法获取提示词 ID', 'error');
        return;
    }

    try {
        const confirmed = await api.showConfirmation('确认删除', '确定要删除这个提示词吗？此操作无法撤销。');
        if (!confirmed) {
            return;
        }

        await api.postMessageWithResponse('deletePrompt', { id: parseInt(promptId, 10) });
        
        // 主动从后端获取最新数据并更新全局状态
        const response = await api.postMessageWithResponse('getAppData');
        const appData = api.parseAppDataResponse(response);
        
        // 更新全局状态
        state.appData = appData;
        state.prompts = appData.prompts;
        console.log('[EditView] Data refreshed after prompt deletion:', state.prompts.length, 'prompts');
        
        // 确保数据刷新完成后再返回首页
        if (refreshCallback) {
            await refreshCallback();
        }
        goBack();
        api.showToast('提示词已删除。');

    } catch (error) {
        console.error('删除提示词失败:', error);
        api.showToast(`删除失败: ${error.message}`, 'error');
    }
}

export function render() {
    renderAvailableTags();
}

export { renderAvailableTags };

export async function init(refreshFunc) {
    if (isInitialized) return;

    if (refreshFunc) {
        refreshCallback = refreshFunc;
    }

    const { editViewElements: elements } = dom;

    elements.form.addEventListener('submit', handleFormSubmit);
    elements.cancelButton.addEventListener('click', handleCancel);
    elements.tagsInput.addEventListener('keydown', handleTagInput);
    elements.deleteButton.addEventListener('click', handleDeletePrompt);
    
    dom.tagPillsContainer.addEventListener('click', handleTagPillRemove);
    elements.allTagsContainer.addEventListener('click', handleAllTagsContainerClick);
    document.addEventListener('click', handleCategoryDropdownInteraction);

    await renderAvailableTags();
    isInitialized = true;
}