import * as api from '../../api.js';
import { navigateTo } from '../../uiManager.js';

/**
 * 数据管理模块 - 负责处理导入、导出、备份、恢复等数据管理功能
 * 
 * 职责：
 * - 处理数据导入和导出
 * - 管理数据备份和恢复
 * - 提供数据管理相关的UI交互
 */

let isInitialized = false;

// 将所有事件处理函数具名化，以便可以移除它们
const handlers = {
    handleImportClick: () => {
        const importInput = document.getElementById('import-file-input');
        if (importInput) {
            importInput.click();
        }
    },
    handleImportChange: (event) => {
        const files = event.target.files;
        if (files.length === 0) return;
        const file = files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                await api.postMessageWithResponse('importData', { data: e.target.result });
                
                // 主动从后端获取最新数据并更新全局状态
                const response = await api.postMessageWithResponse('getAppData');
                const appData = api.parseAppDataResponse(response);
                
                // 更新全局状态
                const { state } = await import('../../state.js');
                state.appData = appData;
                state.prompts = appData.prompts;
                console.log('[DataManagement] Data refreshed after import:', state.prompts.length, 'prompts');
                
                api.showToast('数据导入成功！', 'success');
                // 清空文件输入框，以便可以重复导入同一个文件
                event.target.value = '';
            } catch (err) {
                api.showToast(`导入失败: ${err.message}`, 'error');
                // 清空文件输入框
                event.target.value = '';
            }
        };
        reader.onerror = () => {
            api.showToast('文件读取失败，请检查文件是否有效', 'error');
            event.target.value = '';
        };
        reader.readAsText(file);
    },
    handleExport: () => {
        api.postMessageWithResponse('exportData')
            .catch(err => api.showToast(`导出失败: ${err.message}`, 'error'));
    },
    handleBackup: () => {
        api.postMessageWithResponse('backupData')
            .then(result => {
                if (result && result.path) {
                    api.showToast(`备份已创建: ${result.path}`, 'success');
                }
            })
            .catch(err => api.showToast(`备份失败: ${err.message}`, 'error'));
    },
    handleRestore: () => {
        navigateTo('backupManagement');
    }
};

/**
 * 这是一个幂等的辅助函数，用于绑定事件。
 * 它会先移除旧的监听器，再添加新的，确保每个元素只有一个监听器。
 * @param {string} id - 元素ID
 * @param {string} event - 事件名称 (e.g., 'click')
 * @param {Function} handler - 事件处理函数
 */
function bindEvent(id, event, handler) {
    const element = document.getElementById(id);
    if (element) {
        // 为了确保移除成功，我们用克隆节点的方式替换原节点
        const newElement = element.cloneNode(true);
        element.parentNode.replaceChild(newElement, element);
        newElement.addEventListener(event, handler);
    }
}

/**
 * 获取数据管理相关的DOM元素
 * @returns {Object} DOM元素对象
 */
function getElements() {
    return {
        importButton: document.getElementById('import-btn'),
        importInput: document.getElementById('import-file-input'),
        exportButton: document.getElementById('export-btn'),
        createBackupButton: document.getElementById('create-backup-btn'),
        restoreBackupButton: document.getElementById('restore-backup-btn')
    };
}

/**
 * 初始化数据管理模块
 * - 绑定事件监听器
 * - 设置UI交互逻辑
 */
export function init() {
    const elements = getElements();
    
    // 绑定事件监听器
    bindEvent('import-btn', 'click', handlers.handleImportClick);
    bindEvent('import-file-input', 'change', handlers.handleImportChange);
    bindEvent('export-btn', 'click', handlers.handleExport);
    bindEvent('create-backup-btn', 'click', handlers.handleBackup);
    bindEvent('restore-backup-btn', 'click', handlers.handleRestore);
}

// For compatibility, export original functions if they are needed elsewhere
export const handleImport = handlers.handleImportChange;
export const handleExport = handlers.handleExport;
export const handleBackup = handlers.handleBackup;
export const handleRestore = handlers.handleRestore;

// reset function is no longer needed as init is idempotent
export function reset() {} 