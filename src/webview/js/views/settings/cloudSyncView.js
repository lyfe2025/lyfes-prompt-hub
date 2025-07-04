import { dom, state } from '../../state.js';
import * as api from '../../api.js';
import { renderSettingsStatus } from '../../uiManager.js';

/**
 * 云同步模块 - 负责处理所有云同步相关功能
 * 
 * 职责：
 * - 管理云同步开关和配置
 * - 处理各种同步提供商的配置
 * - 执行同步操作（上传/下载）
 * - 管理自动同步设置
 * - 提供云同步相关的UI交互
 */

let isInitialized = false;

/**
 * 检查提供商配置是否完整
 * @param {Object} settings - 设置对象
 * @param {string} provider - 提供商名称
 * @returns {boolean} 配置是否完整
 */
function checkProviderConfiguration(settings, provider) {
    console.log('[CloudSync] checkProviderConfiguration called with:', {
        settings: settings ? {
            cloudSync: settings.cloudSync,
            syncProvider: settings.syncProvider,
            gistId: settings.gistId,
            webdavUrl: settings.webdavUrl,
            webdavUsername: settings.webdavUsername,
            customApiUrl: settings.customApiUrl,
            isValidated: settings.isValidated
        } : null,
        provider
    });

    if (!settings || !provider || provider === 'disabled') {
        console.log('[CloudSync] Configuration check failed: Invalid basic parameters');
        return false;
    }
    
    // 首先检查云同步是否启用
    if (!settings.cloudSync) {
        console.log('[CloudSync] Configuration check failed: cloudSync is disabled');
        return false;
    }
    
    let result = false;
    switch (provider) {
        case 'github':
        case 'gitee':
        case 'gitlab':
            // 对于基于Gist/Snippet的服务，如果有gistId就认为配置完整
            // 这样可以兼容旧数据（即使isValidated为false）
            result = !!(settings.gistId && settings.gistId.trim());
            console.log('[CloudSync] Git-based provider check:', {
                provider,
                gistId: settings.gistId,
                result
            });
            break;
        case 'webdav':
            result = !!(settings.webdavUrl && settings.webdavUrl.trim() && 
                       settings.webdavUsername && settings.webdavUsername.trim());
            console.log('[CloudSync] WebDAV provider check:', {
                webdavUrl: settings.webdavUrl,
                webdavUsername: settings.webdavUsername,
                result
            });
            break;
        case 'custom':
            result = !!(settings.customApiUrl && settings.customApiUrl.trim());
            console.log('[CloudSync] Custom provider check:', {
                customApiUrl: settings.customApiUrl,
                result
            });
            break;
        default:
            console.log('[CloudSync] Configuration check failed: Unknown provider');
            result = false;
    }
    
    console.log('[CloudSync] Final configuration check result:', result);
    return result;
}

/**
 * 显示指定提供商的配置界面
 * @param {string} provider - 同步提供商名称
 */
function showProviderConfig(provider) {
    // 首先隐藏所有提供商配置
    const { settingsViewElements: elements } = dom;
    Object.values(elements).forEach(el => {
        if (el && el.container && el.container.classList.contains('provider-config')) {
            el.container.classList.add('hidden');
        }
    });

    // 显示选中的配置界面
    switch (provider) {
        case 'github':
            elements.githubConfig.container.classList.remove('hidden');
            break;
        case 'gitee':
            elements.giteeConfig.container.classList.remove('hidden');
            break;
        case 'gitlab':
            elements.gitlabConfig.container.classList.remove('hidden');
            break;
        case 'webdav':
            elements.webdavConfig.container.classList.remove('hidden');
            break;
        case 'custom':
            elements.customConfig.container.classList.remove('hidden');
            break;
        default:
            // 没有特定配置需要显示
            break;
    }
}

/**
 * 处理同步提供商变更
 * @param {Event} event - 事件对象
 */
function handleProviderChange(event) {
    const value = event.target.dataset.value;
    if (value) {
        const { settingsViewElements: elements } = dom;
        elements.syncProviderSelect.value = value;
        
        // 更新显示文本
        const providerNames = {
            'github': 'GitHub Gist',
            'gitee': 'Gitee Gist',
            'gitlab': 'GitLab Snippets',
            'webdav': 'WebDAV',
            'custom': 'Custom API'
        };
        elements.syncProviderSelect.value = providerNames[value] || value;
        elements.syncProviderSelect.dataset.value = value;
        
        // 隐藏下拉菜单
        elements.syncProviderDropdownMenu.classList.add('hidden');
        
        showProviderConfig(value);
    }
}

/**
 * 处理同步提供商下拉菜单交互
 * @param {Event} event - 事件对象
 */
function handleProviderDropdownInteraction(event) {
    const { settingsViewElements: elements } = dom;
    const { syncProviderSelect, syncProviderDropdownMenu } = elements;

    if (event.target.classList.contains('dropdown-item')) {
        handleProviderChange(event);
        return;
    }

    if (syncProviderSelect.parentElement.contains(event.target)) {
        syncProviderDropdownMenu.classList.toggle('hidden');
    } else {
        syncProviderDropdownMenu.classList.add('hidden');
    }
}

/**
 * 处理云同步开关切换
 * @param {Event} event - 事件对象
 */
function handleSyncToggle(event) {
    const { settingsViewElements: elements } = dom;
    const isEnabled = event.target.checked;
    
    elements.cloudSyncConfigContainer.classList.toggle('hidden', !isEnabled);

    // 切换关闭时隐藏同步操作
    const syncControlContainer = document.getElementById('sync-control-container');
    if (syncControlContainer) {
        syncControlContainer.classList.add('hidden');
    }

    if (!isEnabled) {
        // 用户禁用同步时，清除后端设置
        api.postMessageWithResponse('webview:disableCloudSync')
            .then(() => {
                api.showToast('云同步已禁用', 'success');
                elements.syncProviderSelect.value = '-- 请选择 --';
                elements.syncProviderSelect.dataset.value = '';
                
                // 清除所有配置输入框的值
                clearAllConfigInputs();
                
                // 隐藏所有配置面板
                showProviderConfig('');
            })
            .catch(err => api.showToast(`禁用失败: ${err.message}`, 'error'));
    } else {
        // 用户启用同步时，显示当前提供商配置或保持默认状态
        const currentProvider = elements.syncProviderSelect.dataset.value || '';
        showProviderConfig(currentProvider);
        
        // 确保设置表单可见（未锁定）
        setSyncConfigLockedState(false, {}, currentProvider);
    }
}

/**
 * 渲染同步摘要信息
 * @param {Object} settings - 同步设置
 */
function renderSyncSummary(settings) {
    const { settingsViewElements: elements } = dom;
    const summaryView = elements.syncSummaryView;
    if (!summaryView) return;

    // 添加调试信息
    console.log('renderSyncSummary called with settings:', settings);
    console.log('settings.gistId:', settings.gistId);
    console.log('settings.syncProvider:', settings.syncProvider);

    const provider = settings.syncProvider;
    let mainText = '';
    let secondaryText = '';

    // 检查配置是否完整
    const isProviderConfigured = checkProviderConfiguration(settings, provider);

    // 简化ID显示的辅助函数
    const shortenId = (id) => {
        if (!id || id.length <= 12) return id;
        return `${id.substring(0, 6)}...${id.substring(id.length - 6)}`;
    };

    switch (provider) {
        case 'github':
            mainText = `已连接到 <strong>GitHub Gist</strong>`;
            secondaryText = isProviderConfigured ? `(ID: ${shortenId(settings.gistId)})` : '(ID: 未设置)';
            break;
        case 'gitee':
            mainText = `已连接到 <strong>Gitee Gist</strong>`;
            secondaryText = isProviderConfigured ? `(ID: ${shortenId(settings.gistId)})` : '(ID: 未设置)';
            break;
        case 'gitlab':
            const gitlabInstance = settings.gitlabUrl === 'https://gitlab.com' ? 'GitLab.com' : settings.gitlabUrl;
            mainText = `已连接到 <strong>${gitlabInstance}</strong>`;
            secondaryText = isProviderConfigured ? `(Snippet: ${shortenId(settings.gistId)})` : '(Snippet: 未设置)';
            break;
        case 'webdav':
            mainText = `已连接到 <strong>WebDAV</strong>`;
            secondaryText = isProviderConfigured ? `(${settings.webdavUsername}@${settings.webdavUrl})` : '(配置未完整)';
            break;
        case 'custom':
            mainText = `已连接到自定义 API`;
            secondaryText = isProviderConfigured ? `(URL: <strong>${settings.customApiUrl}</strong>)` : '(URL: 未设置)';
            break;
        default:
            mainText = '云同步配置无效';
    }

    summaryView.innerHTML = `
        <div class="summary-text-container">
            <span class="status-indicator success"></span>
            <div class="text-content">
            <span class="summary-text-main">${mainText}</span>
            <span class="summary-text-secondary">${secondaryText}</span>
            </div>
        </div>
        <div class="summary-actions">
            <button id="edit-sync-settings-btn" class="btn btn-secondary">修改</button>
        </div>
    `;
    
    // 为新创建的按钮重新绑定事件监听器
    summaryView.querySelector('#edit-sync-settings-btn').addEventListener('click', () => {
        const currentProvider = dom.settingsViewElements.syncProviderSelect.dataset.value || '';
        setSyncConfigLockedState(false, {}, currentProvider);
        api.showToast('设置已解锁，您可以进行修改。', 'info');
    });
}

/**
 * 设置同步配置的锁定状态
 * @param {boolean} isLocked - 是否锁定
 * @param {Object} settings - 设置对象
 * @param {string} provider - 提供商名称
 */
function setSyncConfigLockedState(isLocked, settings, provider) {
    const { settingsViewElements: elements } = dom;

    // 添加调试信息
    console.log('[CloudSync] setSyncConfigLockedState called:', {
        isLocked,
        provider,
        hasSettings: !!settings,
        cloudSync: settings?.cloudSync
    });

    elements.syncSettingsForm.classList.toggle('hidden', isLocked);
    elements.syncSummaryView.classList.toggle('hidden', !isLocked);
    
    // 已连接时隐藏同步服务商选择器
    const providerSelectContainer = elements.syncProviderSelect.closest('.form-group');
    if (providerSelectContainer) {
        providerSelectContainer.classList.toggle('hidden', isLocked);
        console.log('[CloudSync] Provider select container visibility:', {
            isHidden: providerSelectContainer.classList.contains('hidden'),
            shouldBeHidden: isLocked
        });
    } else {
        console.warn('[CloudSync] Provider select container not found');
    }

    // 同步控制区域的显示逻辑
    const syncControlContainer = document.getElementById('sync-control-container');

    if (isLocked) {
        // 只有在配置完整且启用时才显示同步控制
        const isConfiguredAndEnabled = settings && 
                                       settings.cloudSync && 
                                       checkProviderConfiguration(settings, settings.syncProvider);
        
        console.log('[CloudSync] Locked state - configuration check:', {
            isConfiguredAndEnabled,
            hasCloudSync: settings?.cloudSync,
            providerCheck: settings ? checkProviderConfiguration(settings, settings.syncProvider) : false
        });
        
        if (isConfiguredAndEnabled) {
            renderSyncSummary(settings);
            // 显示同步控制界面
            if (syncControlContainer) {
                syncControlContainer.classList.remove('hidden');
            }
            // 根据自动同步状态显示不同的界面
            updateSyncInterfaceVisibility();
        } else {
            // 配置不完整或未启用，隐藏同步控制区域
            if (syncControlContainer) {
                syncControlContainer.classList.add('hidden');
            }
        }
        
        // 注意：不在这里绑定事件监听器，因为它们应该在init时只绑定一次
        // 动态按钮的监听器将在renderSyncSummary中处理
    } else {
        // 解锁时，也显示正确的提供商配置输入
        console.log('[CloudSync] Unlocked state - showing provider config for:', provider);
        showProviderConfig(provider);
        // 隐藏同步控制界面
        if (syncControlContainer) {
            syncControlContainer.classList.add('hidden');
        }
    }
}

/**
 * 取消同步设置修改
 */
function handleCancelSyncSettings() {
    // 恢复到锁定状态（摘要视图）
    const currentProvider = dom.settingsViewElements.syncProviderSelect.dataset.value || '';
    const currentSettings = state.appData?.settings || {};
    
    // 重新填充当前设置值
    updateCloudSyncView(currentSettings);
    
    // 锁定配置界面，显示摘要
    setSyncConfigLockedState(true, currentSettings, currentProvider);
    
    api.showToast('已取消修改', 'info');
}

/**
 * 保存同步设置
 */
export async function handleSaveSyncSettings() {
    const { settingsViewElements: elements } = dom;
    setSaveButtonLoading(true);

    const provider = elements.syncProviderSelect.dataset.value || 'disabled';
    const settings = {
        provider: provider,
        token: '',
        gistId: '',
        gitlabUrl: '',
        webdavUrl: '',
        webdavUsername: '',
        customApiUrl: '',
    };

    // 根据不同提供商收集配置信息
    switch (provider) {
        case 'github':
            settings.token = elements.githubConfig.token.value.trim();
            settings.gistId = elements.githubConfig.gistId.value.trim();
            
            // GitHub Token验证
            if (!settings.token) {
                throw new Error('GitHub Token 不能为空，请填写具有gist权限的Personal Access Token');
            }
            
            // 清理Token中的换行符和额外空格
            settings.token = settings.token.replace(/[\r\n]/g, '').trim();
            break;
        case 'gitee':
            console.log('[CloudSync] Processing Gitee configuration...');
            settings.token = elements.giteeConfig.token.value.trim();
            settings.gistId = elements.giteeConfig.gistId.value.trim();
            
            console.log('[CloudSync] Gitee raw input:', {
                tokenLength: settings.token ? settings.token.length : 0,
                tokenPreview: settings.token ? settings.token.substring(0, 8) + '...' : 'empty',
                gistId: settings.gistId || 'none'
            });
            
            // Gitee Token验证
            if (!settings.token) {
                console.error('[CloudSync] Gitee token is empty');
                throw new Error('Gitee Token 不能为空，请填写具有gists权限的Private Token');
            }
            
            // 清理Token中的换行符
            const originalTokenLength = settings.token.length;
            settings.token = settings.token.replace(/[\r\n]/g, '').trim();
            console.log('[CloudSync] Gitee token cleaned:', {
                originalLength: originalTokenLength,
                cleanedLength: settings.token.length,
                lengthChanged: originalTokenLength !== settings.token.length
            });
            

            
            console.log('[CloudSync] Gitee token validation passed');
            break;
        case 'gitlab':
            settings.token = elements.gitlabConfig.token.value.trim();
            settings.gistId = elements.gitlabConfig.snippetId.value.trim();
            // 如果GitLab URL为空，使用默认值而不是空字符串
            const gitlabUrlValue = elements.gitlabConfig.url.value.trim();
            settings.gitlabUrl = gitlabUrlValue || 'https://gitlab.com';
            
            // GitLab Token验证
            if (!settings.token) {
                throw new Error('GitLab Token 不能为空，请填写具有api权限的Personal Access Token');
            }
            
            // 清理Token中的换行符
            settings.token = settings.token.replace(/[\r\n]/g, '').trim();
            break;
        case 'webdav':
            settings.token = elements.webdavConfig.password.value.trim();
            settings.webdavUrl = elements.webdavConfig.url.value.trim();
            settings.webdavUsername = elements.webdavConfig.username.value.trim();
            
            // WebDAV字段验证
            if (!settings.webdavUrl) {
                throw new Error('WebDAV URL 不能为空，请填写完整的WebDAV服务器地址');
            }
            if (!settings.webdavUsername) {
                throw new Error('WebDAV 用户名不能为空');
            }
            if (!settings.token) {
                throw new Error('WebDAV 密码不能为空');
            }
            
            // 清理密码中的换行符
            settings.token = settings.token.replace(/[\r\n]/g, '').trim();
            break;
        case 'custom':
            settings.token = elements.customConfig.apiKey.value.trim();
            settings.customApiUrl = elements.customConfig.url.value.trim();
            
            // Custom API字段验证
            if (!settings.customApiUrl) {
                throw new Error('自定义 API URL 不能为空，请填写支持GET/POST的API端点地址');
            }
            if (!settings.token) {
                throw new Error('API Key 不能为空');
            }
            
            // 清理API Key中的换行符
            settings.token = settings.token.replace(/[\r\n]/g, '').trim();
            

            break;
    }
    
    try {
        console.log('[CloudSync] Attempting to save sync settings:', {
            provider: settings.provider,
            tokenLength: settings.token ? settings.token.length : 0,
            gistId: settings.gistId || 'none',
            gitlabUrl: settings.gitlabUrl || 'none',
            webdavUrl: settings.webdavUrl || 'none',
            customApiUrl: settings.customApiUrl || 'none'
        });
        
        console.log('[CloudSync] Calling backend API...');
        const response = await api.saveSyncSettings(settings);
        console.log('[CloudSync] Backend API response received:', {
            success: response.success,
            hasData: !!response.data,
            dataKeys: response.data ? Object.keys(response.data) : []
        });
        
        let updatedAppData = response.data;
        // 更新全局状态
        state.appData = updatedAppData;

        // 首次配置成功时，自动开启自动同步并执行首次同步
        try {
            console.log('[CloudSync] Attempting to enable autoSync after successful sync configuration');
            await api.postMessageWithResponse('webview:setSetting', { key: 'autoSync', value: true });
            // 更新本地状态
            updatedAppData.settings.autoSync = true;
            
            // 更新自动同步开关状态
            const syncAutoToggle = document.getElementById('sync-auto-toggle');
            if (syncAutoToggle) syncAutoToggle.checked = true;
            
            console.log('[CloudSync] AutoSync enabled successfully, starting initial sync');
            
            // 执行首次同步
            try {
                api.showNotification('正在执行首次同步...', 'info');
                const syncResult = await api.postMessageWithResponse('webview:reconcileCloudSync');
                if (syncResult.success) {
                    // 主动从后端获取最新数据并更新全局状态
                    const response = await api.postMessageWithResponse('getAppData');
                    const appData = api.parseAppDataResponse(response);
                    
                    // 更新全局状态
                    state.appData = appData;
                    state.prompts = appData.prompts;
                    console.log('[CloudSync] Data refreshed after reconcile cloud sync:', state.prompts.length, 'prompts');
                    
                    api.showToast('首次同步完成', 'success');
                    updateLastSyncTime();
                }
            } catch (syncErr) {
                console.error('[CloudSync] Initial sync failed:', syncErr);
                api.showNotification('云同步设置保存成功，自动同步已开启', 'info');
            }
        } catch (autoSyncError) {
            console.error('[CloudSync] Failed to enable autoSync:', autoSyncError);
            const errorMessage = autoSyncError.message || autoSyncError || '未知错误';
            api.showNotification(`云同步设置保存成功，但自动同步设置失败: ${errorMessage}`, 'warning');
        }

        setSyncConfigLockedState(true, updatedAppData.settings, provider);
        highlightSyncActions();
        
        // 更新同步界面显示
        updateSyncInterfaceVisibility();
        
        // 强制更新云同步视图以确保UI反映最新状态
        updateCloudSyncView(updatedAppData.settings);
        
    } catch (error) {
        console.error('[CloudSync] Save settings error occurred');
        console.error('[CloudSync] Error details:', {
            message: error.message || 'No message',
            name: error.name || 'Unknown',
            stack: error.stack || 'No stack trace',
            toString: error.toString()
        });
        console.error('[CloudSync] Full error object:', error);
        
        // =============================================================================
        // 统一的云同步错误处理策略
        // =============================================================================
        // 
        // 新的设计原则：前端统一错误显示
        // 1. 后端不显示任何用户通知，只传递错误信息
        // 2. 前端统一处理所有错误显示，提供一致的用户体验  
        // 3. 简化错误处理逻辑，避免特殊情况处理
        // 4. 确保用户只看到一个清晰的错误通知
        //
        // 支持的云同步提供商：
        // - GitHub、GitLab、Gitee：Token-based认证
        // - WebDAV：基本认证 (username/password)
        // - Custom API：自定义API密钥认证
        // =============================================================================
        
        // 统一的错误处理：显示用户友好的错误信息
        const providerName = provider === 'github' ? 'GitHub' :
                           provider === 'gitee' ? 'Gitee' :
                           provider === 'gitlab' ? 'GitLab' :
                           provider === 'webdav' ? 'WebDAV' :
                           provider === 'custom' ? '自定义API' : '云同步';
                           
        if (error.message) {
            // 检查是否为前端验证错误（这些错误不会到达后端）
            const isFrontendValidationError = 
                error.message.includes('不能为空') || 
                error.message.includes('长度过短') || 
                error.message.includes('请填写');
            
            if (isFrontendValidationError) {
                // 前端验证错误，显示简洁通知
                api.showToast(error.message, 'error');
            } else {
                // 后端错误，显示完整的错误信息
                api.showToast(`${providerName} 云同步设置失败: ${error.message}`, 'error');
                
                // 提供基本的错误诊断信息到控制台
                console.group(`[CloudSync] ${providerName} Error Details`);
                console.log('Provider:', provider);
                console.log('Error message:', error.message);
                console.log('Error type:', error.name || 'Unknown');
                console.log('Recommended action: Check token/credentials and network connectivity');
                console.groupEnd();
            }
        } else {
            // 未知错误
            api.showToast(`${providerName} 云同步设置失败: 发生未知错误`, 'error');
            console.error('[CloudSync] Unknown error object:', error);
        }
    } finally {
        setSaveButtonLoading(false);
    }
}

/**
 * 更新同步界面的可见性
 * 根据自动同步开关状态决定显示哪个界面
 */
function updateSyncInterfaceVisibility() {
    // 首先检查云同步是否已配置
    const isCloudSyncConfigured = state.appData?.settings?.cloudSync && 
                                  state.appData?.settings?.syncProvider && 
                                  checkProviderConfiguration(state.appData.settings, state.appData.settings.syncProvider);
    
    const syncControlContainer = document.getElementById('sync-control-container');
    const manualSyncContent = document.getElementById('manual-sync-content');
    const autoSyncContent = document.getElementById('auto-sync-content');
    
    if (!isCloudSyncConfigured) {
        // 如果云同步未配置，隐藏整个同步控制区域
        if (syncControlContainer) {
            syncControlContainer.classList.add('hidden');
        }
        return;
    }
    
    // 云同步已配置，显示同步控制区域
    if (syncControlContainer) {
        syncControlContainer.classList.remove('hidden');
    }
    
    // 获取统一的自动同步开关
    const syncAutoToggle = document.getElementById('sync-auto-toggle');
    
    // 判断自动同步状态
    const isAutoSyncEnabled = syncAutoToggle ? syncAutoToggle.checked : false;
    
    if (isAutoSyncEnabled) {
        // 自动同步开启：显示状态界面，隐藏手动同步
        if (manualSyncContent) manualSyncContent.classList.add('hidden');
        if (autoSyncContent) autoSyncContent.classList.remove('hidden');
        updateLastSyncTime();
    } else {
        // 自动同步关闭：显示手动同步界面，隐藏状态界面
        if (autoSyncContent) autoSyncContent.classList.add('hidden');
        if (manualSyncContent) manualSyncContent.classList.remove('hidden');
        // 手动同步模式下也要更新最后同步时间
        updateLastSyncTime();
    }
}

/**
 * 更新最后同步时间显示
 */
function updateLastSyncTime() {
    const lastSyncTimeElement = document.getElementById('last-sync-time');
    const manualLastSyncTimeElement = document.getElementById('manual-last-sync-time');
    
    // 添加调试信息
    console.log('updateLastSyncTime called');
    console.log('state.appData:', state.appData);
    console.log('cloudSync:', state.appData?.settings?.cloudSync);
    console.log('syncProvider:', state.appData?.settings?.syncProvider);
    console.log('gistId:', state.appData?.settings?.gistId);
    console.log('lastSyncTimestamp:', state.appData?.settings?.lastSyncTimestamp);
    
    // 计算显示的时间文本
    let timeText = '';
    
    // 检查是否已配置云同步 - 使用统一的配置检查逻辑
    const isCloudSyncEnabled = state.appData?.settings?.cloudSync && 
                                     state.appData?.settings?.syncProvider && 
                              state.appData?.settings?.syncProvider !== 'disabled';
    
    const isProviderConfigured = isCloudSyncEnabled ? 
        checkProviderConfiguration(state.appData.settings, state.appData.settings.syncProvider) : false;
        
    if (!isCloudSyncEnabled) {
        timeText = '最后同步：--';
        console.log('Cloud sync not enabled, showing --');
    } else if (!isProviderConfigured) {
        timeText = '最后同步：--';
        console.log('Provider not configured, showing --');
    } else if (!state.appData?.settings?.lastSyncTimestamp) {
        timeText = '最后同步：尚未同步';
        console.log('Provider configured but no sync timestamp, showing 尚未同步');
        } else {
    const lastSyncTime = new Date(state.appData.settings.lastSyncTimestamp);
    const now = new Date();
    const diffMs = now - lastSyncTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
        console.log('Calculating time difference:', { lastSyncTime, now, diffMs, diffMins, diffHours, diffDays });
        
    if (diffMins < 1) {
            timeText = '最后同步：刚刚';
    } else if (diffMins < 60) {
            timeText = `最后同步：${diffMins} 分钟前`;
    } else if (diffHours < 24) {
            timeText = `最后同步：${diffHours} 小时前`;
    } else if (diffDays < 7) {
            timeText = `最后同步：${diffDays} 天前`;
    } else {
            timeText = `最后同步：${lastSyncTime.toLocaleDateString()}`;
    }
        console.log('Calculated timeText:', timeText);
    }
    
    // 同时更新两个位置的时间显示
    if (lastSyncTimeElement) {
        lastSyncTimeElement.textContent = timeText;
        console.log('Updated lastSyncTimeElement:', timeText);
    }
    if (manualLastSyncTimeElement) {
        manualLastSyncTimeElement.textContent = timeText;
        console.log('Updated manualLastSyncTimeElement:', timeText);
    }
}

/**
 * 处理手动同步（智能双向同步）
 */
function handleManualSync() {
    const syncBtn = document.getElementById('manual-sync-btn');
    const originalText = syncBtn.innerHTML;
    
    // 显示loading状态
    syncBtn.disabled = true;
    syncBtn.innerHTML = '<span class="spinner"></span> 同步中...';
    
    api.postMessageWithResponse('webview:reconcileCloudSync')
        .then(result => {
            if (result.success) {
                // 同步成功，更新UI
                api.showToast('数据同步成功', 'success');
                // 更新全局状态 - 修复：使用返回的appData
                if (result.appData) {
                    state.appData = result.appData;
                }
                updateLastSyncTime();
            }
        })
        .catch(err => {
            // 错误由后端处理并显示为原生VS Code通知
            console.error('手动同步失败:', err);
            api.showToast(`同步失败: ${err.message}`, 'error');
        })
        .finally(() => {
            // 恢复按钮状态
            syncBtn.disabled = false;
            syncBtn.innerHTML = originalText;
        });
}

/**
 * 同步到云端（保留原有函数，用于兼容性）
 */
function handleSyncToCloud() {
    api.postMessageWithResponse('webview:syncToCloud')
        .then(async result => {
            if (result.success) {
                // 主动从后端获取最新数据并更新全局状态
                const response = await api.postMessageWithResponse('getAppData');
                const appData = api.parseAppDataResponse(response);
                
                // 更新全局状态
                state.appData = appData;
                state.prompts = appData.prompts;
                console.log('[CloudSync] Data refreshed after sync to cloud:', state.prompts.length, 'prompts');
                // 成功通知已由后端处理为原生VS Code通知
                updateLastSyncTime();
            }
        })
        .catch(err => {
            // 错误由后端处理并显示为原生VS Code通知
            console.error('同步到云端失败:', err);
        });
}

/**
 * 从云端同步（保留原有函数，用于兼容性）
 */
function handleSyncFromCloud() {
    api.postMessageWithResponse('webview:syncFromCloud')
        .then(async result => {
            if (result.success) {
                // 主动从后端获取最新数据并更新全局状态
                const response = await api.postMessageWithResponse('getAppData');
                const appData = api.parseAppDataResponse(response);
                
                // 更新全局状态
                state.appData = appData;
                state.prompts = appData.prompts;
                console.log('[CloudSync] Data refreshed after sync from cloud:', state.prompts.length, 'prompts');
                // 成功通知已由后端处理为原生VS Code通知
                updateLastSyncTime();
            }
        })
        .catch(err => {
            // 错误由后端处理并显示为原生VS Code通知
            console.error('从云端同步失败:', err);
        });
}

/**
 * 处理自动同步开关切换
 * @param {Event} event - 事件对象
 */
function handleAutoSyncToggle(event) {
    const isEnabled = event.target.checked;
    
    // 显示开关的loading状态
    const toggle = event.target;
    const originalDisabled = toggle.disabled;
    toggle.disabled = true;
    
    api.postMessageWithResponse('webview:setSetting', { key: 'autoSync', value: isEnabled })
        .then(async () => {
            api.showNotification(`自动同步已${isEnabled ? '开启' : '关闭'}`, 'info');
            
            // 如果开启自动同步，立即执行一次同步
            if (isEnabled) {
                try {
                    api.showNotification('正在执行首次同步...', 'info');
                    const syncResult = await api.postMessageWithResponse('webview:reconcileCloudSync');
                    if (syncResult.success) {
                        api.showToast('首次同步完成', 'success');
                        // 更新全局状态 - 修复：使用返回的appData
                        if (syncResult.appData) {
                            state.appData = syncResult.appData;
                        }
                        updateLastSyncTime();
                    }
                } catch (syncErr) {
                    console.error('首次自动同步失败:', syncErr);
                    api.showToast(`首次同步失败: ${syncErr.message}`, 'warning');
                }
            }
            
            // 切换界面显示
            updateSyncInterfaceVisibility();
        })
        .catch(err => {
            api.showNotification(`操作失败: ${err.message}`, 'error');
            // 失败时恢复复选框状态
            event.target.checked = !isEnabled;
        })
        .finally(() => {
            // 恢复开关状态
            toggle.disabled = originalDisabled;
        });
}

/**
 * 设置保存按钮的加载状态
 * @param {boolean} isLoading - 是否加载中
 */
function setSaveButtonLoading(isLoading) {
    const saveButton = dom.settingsViewElements.saveSyncSettingsButton;
    if (isLoading) {
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner"></span> 验证中...';
    } else {
        saveButton.disabled = false;
        saveButton.textContent = '保存并验证';
    }
}

/**
 * 高亮同步操作按钮（根据数据修改状态）
 */
function highlightSyncActions() {
    const syncToCloudBtn = document.getElementById('sync-to-cloud-btn');
    const syncFromCloudBtn = document.getElementById('sync-from-cloud-btn');
    
    // 安全检查：确保所有必需的数据都存在
    if (!syncToCloudBtn || !syncFromCloudBtn || 
        !state.appData?.metadata?.lastModified) {
        return;
    }

    const lastModified = new Date(state.appData.metadata.lastModified);
    
    if (state.appData.settings.lastSyncTimestamp) {
        const lastSync = new Date(state.appData.settings.lastSyncTimestamp);
        if (lastModified > lastSync) {
            syncToCloudBtn.classList.add('highlight');
        } else {
            syncToCloudBtn.classList.remove('highlight');
        }
    } else {
        // 从未同步过，所以高亮上传按钮
        syncToCloudBtn.classList.add('highlight');
    }
}

/**
 * 更新云同步视图
 * @param {Object} settings - 设置对象
 */
export function updateCloudSyncView(settings) {
    const { settingsViewElements: elements } = dom;
    if (!elements.cloudSyncEnabledToggle) {
        return;
    }

    // 添加调试日志
    console.log('[CloudSync] updateCloudSyncView called with settings:', {
        cloudSync: settings.cloudSync,
        syncProvider: settings.syncProvider,
        gistId: settings.gistId,
        isValidated: settings.isValidated
    });

    elements.cloudSyncEnabledToggle.checked = settings.cloudSync;
    elements.cloudSyncConfigContainer.classList.toggle('hidden', !settings.cloudSync);

    const isConfiguredAndEnabled = settings.cloudSync && checkProviderConfiguration(settings, settings.syncProvider);
    
    console.log('[CloudSync] Configuration check result:', {
        isConfiguredAndEnabled,
        checkResult: checkProviderConfiguration(settings, settings.syncProvider)
    });

    // 兼容性修复：如果配置有效但isValidated为false，则主动设置为true
    if (isConfiguredAndEnabled && !settings.isValidated) {
        console.log('检测到有效配置但isValidated为false，正在修复...');
        api.postMessage('webview:fixValidationStatus', { provider: settings.syncProvider });
    }

    // 先设置锁定状态，这会控制整体的UI布局
    setSyncConfigLockedState(isConfiguredAndEnabled, settings, settings.syncProvider);

    // 然后设置provider选择器的值（但只在未锁定状态下有意义）
    if (settings.syncProvider) {
        // 更新显示文本和数据值
        const providerNames = {
            'github': 'GitHub Gist',
            'gitee': 'Gitee Gist',
            'gitlab': 'GitLab Snippets',
            'webdav': 'WebDAV',
            'custom': 'Custom API'
        };
        elements.syncProviderSelect.value = providerNames[settings.syncProvider] || '-- 请选择 --';
        elements.syncProviderSelect.dataset.value = settings.syncProvider;
        
        // 确保在未锁定状态下显示正确的配置表单
        if (!isConfiguredAndEnabled) {
            showProviderConfig(settings.syncProvider);
        }
    } else {
        elements.syncProviderSelect.value = '-- 请选择 --';
        elements.syncProviderSelect.dataset.value = '';
        // 如果云同步开启但没有配置提供商，且未锁定，隐藏所有配置面板
        if (settings.cloudSync && !isConfiguredAndEnabled) {
            showProviderConfig('');
        }
    }

    // 控制同步控制区域的显示
    const syncControlContainer = document.getElementById('sync-control-container');
    if (syncControlContainer) {
        if (isConfiguredAndEnabled) {
            // 只有在配置完整且启用时才显示同步控制区域
            syncControlContainer.classList.remove('hidden');

            // 更新自动同步开关状态
            const syncAutoToggle = document.getElementById('sync-auto-toggle');
            if (syncAutoToggle) {
                syncAutoToggle.checked = !!settings.autoSync;
            }
            
            // 更新同步界面显示
            updateSyncInterfaceVisibility();
        } else {
            // 配置不完整或未启用，隐藏同步控制区域
            syncControlContainer.classList.add('hidden');
        }
    }
    
    // 填入现有值（如果存在）
    if (settings.syncProvider === 'github' && elements.githubConfig.gistId) {
        elements.githubConfig.gistId.value = settings.gistId || '';
    } else if (settings.syncProvider === 'gitee' && elements.giteeConfig.gistId) {
        elements.giteeConfig.gistId.value = settings.gistId || '';
    } else if (settings.syncProvider === 'gitlab' && elements.gitlabConfig.snippetId) {
        elements.gitlabConfig.snippetId.value = settings.gistId || '';
        elements.gitlabConfig.url.value = settings.gitlabUrl || '';
    } else if (settings.syncProvider === 'webdav' && elements.webdavConfig.url) {
        elements.webdavConfig.url.value = settings.webdavUrl || '';
        elements.webdavConfig.username.value = settings.webdavUsername || '';
    } else if (settings.syncProvider === 'custom' && elements.customConfig.url) {
        elements.customConfig.url.value = settings.customApiUrl || '';
    }

    highlightSyncActions();
    
    // 更新最后同步时间显示（只有在配置完整时才更新）
    if (isConfiguredAndEnabled) {
        updateLastSyncTime();
    }
    
    // 最终确保UI状态正确：如果配置完整，再次确保锁定状态正确应用
    if (isConfiguredAndEnabled) {
        console.log('[CloudSync] Final UI state check - ensuring locked state is properly applied');
        // 使用setTimeout确保在当前执行栈完成后再次检查UI状态
        setTimeout(() => {
            setSyncConfigLockedState(true, settings, settings.syncProvider);
        }, 0);
    }
}

/**
 * 初始化云同步模块
 * - 绑定事件监听器
 * - 设置UI交互逻辑
 */
export function init() {
    if (isInitialized) return;
    
    const { settingsViewElements: elements } = dom;
    
    // 绑定云同步相关事件监听器
    elements.saveSyncSettingsButton.addEventListener('click', handleSaveSyncSettings);
    elements.cloudSyncEnabledToggle.addEventListener('change', handleSyncToggle);
    
    // 绑定取消按钮事件监听器
    const cancelSyncSettingsBtn = document.getElementById('cancel-sync-settings-btn');
    if (cancelSyncSettingsBtn) {
        cancelSyncSettingsBtn.addEventListener('click', handleCancelSyncSettings);
    }
    
    // 移除原来的change事件监听器，改为使用全局点击事件处理下拉交互
    document.addEventListener('click', handleProviderDropdownInteraction);
    
    // 绑定新的统一自动同步开关
    const syncAutoToggle = document.getElementById('sync-auto-toggle');
    if (syncAutoToggle) {
        syncAutoToggle.addEventListener('change', handleAutoSyncToggle);
    }
    
    // 绑定手动同步按钮的事件监听器
    const manualSyncBtn = document.getElementById('manual-sync-btn');
    if (manualSyncBtn) {
        manualSyncBtn.addEventListener('click', handleManualSync);
    }
    
    // 保留原有的同步按钮事件监听器（用于兼容性，虽然这些按钮已经移除）
    const syncToCloudBtn = document.getElementById('sync-to-cloud-btn');
    const syncFromCloudBtn = document.getElementById('sync-from-cloud-btn');
    if (syncToCloudBtn) {
        syncToCloudBtn.addEventListener('click', handleSyncToCloud);
    }
    if (syncFromCloudBtn) {
        syncFromCloudBtn.addEventListener('click', handleSyncFromCloud);
    }
    
    isInitialized = true;
    console.log('云同步模块已初始化');
}

/**
 * 重置模块状态（用于测试或重新初始化）
 */
export function reset() {
    // 移除事件监听器
    document.removeEventListener('click', handleProviderDropdownInteraction);
    isInitialized = false;
}

/**
 * 清除所有配置输入框的值
 */
function clearAllConfigInputs() {
    const { settingsViewElements: elements } = dom;
    
    // 清除GitHub配置
    if (elements.githubConfig.token) elements.githubConfig.token.value = '';
    if (elements.githubConfig.gistId) elements.githubConfig.gistId.value = '';
    
    // 清除Gitee配置
    if (elements.giteeConfig.token) elements.giteeConfig.token.value = '';
    if (elements.giteeConfig.gistId) elements.giteeConfig.gistId.value = '';
    
    // 清除GitLab配置
    if (elements.gitlabConfig.token) elements.gitlabConfig.token.value = '';
    if (elements.gitlabConfig.snippetId) elements.gitlabConfig.snippetId.value = '';
    if (elements.gitlabConfig.url) elements.gitlabConfig.url.value = '';
    
    // 清除WebDAV配置
    if (elements.webdavConfig.password) elements.webdavConfig.password.value = '';
    if (elements.webdavConfig.url) elements.webdavConfig.url.value = '';
    if (elements.webdavConfig.username) elements.webdavConfig.username.value = '';
    
    // 清除Custom API配置
    if (elements.customConfig.apiKey) elements.customConfig.apiKey.value = '';
    if (elements.customConfig.url) elements.customConfig.url.value = '';
}

// 导出供外部使用的函数
export {
    showProviderConfig,
    handleProviderChange,
    handleSyncToggle,
    handleSyncToCloud,
    handleSyncFromCloud,
    handleAutoSyncToggle,
    handleManualSync,
    handleCancelSyncSettings,
    setSyncConfigLockedState,
    highlightSyncActions,
    updateSyncInterfaceVisibility,
    updateLastSyncTime
}; 