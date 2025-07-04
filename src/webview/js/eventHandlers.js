import { state, dom } from './state.js';
import { postMessageWithResponse } from './api.js';
import * as api from './api.js';
import * as ui from './uiManager.js';
import { renderBackupList } from './views/settings/backupManagementView.js';
import { openFilterView } from './views/filterView.js';

// A helper function for data-related actions
async function handleDataAction(action, messages = {}, payload = {}) {
    const {
        loading = '正在处理...',
        success = '操作成功！',
        error = '操作失败，请重试'
    } = messages;

    try {
        const response = await postMessageWithResponse(action, payload);
        // Use VS Code notifications for success
        postMessageWithResponse('showNotification', { message: success, type: 'info' });
        return response;
    } catch (err) {
        console.error(`${action} failed:`, err);
        // Use VS Code notifications for error
        postMessageWithResponse('showNotification', { message: err.message || error, type: 'error' });
        throw err; // Re-throw for further handling if needed
    }
}

// --- Event Handler Functions ---

async function fetchAndRenderSettingsStatus() {
    try {
        const response = await postMessageWithResponse('getSystemStatus');
        if (response.data) {
            ui.renderSettingsStatus(response.data);
        }
    } catch (error) {
        console.error("Error fetching system status:", error);
        api.showToast('无法获取系统状态', 'error');
    }
}

async function refreshBackupList() {
    try {
        const response = await api.listBackups();
        // 确保从响应中提取备份数组
        const backups = response.data || response || [];
        // 确保 backups 是数组
        if (Array.isArray(backups)) {
            renderBackupList(backups);
        } else {
            console.error('Backups data is not an array:', backups);
            renderBackupList([]);
        }
    } catch (error) {
        console.error('Failed to refresh backup list:', error);
        api.showToast(`刷新备份列表失败: ${error.message}`, 'error');
    }
}

// --- Main Initializer ---

export function initEventListeners() {
    // Event delegation for dynamically created elements
    document.body.addEventListener('click', e => {
        const target = e.target;

        // Specific handler for backup view's back button
        if (target.closest('#back-from-backup-btn')) {
            ui.navigateToSettings();
            return;
        }

        // Back buttons
        if (target.closest('.btn-back')) {
            ui.goBack();
            return;
        }

        // --- Main View ---
        if (target.closest('#add-prompt-btn')) {
            ui.showEditForm(null, true);
        }
        if (target.closest('#manage-categories-btn')) {
            ui.navigateTo('categoryManagement');
        }
        if (target.closest('#settings-btn')) {
            fetchAndRenderSettingsStatus();
            ui.navigateTo('settings');
        }
         if (target.closest('#filter-btn')) {
            // 调用 openFilterView 函数来正确初始化筛选视图
            openFilterView();
        }

        // --- Settings View ---
        if (target.closest('#show-storage-info-btn')) {
            api.postMessageWithResponse('getStorageInfo')
                .catch(err => api.showToast(`获取存储信息失败: ${err.message}`, 'error'));
        }
        if (target.closest('#manage-backups-btn')) {
            refreshBackupList();
            ui.navigateTo('backupManagement');
        }
        if (target.closest('#restore-backup-from-file-btn')) {
            api.restoreBackupFromFile();
        }
        if (target.closest('#create-backup-btn')) {
            api.createBackup().then(() => {
                api.showToast('备份已创建');
            }).catch(err => {
                api.showToast(`备份失败: ${err.message}`, 'error');
            });
        }

        // --- Backup Management View ---
        if (target.closest('#refresh-backup-list-btn')) {
            refreshBackupList();
        }

        const backupManagementView = target.closest('#backup-management-view');
        if (backupManagementView) {
            const card = target.closest('.backup-item-card');
            if (!card) return;

            const filename = decodeURIComponent(card.dataset.filename);
            // 只取纯文件名（去除 .json/.json.bak）用于输入框
            const displayName = filename.replace(/^backup-/, '').replace(/\.json$|\.json\.bak$/i, '');
            const input = card.querySelector('.backup-name-input');

            const setEditingMode = (isEditing) => {
                card.classList.toggle('editing', isEditing);
                card.querySelector('.backup-name-display').classList.toggle('hidden', isEditing);
                card.querySelector('.backup-name-edit').classList.toggle('hidden', !isEditing);
                card.querySelector('.backup-actions-display').classList.toggle('hidden', isEditing);
                card.querySelector('.backup-actions-edit').classList.toggle('hidden', !isEditing);
                if (isEditing) {
                    // 编辑时只显示纯文件名
                    input.value = displayName;
                    input.focus();
                    input.select();
                } else {
                    // 取消时恢复为原 displayName
                    input.value = displayName;
                }
            };

            const handleSave = () => {
                let newName = input.value.trim();
                // 校验：不允许输入 .json 后缀
                newName = newName.replace(/\.json$/i, '');
                if (!newName) {
                    api.showToast('文件名不能为空', 'error');
                    setEditingMode(true);
                    return;
                }
                // 只允许字母、数字、连字符、中文
                if (!/^[a-zA-Z0-9\-\u4e00-\u9fa5]+$/.test(newName)) {
                    api.showToast('文件名只能包含字母、数字、连字符或中文', 'error');
                    setEditingMode(true);
                    return;
                }
                // 自动补全 .json 后缀
                const newFullName = newName + '.json';
                if (newFullName !== filename) {
                    api.renameBackup(filename, newFullName).then(() => {
                        api.showToast('备份已成功重命名。');
                        refreshBackupList();
                    }).catch(err => {
                        api.showToast(`重命名失败: ${err.message}`, 'error');
                        setEditingMode(false);
                    });
                } else {
                    setEditingMode(false);
                }
            };
            
            if (target.closest('.rename-backup-btn')) {
                setEditingMode(true);
            } else if (target.closest('.cancel-rename-btn')) {
                setEditingMode(false);
            } else if (target.closest('.save-rename-btn')) {
                handleSave();
            } else if (target.closest('.restore-backup-btn')) {
                api.showConfirmation('确认恢复', `您确定要使用备份文件 "${filename}" 恢复您的数据吗？此操作将覆盖所有当前数据，且无法撤销。`)
                    .then(confirmed => {
                        if (confirmed) {
                            api.restoreBackup(filename).then(async () => {
                                // 主动从后端获取最新数据并更新全局状态
                                const response = await api.postMessageWithResponse('getAppData');
                                const appData = api.parseAppDataResponse(response);
                                
                                // 更新全局状态
                                state.appData = appData;
                                state.prompts = appData.prompts;
                                console.log('[EventHandlers] Data refreshed after backup restore:', state.prompts.length, 'prompts');
                                
                                api.showToast('数据已成功恢复。应用将重新加载。');
                            }).catch(err => {
                                api.showToast(`恢复失败: ${err.message}`, 'error');
                            });
                        }
                    });
            } else if (target.closest('.delete-backup-btn')) {
                api.showConfirmation('确认删除', `您确定要删除备份文件 "${filename}" 吗？此操作无法撤销。`)
                    .then(confirmed => {
                        if (confirmed) {
                            api.deleteBackup(filename).then(() => {
                                api.showToast('备份已删除。');
                                refreshBackupList();
                            }).catch(err => {
                                api.showToast(`删除失败: ${err.message}`, 'error');
                            });
                        }
                    });
            } 
            
            if (input === document.activeElement) {
                input.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        handleSave();
                    } else if (e.key === 'Escape') {
                        setEditingMode(false);
                    }
                };
            }
        }

        // Category tabs
        const categoryTab = target.closest('.category-tab');
        if (categoryTab) {
            state.filter.category = categoryTab.dataset.category;
            ui.updateCategories();
            ui.renderPrompts();
            return;
        }

        // Prompt item click (for editing)
        const promptItem = target.closest('.prompt-item');
        if (promptItem) {
            const promptId = promptItem.dataset.id;
            // Prevent edit form from opening when clicking the toggle switch
            if (!target.closest('.switch')) {
                ui.showEditForm(promptId);
            }
            return;
        }

        // Tag pill removal
        const removeBtn = target.closest('.tag-remove-btn');
        if (removeBtn) {
            const tagToRemove = removeBtn.dataset.tag;
            state.currentTags = state.currentTags.filter(t => t !== tagToRemove);
            ui.renderTags();
            return;
        }

        // Add tag from all-tags-container
        if (target.matches('.all-tags-container .tag')) {
            // Get the pure tag name, removing the "×" and any whitespace
            const tagName = target.textContent.replace(/s*×s*$/, '').trim();
            if (tagName && !state.currentTags.includes(tagName)) {
                state.currentTags.push(tagName);
                ui.renderTags();
            }
            return;
        }
        
        // --- Category Management View ---
        // 分类管理的事件处理已在 categoryView.js 中完整实现
        // 移除这里的空处理器以避免事件冲突
    });

    // Direct event listeners for non-dynamic elements
    
    // Search input
    document.getElementById('search-input').addEventListener('input', e => {
        state.filter.searchTerm = e.target.value;
        ui.renderPrompts();
    });

    // --- Filter View controls ---
    document.getElementById('filter-apply-btn')?.addEventListener('click', () => {
        state.filter = { ...state.stagedFilter };
        ui.renderAll();
        ui.goBack();
    });

    document.getElementById('filter-reset-btn')?.addEventListener('click', () => {
        state.stagedFilter = { searchTerm: '', sortBy: 'newest', category: 'all', selectedTags: [] };
        ui.updateFilterView();
    });
    
    document.getElementById('tag-filter-options')?.addEventListener('click', e => {
        const tagBtn = e.target.closest('.filter-btn');
         if (tagBtn) {
            // 确保 stagedFilter 已初始化
            if (!state.stagedFilter) {
                state.stagedFilter = { searchTerm: '', sortBy: 'newest', category: 'all', selectedTags: [] };
            }
            
            const tag = tagBtn.dataset.tag;
            const selectedTags = state.stagedFilter.selectedTags || [];

            const index = selectedTags.indexOf(tag);
            if (index > -1) {
                // If tag is already selected, deselect it
                selectedTags.splice(index, 1);
            } else {
                // Otherwise, add it
                selectedTags.push(tag);
            }
            
            state.stagedFilter.selectedTags = selectedTags;
            ui.updateFilterView();
        }
    });
}
