/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as fs from 'fs';
import { DataManager, SyncError } from './dataManager';

export class PromptHubProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'promptHubView';

    private _view?: vscode.WebviewView;
    private _dataManager: DataManager;

    constructor(private readonly _extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._dataManager = new DataManager(context);
    }

    public getDataManager(): DataManager {
        return this._dataManager;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'dist')]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            // Legacy handler for simple settings save from old webview code
            if (message.command === 'saveSettings') {
                try {
                    await this._dataManager.saveAppData(message.data);
                    this._postMessage({ command: 'settingsSaved' });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this._postMessage({ command: 'settingsSaveFailed', message: errorMessage });
                    vscode.window.showErrorMessage(`保存设置失败: ${errorMessage}`);
                }
                return;
            }

            try {
                await this._handleWebviewMessage(message);
            } catch (error) {
                this.showError(error, message.type, message.requestId);
            }
        });
    }

    private async _handleWebviewMessage(message: any): Promise<void> {
        const payload = message.payload || {};
        switch (message.type) {
            case 'webviewReady':
                console.log('[PromptHub] WebView ready, sending initial data...');
                await this.refresh();
                break;

            case 'getAppData': {
                const appData = await this._dataManager.getAppData();
                this._postMessage({ type: 'appDataResponse', requestId: message.requestId, success: true, data: appData });
                break;
            }

            case 'getPrompts': {
                const prompts = await this._dataManager.getPrompts();
                this._postMessage({ type: 'promptsResponse', requestId: message.requestId, success: true, data: prompts });
                break;
            }

            case 'getAllTags': {
                const tags = await this._dataManager.getAllTags();
                this._postMessage({ type: 'allTagsResponse', requestId: message.requestId, success: true, data: tags });
                break;
            }

            case 'getCategoryPromptCount': {
                const count = await this._dataManager.getCategoryPromptCount(payload.name);
                this._postMessage({ type: 'categoryPromptCountResponse', requestId: message.requestId, success: true, data: { count } });
                break;
            }
            
            case 'savePrompt': {
                await this._dataManager.savePrompt(payload.prompt);
                this._postMessage({ type: 'savePromptResponse', requestId: message.requestId, success: true });
                this._showNotification('提示词已保存。');
                break;
            }

            case 'deletePrompt': {
                await this._dataManager.deletePrompt(payload.id);
                this._postMessage({ type: 'deletePromptResponse', requestId: message.requestId, success: true });
                this._showNotification('提示词已删除。');
                break;
            }

            case 'renameCategory': {
                await this._dataManager.renameCategory(payload.oldName, payload.newName);
                this._postMessage({ type: 'renameCategoryResponse', requestId: message.requestId, success: true });
                break;
            }

            case 'deleteTag': {
                await this._dataManager.deleteTag(payload.name);
                this._postMessage({ type: 'deleteTagResponse', requestId: message.requestId, success: true });
                break;
            }

            case 'deleteCategory': {
                await this._dataManager.deleteCategory(payload.name);
                this._postMessage({ type: 'deleteCategoryResponse', requestId: message.requestId, success: true });
                break;
            }
            
            case 'addCategory': {
                await this._dataManager.addCategory(payload.name);
                this._postMessage({ type: 'addCategoryResponse', requestId: message.requestId, success: true });
                this._showNotification(`分类 "${payload.name}" 已成功添加。`);
                break;
            }

            // Data Management Actions
            case 'importData': {
                try {
                    if (payload.data) {
                        const result = await this._dataManager.importData(payload.data);
                    if (result) {
                        this.refresh();
                            this._showNotification('数据导入成功！');
                    }
                    this._postMessage({ type: 'importDataResponse', requestId: message.requestId, success: true });
                } else {
                        this._postMessage({ type: 'importDataResponse', requestId: message.requestId, success: false, error: '未提供导入数据。' });
                    }
                } catch (error: any) {
                    const errorMessage = error instanceof Error ? error.message : '导入过程中发生未知错误';
                    this._postMessage({ type: 'importDataResponse', requestId: message.requestId, success: false, error: errorMessage });
                }
                break;
            }
            case 'exportData': {
                const filePath = await this._dataManager.exportData();
                this._postMessage({ type: 'exportDataResponse', requestId: message.requestId, success: true, data: { filePath } });
                break;
            }
            case 'backupData': 
            case 'createBackup': {
                const backupPath = await this._dataManager.createBackup();
                const responseType = message.type === 'createBackup' ? 'createBackupResponse' : 'backupDataResponse';
                this._postMessage({ type: responseType, requestId: message.requestId, success: true, data: { path: backupPath } });
                break;
            }

            // --- New Backup Management Handlers ---
            case 'listBackups': {
                const backups = await this._dataManager.listBackups();
                this._postMessage({ type: 'listBackupsResponse', requestId: message.requestId, success: true, data: backups });
                break;
            }
            case 'renameBackup': {
                // 只允许纯文件名（不带 .json），如有 .json 后缀自动去除
                let { oldName, newName } = payload;
                if (typeof newName === 'string') {
                    newName = newName.replace(/\.json$/i, '');
                }
                await this._dataManager.renameBackup(oldName, newName);
                this._postMessage({ type: 'renameBackupResponse', requestId: message.requestId, success: true });
                break;
            }
            case 'restoreBackup': {
                const restoredData = await this._dataManager.restoreFromBackupWithFileName(payload.fileName);
                if (restoredData) {
                    // 将恢复的数据保存到存储中
                    await this._dataManager.saveAppData(restoredData);
                    this.refresh(); // Refresh the webview with the restored data
                    this._postMessage({ type: 'restoreBackupResponse', requestId: message.requestId, success: true });
                } else {
                    this._postMessage({ type: 'restoreBackupResponse', requestId: message.requestId, success: false, error: '备份文件未找到或无效' });
                }
                break;
            }
            case 'deleteBackup': {
                this._dataManager.deleteBackup(payload.fileName);
                this._postMessage({ type: 'deleteBackupResponse', requestId: message.requestId, success: true });
                break;
            }

            // Cloud Sync Actions
            case 'webview:setupCloudSync': {
                const result = await this._dataManager.setupCloudSync();
                if (result) this.refresh();
                this._postMessage({ type: 'setupCloudSyncResponse', requestId: message.requestId, success: true });
                break;
            }
            case 'webview:saveCloudSyncSettings': {
                try {
                    console.log('[PromptHubProvider] Received saveCloudSyncSettings request');
                    console.log('[PromptHubProvider] Request payload:', {
                        provider: payload.provider,
                        tokenLength: payload.token ? payload.token.length : 0,
                        hasGistId: !!payload.gistId,
                        hasGitlabUrl: !!payload.gitlabUrl,
                        hasWebdavUrl: !!payload.webdavUrl,
                        hasCustomApiUrl: !!payload.customApiUrl
                    });
                    
                    console.log('[PromptHubProvider] Calling dataManager.saveCloudSyncSettings...');
                    const result = await this._dataManager.saveCloudSyncSettings(payload);
                    console.log('[PromptHubProvider] DataManager call successful');
                    this.refresh(); // 确保前端状态同步
                    console.log('[PromptHubProvider] Webview refreshed, sending success response');
                    this._postMessage({ type: 'saveCloudSyncSettingsResponse', requestId: message.requestId, success: true, data: result });
                    console.log('[PromptHubProvider] Cloud sync settings saved successfully');
                    
                    // 根据提供商显示相应的成功消息
                    const providerName = payload.provider === 'github' ? 'GitHub' :
                                       payload.provider === 'gitee' ? 'Gitee' :
                                       payload.provider === 'gitlab' ? 'GitLab' :
                                       payload.provider === 'webdav' ? 'WebDAV' :
                                       payload.provider === 'custom' ? '自定义API' : '云同步';
                    vscode.window.showInformationMessage(`${providerName} 云同步设置已保存并验证成功!`);
                } catch (error: any) {
                    console.error('[PromptHubProvider] Failed to save cloud sync settings');
                    console.error('[PromptHubProvider] Error details:', {
                        message: error instanceof Error ? error.message : String(error),
                        name: error instanceof Error ? error.name : 'Unknown',
                        stack: error instanceof Error ? error.stack : 'No stack trace',
                        provider: payload.provider
                    });
                    console.error('[PromptHubProvider] Full error object:', error);
                    
                    const errorMessage = error instanceof Error ? error.message : '发生未知错误';
                    
                    // 发送错误响应给前端，让前端统一处理错误显示
                    this._postMessage({ 
                        type: 'saveCloudSyncSettingsResponse', 
                        requestId: message.requestId, 
                        success: false, 
                        error: errorMessage 
                    });
                    
                    // 不在后端显示错误通知，避免与前端重复
                    // 前端会统一处理错误显示，提供更好的用户体验
                }
                break;
            }
            case 'webview:disableCloudSync': {
                await this._dataManager.disableCloudSync();
                this.refresh();
                this._postMessage({ type: 'disableCloudSyncResponse', requestId: message.requestId, success: true });
                break;
            }
            case 'webview:resetCloudSync': {
                await this._dataManager.resetCloudSync();
                this.refresh();
                this._postMessage({ type: 'resetCloudSyncResponse', requestId: message.requestId, success: true });
                vscode.window.showInformationMessage('云同步设置已重置为默认状态（关闭）');
                break;
            }

            case 'webview:resetAllData': {
                console.log("Webview message 'webview:resetAllData' received.");
                try {
                    await this._dataManager.resetAllData();
                    console.log("Data reset successful. Refreshing webview and sending response.");
                    this.refresh();
                    this._postMessage({ 
                        type: 'resetAllDataResponse', 
                        requestId: message.requestId, 
                        success: true,
                    });
                    vscode.window.showInformationMessage('所有数据已重置为初始状态。');
                } catch (error) {
                    console.error("Error handling 'webview:resetAllData':", error);
                    this.showError(error, message.type, message.requestId);
                }
                break;
            }

            case 'webview:clearAllData': {
                console.log("Webview message 'webview:clearAllData' received.");
                try {
                    await this._dataManager.clearAllData();
                    console.log("Data clear successful. Refreshing webview and sending response.");
                    this.refresh();
                    this._postMessage({ 
                        type: 'clearAllDataResponse', 
                        requestId: message.requestId, 
                        success: true,
                    });
                    vscode.window.showInformationMessage('所有数据已被清空。');
                } catch (error) {
                    console.error("Error handling 'webview:clearAllData':", error);
                    this.showError(error, message.type, message.requestId);
                }
                break;
            }
            case 'webview:syncToCloud': {
                await this._dataManager.syncToCloud();
                // 获取最新的appData以便前端更新状态
                const appData = await this._dataManager.getAppData();
                this._postMessage({ 
                    type: 'syncToCloudResponse', 
                    requestId: message.requestId, 
                    success: true, 
                    appData: appData 
                });
                break;
            }
            case 'webview:syncFromCloud': {
                const result = await this._dataManager.syncFromCloud();
                if (result) this.refresh();
                // 获取最新的appData以便前端更新状态
                const appData = await this._dataManager.getAppData();
                this._postMessage({ 
                    type: 'syncFromCloudResponse', 
                    requestId: message.requestId, 
                    success: true, 
                    data: result,
                    appData: appData 
                });
                break;
            }
            case 'webview:reconcileCloudSync': {
                const result = await this._dataManager.reconcileCloudSync();
                if (result.status === 'downloaded' || result.status === 'uploaded') {
                    this.refresh();
                }
                // 获取最新的appData以便前端更新状态
                const appData = await this._dataManager.getAppData();
                this._postMessage({ 
                    type: 'reconcileCloudSyncResponse', 
                    requestId: message.requestId, 
                    success: true, 
                    data: result,
                    appData: appData 
                });
                break;
            }

            case 'webview:setSetting': {
                try {
                const { key, value } = payload;
                    console.log(`[PromptHubProvider] Setting ${key} to ${value}`);
                await this._dataManager.updateSetting(key, value);
                this._postMessage({ type: 'setSettingResponse', requestId: message.requestId, success: true });
                } catch (error: any) {
                    console.error('[PromptHubProvider] Error in setSetting:', error);
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this._postMessage({ 
                        type: 'setSettingResponse', 
                        requestId: message.requestId, 
                        success: false, 
                        error: errorMessage 
                    });
                }
                break;
            }

            case 'showRenameInputBox': {
                const { prompt, value } = payload.options;
                const newName = await vscode.window.showInputBox({
                    prompt: prompt,
                    value: value,
                    validateInput: (text: string) => {
                        if (!text || text.trim() === '') {
                            return '文件名不能为空。';
                        }
                        if (!text.endsWith('.json')) {
                            return '文件名必须以 .json 结尾。';
                        }
                        if (/\s/.test(text)) {
                            return '文件名不能包含空格。';
                        }
                        return null; // Input is valid
                    }
                });
                // newName will be undefined if the user cancelled
                this._postMessage({ type: 'showRenameInputBoxResponse', requestId: message.requestId, success: true, data: { value: newName } });
                break;
            }

            // Storage Mode Actions
            case 'getStorageInfo': {
                await vscode.commands.executeCommand('promptHub.showStorageInfo');
                this._postMessage({ type: 'getStorageInfoResponse', requestId: message.requestId, success: true });
                break;
            }
            case 'toggleWorkspaceMode': {
                const appData = await this._dataManager.getAppData();
                await this._dataManager.toggleWorkspaceMode(!appData.settings.workspaceMode);
                this.refresh();
                this._postMessage({ type: 'toggleWorkspaceModeResponse', requestId: message.requestId, success: true });
                break;
            }

            case 'getSystemStatus': {
                const status = await this._dataManager.getSystemStatus();
                this._postMessage({ type: 'systemStatusResponse', requestId: message.requestId, success: true, data: status });
                break;
            }

            case 'showNotification': {
                const { message: notificationMessage, type: notificationType } = payload;
                if (notificationType === 'error') {
                    vscode.window.showErrorMessage(notificationMessage);
                } else if (notificationType === 'warning') {
                    vscode.window.showWarningMessage(notificationMessage);
                } else {
                    vscode.window.showInformationMessage(notificationMessage);
                }
                // This is a fire-and-forget message, no response needed.
                break;
            }

            case 'showConfirmation': {
                const confirmed = await this.showConfirmationDialog(payload.message);
                this._postMessage({ type: 'confirmationResponse', requestId: message.requestId, success: true, confirmed });
                break;
            }

            case 'showInputBox': {
                const result = await vscode.window.showInputBox(payload.options);
                this._postMessage({ type: 'showInputBoxResponse', requestId: message.requestId, success: true, data: { value: result } });
                break;
            }

            case 'restore-backup': {
                try {
                    const result = await this._dataManager.restoreFromBackupWithFileName(payload.fileName);
                    const success = !!result;
                    if (success && result) {
                        // 将恢复的数据保存到存储中
                        await this._dataManager.saveAppData(result);
                        this.refresh();
                        this._postMessage({ type: 'restoreBackupResponse', requestId: message.requestId, success: true });
                    } else {
                        this._postMessage({ type: 'restoreBackupResponse', requestId: message.requestId, success: false, error: '恢复失败' });
                    }
                } catch (error: any) {
                    this.showError(error, 'restore-backup', message.requestId);
                }
                break;
            }

            case 'rename-backup': {
                try {
                    const { oldFile, newFile } = payload;
                    const { success, error } = await this._dataManager.renameBackup(oldFile, newFile);
                    this._postMessage({ type: 'renameBackupResponse', requestId: message.requestId, success, error });
                } catch (error: any) {
                    this.showError(error, 'rename-backup', message.requestId);
                }
                break;
            }

            case 'delete-backup': {
                try {
                    const { success, error } = await this._dataManager.deleteBackup(payload.fileName);
                    this._postMessage({ type: 'deleteBackupResponse', requestId: message.requestId, success, error });
                } catch (error: any) {
                    this.showError(error, 'delete-backup', message.requestId);
                }
                break;
            }

            case 'webview:fixValidationStatus': {
                try {
                    console.log('修复验证状态请求:', payload);
                    await this._dataManager.fixValidationStatus(payload.provider);
                    this.refresh();
                    console.log('验证状态修复完成');
                } catch (error: any) {
                    console.error('修复验证状态失败:', error);
                }
                break;
            }

            case 'copyPrompt': {
                try {
                    const prompts = await this._dataManager.getPrompts();
                    const prompt = prompts.find(p => p.id === payload.id);
                    if (prompt) {
                        await vscode.env.clipboard.writeText(prompt.content);
                        this._showNotification('提示词已复制到剪贴板');
                        console.log(`[PromptHub] 成功复制提示词: ${prompt.title}`);
                    } else {
                        console.error(`[PromptHub] 未找到提示词: ${payload.id}`);
                        this.showError(`提示词 ID ${payload.id} 未找到`, 'copyPrompt', message.requestId);
                    }
                } catch (error: any) {
                    console.error(`[PromptHub] 复制提示词失败:`, error);
                    this._showNotification('复制失败，请重试', 'error');
                    this.showError(error, 'copyPrompt', message.requestId);
                }
                // No response needed for this action
                break;
            }

            case 'toggleFavorite': {
                const updatedPrompt = await this._dataManager.toggleFavoriteStatus(payload.id);
                if (updatedPrompt) {
                    this._postMessage({ type: 'toggleFavoriteResponse', requestId: message.requestId, success: true, data: { id: updatedPrompt.id, isFavorite: updatedPrompt.isFavorite } });
                    this._showNotification(updatedPrompt.isFavorite ? '已收藏' : '已取消收藏');
                } else {
                    this.showError(`Prompt with id ${payload.id} not found`, 'toggleFavorite', message.requestId);
                }
                break;
            }

            // Default Case
            default:
                console.warn(`[PromptHub] Received unknown message type: ${message.type}`);
        }
    }

    private _postMessage(message: any): void {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    public async refresh(): Promise<void> {
        if (this._view) {
                const appData = await this._dataManager.getAppData();
                this._postMessage({ type: 'appDataResponse', data: appData, isRefresh: true });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'index.html');
    
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'js', 'app.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'style.css'));

        const nonce = getNonce();
    
        try {
            let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
            
            const cspSource = webview.cspSource;
            htmlContent = htmlContent
                .replace(/__CSP_SOURCE__/g, `default-src 'none'; style-src ${cspSource} 'unsafe-inline' https://*.vscode-cdn.net; font-src ${cspSource} https://*.vscode-cdn.net; script-src 'nonce-${nonce}'; img-src ${cspSource} https:; connect-src ${cspSource}; sandbox allow-same-origin allow-scripts allow-modals;`)
                .replace(/__NONCE__/g, nonce)
                .replace(/__STYLE_URI__/g, styleUri.toString())
                .replace(/__SCRIPT_URI__/g, scriptUri.toString());
    
            return htmlContent;
        } catch (error) {
            console.error('Error reading or processing webview HTML:', error);
            return this._getFallbackHtml(error);
        }
    }

    private _getFallbackHtml(error?: any): string {
        console.error('Failed to render webview, showing fallback HTML.', error);
        return `<!DOCTYPE html><html lang="en"><head><title>Error</title></head><body><h1>Error loading Prompt Hub</h1><p>Details: ${error instanceof Error ? error.message : String(error)}</p></body></html>`;
    }

    private _showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
        const options = { modal: false };
        if (type === 'error') {
            vscode.window.showErrorMessage(message, options);
        } else if (type === 'warning') {
            vscode.window.showWarningMessage(message, options);
        } else {
            vscode.window.showInformationMessage(message, options);
        }
    }

    private async showConfirmationDialog(message: string): Promise<boolean> {
        const options: vscode.MessageOptions = { modal: true };
        // 当 modal 为 true 时，VS Code 会自动添加一个"取消"按钮。
        // 我们只需要提供"确定"按钮即可，避免出现重复的"取消"按钮。
        const selection = await vscode.window.showWarningMessage(
            message,
            options,
            '确定'
        );
        return selection === '确定';
    }

    private showError(error: any, requestType?: string, requestId?: string): void {
        console.error(`Error handling ${requestType || 'unknown'} request (ID: ${requestId || 'N/A'}):`, error);
        const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : '发生未知错误');
    
        // The webview is now responsible for showing user-facing errors.
        // We just send the error back to it.
        // vscode.window.showErrorMessage(`操作失败: ${errorMessage}`);
    
        // Also send an error response to the webview if a request ID was provided
        if (requestId) {
            this._postMessage({
                type: `${requestType}Response`,
                requestId,
                success: false,
                error: errorMessage
            });
        }
    }

    public dispose(): void {
        this._view = undefined;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}