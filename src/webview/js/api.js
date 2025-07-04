import { state } from './state.js';
import { showSettingsSaveStatus } from './uiManager.js';

/**
 * Sends a message to the extension backend and returns a Promise that resolves with the response.
 * @param {string} type The message type/command.
 * @param {object} payload The data to send with the message.
 * @returns {Promise<any>} A promise that resolves with the backend's response.
 */
export function postMessageWithResponse(type, payload = {}) {
    return new Promise((resolve, reject) => {
        const requestId = `webview-${state.requestIdCounter++}`;
        state.pendingRequests.set(requestId, { resolve, reject, type });
        state.vscode.postMessage({ type, requestId, payload });
    });
}

/**
 * Initializes the main message listener to handle responses from the extension.
 */
export function initializeApiListener() {
    window.addEventListener('message', event => {
        const message = event.data;
        const { requestId, type, ...response } = message;

        // Handle responses to requests initiated by the webview
        if (requestId && state.pendingRequests.has(requestId)) {
            const { resolve, reject, type: requestType } = state.pendingRequests.get(requestId);
            state.pendingRequests.delete(requestId);
            
            console.log(`[API] Received response for ${requestType} (${requestId}):`, message);
            
            if (response.success === false || message.success === false) {
                const errorMsg = (response.data && response.data.error) || 
                                response.error || 
                                response.message || 
                                message.error ||
                                `操作 '${requestType}' 失败`;
                console.error(`[API] Request ${requestType} (${requestId}) failed:`, errorMsg);
                console.error('[API] Full error response:', message);
                reject(new Error(errorMsg));
            } else {
                resolve(response);
            }
        // Handle messages initiated by the backend (e.g., manual refresh)
        } else if (!requestId) { 
            // This handles older, non-request-response messages
            if (message.command === 'settingsSaved') {
                showSettingsSaveStatus(true);
                return;
            }
            if (message.command === 'settingsSaveFailed') {
                showSettingsSaveStatus(false, message.message);
                return;
            }

            if (type === 'appDataResponse') {
                // 处理后端推送的应用数据，无论是否为刷新
                console.log('[API] Received app data from backend:', message.data);
                window.dispatchEvent(new CustomEvent('manualRefresh', { detail: message.data }));
            } else if (type === 'error') {
                console.error('Received an error from the backend:', message.message);
                window.dispatchEvent(new CustomEvent('backendError', { detail: message.message }));
            }
        }
    });
}

// 这是个 "fire-and-forget" 的消息，不期待回复
export function showNotification(message, type = 'info') {
    state.vscode.postMessage({
        type: 'showNotification',
        payload: { message, type }
    });
}

// `showToast` is an alias for `showNotification` for semantic clarity in the views.
export const showToast = showNotification;

/**
 * 显示确认对话框
 * @param {string} title 对话框标题
 * @param {string} message 确认消息
 * @returns {Promise<boolean>} 用户是否确认
 */
export async function showConfirmation(title, message) {
    const response = await postMessageWithResponse('showConfirmation', { title, message });
    return response.confirmed;
}

/**
 * Saves the cloud sync settings.
 * @param {object} settings The sync settings to save.
 * @returns {Promise<any>}
 */
export function saveSyncSettings(settings) {
    console.log('[API] saveSyncSettings called with:', {
        provider: settings.provider,
        tokenLength: settings.token ? settings.token.length : 0,
        hasGistId: !!settings.gistId,
        hasGitlabUrl: !!settings.gitlabUrl,
        hasWebdavUrl: !!settings.webdavUrl,
        hasCustomApiUrl: !!settings.customApiUrl
    });
    
    console.log('[API] Sending request to backend...');
    const result = postMessageWithResponse('webview:saveCloudSyncSettings', settings);
    
    // 包装Promise以添加日志
    return result.then(response => {
        console.log('[API] Backend response received successfully:', {
            success: response.success,
            hasData: !!response.data,
            errorMessage: response.error || 'none'
        });
        return response;
    }).catch(error => {
        console.error('[API] Backend request failed:', {
            message: error.message || 'No message',
            name: error.name || 'Unknown',
            toString: error.toString()
        });
        throw error;
    });
}

export function showQuickPick(items, placeholder) {
    return postMessageWithResponse('showQuickPick', { items, placeholder });
}

// --- Backup Management API ---

export function createBackup() {
    return postMessageWithResponse('createBackup');
}

export function restoreBackupFromFile() {
    return postMessageWithResponse('restoreBackupFromFile');
}

export function listBackups() {
    return postMessageWithResponse('listBackups');
}

export function renameBackup(oldName, newName) {
    return postMessageWithResponse('renameBackup', { oldName, newName });
}

export function restoreBackup(fileName) {
    return postMessageWithResponse('restoreBackup', { fileName });
}

export function deleteBackup(fileName) {
    return postMessageWithResponse('deleteBackup', { fileName });
}

export function showRenameInputBox(options) {
    return postMessageWithResponse('showRenameInputBox', { options });
}

/**
 * 发送不需要回复的消息给后端
 * @param {string} type 消息类型
 * @param {object} payload 消息负载
 */
export function postMessage(type, payload = {}) {
    state.vscode.postMessage({ type, payload });
}

/**
 * 统一解析getAppData响应的辅助函数
 * @param {any} response API响应对象
 * @returns {object} 解析后的appData对象
 * @throws {Error} 如果响应格式无效
 */
export function parseAppDataResponse(response) {
    console.log('[API] Parsing app data response:', response);
    
    // 正确解析响应数据
    let appData;
    if (response && response.data) {
        appData = response.data;
    } else if (response && response.prompts) {
        // 直接是appData格式
        appData = response;
    } else {
        console.error('[API] Invalid response structure:', response);
        throw new Error('获取数据失败：响应格式错误');
    }
    
    console.log('[API] Parsed app data:', appData);
    
    // 验证数据结构
    if (!appData || typeof appData !== 'object') {
        console.error('[API] Invalid app data structure:', appData);
        throw new Error('获取数据失败：数据结构错误');
    }
    
    // 返回安全的数据结构
    return {
        prompts: Array.isArray(appData.prompts) ? appData.prompts : [],
        categories: Array.isArray(appData.categories) ? appData.categories : [],
        settings: appData.settings || {},
        metadata: appData.metadata || { version: '1.0.0', lastModified: new Date().toISOString(), totalPrompts: 0 }
    };
}

export function toggleFavorite(promptId) {
    return postMessageWithResponse('toggleFavorite', { id: promptId });
}

// 用于跟踪正在进行的复制请求，防止重复调用
const copyRequestsInProgress = new Set();

export function copyPrompt(promptId) {
    // 防止同一个提示词的重复复制请求
    if (copyRequestsInProgress.has(promptId)) {
        console.log(`[API] 复制请求进行中，忽略重复请求: ${promptId}`);
        return Promise.resolve();
    }

    copyRequestsInProgress.add(promptId);
    
    try {
        postMessage('copyPrompt', { id: promptId });
        console.log(`[API] 发送复制请求: ${promptId}`);
    } catch (error) {
        console.error(`[API] 复制请求失败: ${promptId}`, error);
    }

    // 1.5秒后清除请求标记，允许再次复制
    setTimeout(() => {
        copyRequestsInProgress.delete(promptId);
        console.log(`[API] 复制请求完成，移除标记: ${promptId}`);
    }, 1500);
}
