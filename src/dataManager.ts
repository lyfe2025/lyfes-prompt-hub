import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AppData, Prompt, StorageInfo, SystemStatus, SyncResult, BackupInfo, BackupFile } from './types';
import { SyncError, SyncConflictError } from './errors';
import { StorageManager } from './storageManager';
import { BackupManager } from './backupManager';
import { SyncManager } from './syncManager';
import { DEFAULT_PROMPTS } from './defaultData';

// 导出错误类以保持向后兼容性
export { SyncError, SyncConflictError };

/**
 * 数据管理器 - 协调各个功能模块的主要管理器
 * 
 * 职责：
 * - 协调存储管理器、备份管理器和同步管理器
 * - 提供统一的API接口
 * - 处理模块间的数据流转
 * - 维护向后兼容性
 */
export class DataManager {
    private storageManager: StorageManager;
    private backupManager: BackupManager;
    private syncManager: SyncManager;

    constructor(private context: vscode.ExtensionContext) {
        this.storageManager = new StorageManager(context);
        
        const backupDir = path.join(this.context.globalStorageUri.fsPath, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        this.backupManager = new BackupManager(context, backupDir, this.storageManager);
        this.syncManager = new SyncManager(context);
        
        // 创建默认数据和清空数据文件
        this.createSpecialBackupFiles().catch((err: any) => console.error("Failed to create special backup files:", err));
    }

    /**
     * 获取扩展的版本号
     */
    private getExtensionVersion(): string {
        try {
            const packageJsonPath = path.join(this.context.extensionPath, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            return packageJson.version;
        } catch (error) {
            console.error('Failed to read extension version:', error);
            return '1.0.0'; // 回退版本号
        }
    }

    // #region Core Data Handling - 委托给StorageManager
    public async getAppData(): Promise<AppData> {
        return this.storageManager.getAppData();
    }

    public async getPrompts(): Promise<Prompt[]> {
        return this.storageManager.getPrompts();
    }

    public async getAllTags(): Promise<string[]> {
        return this.storageManager.getAllTags();
    }

    public async saveAppData(data: AppData): Promise<void> {
        await this.storageManager.saveAppData(data);
        
        // 处理自动同步
        if (data.settings.cloudSync && data.settings.autoSync) {
            await this.syncManager.startAutoSync(data, (message: string) => {
                vscode.window.showWarningMessage(message);
            });
        }
    }

    public async updateSetting(key: string, value: any): Promise<void> {
        return this.storageManager.updateSetting(key, value);
    }
    // #endregion

    // #region Workspace Mode - 委托给StorageManager
    public async toggleWorkspaceMode(enable: boolean): Promise<void> {
        return this.storageManager.toggleWorkspaceMode(enable);
    }

    public async getStorageInfo(): Promise<StorageInfo> {
        return this.storageManager.getStorageInfo();
    }
    // #endregion

    // #region CRUD Operations - 委托给StorageManager
    public async savePrompt(promptData: Partial<Prompt> & { id?: string | number }): Promise<AppData> {
        return this.storageManager.savePrompt(promptData);
    }
    
    public async deletePrompt(promptId: number | string): Promise<void> {
        return this.storageManager.deletePrompt(promptId);
    }

    public async getCategoryPromptCount(categoryName: string): Promise<number> {
        return this.storageManager.getCategoryPromptCount(categoryName);
    }

    public async addCategory(categoryName: string): Promise<AppData> {
        return this.storageManager.addCategory(categoryName);
    }

    public async renameCategory(oldName: string, newName: string): Promise<AppData> {
        return this.storageManager.renameCategory(oldName, newName);
    }

    public async deleteCategory(categoryName: string): Promise<AppData> {
        return this.storageManager.deleteCategory(categoryName);
    }
    
    public async deleteTag(tagName: string): Promise<AppData> {
        return this.storageManager.deleteTag(tagName);
    }

    public async toggleFavoriteStatus(promptId: string | number): Promise<Prompt | undefined> {
        return this.storageManager.toggleFavoriteStatus(promptId);
    }
    // #endregion

    // #region Backup & Restore - 委托给BackupManager
    public async listBackups(): Promise<BackupFile[]> {
        return this.backupManager.getBackupList();
    }

    /**
     * 重命名备份文件。newName 必须为纯文件名（不带 .json），由后端自动补全 .json。
     */
    public async renameBackup(oldName: string, newName: string): Promise<{ success: boolean; error?: string }> {
        try {
            await this.backupManager.renameBackup(oldName, newName);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    public async restoreFromBackupWithFileName(fileName: string): Promise<AppData | null> {
        return this.backupManager.restoreFromBackupWithFileName(fileName);
    }

    /**
     * 恢复备份文件（用于命令行调用）
     */
    public async restoreBackup(fileName: string): Promise<{ success: boolean; error?: string }> {
        try {
            const restoredData = await this.restoreFromBackupWithFileName(fileName);
            if (restoredData) {
                await this.saveAppData(restoredData);
                return { success: true };
            } else {
                return { success: false, error: '备份文件未找到或无效' };
            }
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    public async deleteBackup(fileName: string): Promise<{ success: boolean; error?: string }> {
        try {
            await this.backupManager.deleteBackup(fileName);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    public async createBackup(data?: AppData): Promise<string> {
        const appData = data || await this.getAppData();
        return this.backupManager.createBackup(appData);
    }
    // #endregion

    // #region Import/Export
    public async exportData(): Promise<string> {
        const appData = await this.getAppData();
        
        // 创建导出专用的数据格式，包含导出时间戳
        const exportData = {
            ...appData,
            exportInfo: {
                exportedAt: new Date().toISOString(),
                exportedVersion: appData.metadata.version,
                totalPrompts: appData.prompts.length,
                totalCategories: appData.categories.length
            }
        };

        const result = await vscode.window.showSaveDialog({
            filters: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'JSON': ['json']
            },
            defaultUri: vscode.Uri.file(`prompt-hub-export-${new Date().toISOString().split('T')[0]}.json`)
        });
        
        if (result) {
            fs.writeFileSync(result.fsPath, JSON.stringify(exportData, null, 4));
            vscode.window.showInformationMessage(`数据已成功导出到: ${result.fsPath}`);
            console.log(`[DataManager] Exported ${exportData.prompts.length} prompts and ${exportData.categories.length} categories`);
            return result.fsPath;
        }
        return '';
    }

    public async importData(fileContent: string): Promise<AppData | null> {
        if (!fileContent) {
            return null;
        }

        try {
            const rawData = JSON.parse(fileContent);

            // 验证导入的数据结构
            if (!rawData || typeof rawData !== 'object') {
                throw new Error('导入的数据格式无效');
            }

            // 检查是否包含exportInfo（新导出格式）
            let importedData: AppData;
            if (rawData.exportInfo) {
                // 新导出格式：移除exportInfo，提取实际数据
                const { exportInfo, ...appData } = rawData;
                importedData = appData as AppData;
                console.log(`[DataManager] Importing data exported on ${exportInfo.exportedAt} with version ${exportInfo.exportedVersion}`);
            } else {
                // 旧格式或直接的AppData格式
                importedData = rawData as AppData;
            }

            // 确保基本数据结构存在
            if (!Array.isArray(importedData.prompts)) {
                importedData.prompts = [];
            }
            if (!Array.isArray(importedData.categories)) {
                importedData.categories = [];
            }

            const currentData = await this.getAppData();
            
            // 合并 prompts，使用 Map 确保唯一性（基于ID）
            const allPrompts = [...currentData.prompts, ...importedData.prompts];
            const uniquePrompts = Array.from(new Map(allPrompts.map(p => [p.id, p])).values());
            currentData.prompts = uniquePrompts;

            // 合并 categories，使用 Set 确保唯一性
            currentData.categories = [...new Set([...currentData.categories, ...importedData.categories])];
            
            // 如果导入数据包含设置信息，选择性合并设置（除了敏感信息）
            if (importedData.settings) {
                // 只合并非敏感的设置项
                const safeSettings = {
                    workspaceMode: importedData.settings.workspaceMode
                };
                currentData.settings = { ...currentData.settings, ...safeSettings };
            }
            
            await this.saveAppData(currentData);
            vscode.window.showInformationMessage(`数据导入成功！共导入 ${importedData.prompts.length} 个提示词和 ${importedData.categories.length} 个分类。`);
            return currentData;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : '无效的JSON文件或内容格式错误';
            vscode.window.showErrorMessage(`导入失败: ${errorMsg}`);
            console.error('[DataManager] Import error:', error);
            return null;
        }
    }
    // #endregion

    // #region Cloud Sync - 委托给SyncManager
    public async setupCloudSync(): Promise<AppData | void> {
        const provider = await vscode.window.showQuickPick(['GitHub', 'Gitee', 'GitLab', 'WebDAV', 'Custom'], {
            placeHolder: '选择一个云同步服务商'
        });

        if (!provider) return;

        switch (provider) {
            case 'GitHub':
                await this.setupGitHubSync();
                break;
            case 'Gitee':
                await this.setupGiteeSync();
                break;
            case 'GitLab':
                await this.setupGitLabSync();
                break;
            case 'WebDAV':
                await this.setupWebDAVSync();
                break;
            case 'Custom':
                await this.setupCustomApiSync();
                break;
            default:
                vscode.window.showErrorMessage('未指定有效的云服务提供商。');
        }
    }

    public async saveCloudSyncSettings(settings: any): Promise<AppData> {
        console.log('[DataManager] saveCloudSyncSettings called with:', {
            provider: settings.provider,
            tokenLength: settings.token ? settings.token.length : 0,
            gistId: settings.gistId || 'none',
            hasGitlabUrl: !!settings.gitlabUrl,
            hasWebdavUrl: !!settings.webdavUrl,
            hasCustomApiUrl: !!settings.customApiUrl
        });
        
        const appData = await this.getAppData();
        const { provider, gistId, gitlabUrl, webdavUrl, webdavUsername, customApiUrl, token } = settings;

        try {
            console.log('[DataManager] Calling syncManager.saveCloudSyncSettings...');
            // 调用SyncManager验证和存储设置，获取实际的ID（可能是自动创建的）
            const validatedIds = await this.syncManager.saveCloudSyncSettings(settings);
            console.log('[DataManager] SyncManager validation successful, validatedIds:', validatedIds);
            
            appData.settings.syncProvider = provider;
            appData.settings.isValidated = true;
            appData.settings.cloudSync = true;
            // 注意：token不应该存储在settings中，应该由SecretManager安全管理
            
            // 根据提供商设置相应的配置，使用验证后的ID
            switch (provider) {
                case 'github':
                case 'gitee':
                    // 使用验证函数返回的真实ID（可能是自动创建的）
                    appData.settings.gistId = validatedIds || gistId;
                    break;
                case 'gitlab':
                    // 使用验证函数返回的真实ID（可能是自动创建的）
                    appData.settings.gistId = validatedIds || gistId;
                    appData.settings.gitlabUrl = gitlabUrl || 'https://gitlab.com';
                    break;
                case 'webdav':
                    appData.settings.webdavUrl = webdavUrl;
                    appData.settings.webdavUsername = webdavUsername;
                    break;
                case 'custom':
                    appData.settings.customApiUrl = customApiUrl;
                    break;
            }
            
            console.log('[DataManager] Saving updated appData...');
            await this.saveAppData(appData);
            console.log('[DataManager] Cloud sync settings saved successfully');
            return appData;
        } catch (error) {
            console.error('[DataManager] Cloud sync settings save failed:', error);
            console.error('[DataManager] Error details:', {
                message: error instanceof Error ? error.message : String(error),
                name: error instanceof Error ? error.name : undefined,
                stack: error instanceof Error ? error.stack : undefined
            });
            
            // 清除所有云同步设置
            appData.settings.cloudSync = false;
            appData.settings.syncProvider = null;
            appData.settings.isValidated = false;
            appData.settings.token = undefined;
            appData.settings.gistId = undefined;
            appData.settings.gitlabUrl = undefined;
            appData.settings.webdavUrl = undefined;
            appData.settings.webdavUsername = undefined;
            appData.settings.customApiUrl = undefined;
            
            console.log('[DataManager] Cleared cloud sync settings due to error');
            await this.saveAppData(appData);
            throw error;
        }
    }

    private async setupGitHubSync(): Promise<AppData | void> {
        const token = await vscode.window.showInputBox({ 
            prompt: '输入你的GitHub Personal Access Token (需要gist权限)', 
            password: true, 
            ignoreFocusOut: true 
        });
        if (!token) return;

        const gistId = await vscode.window.showInputBox({ 
            prompt: '（可选）输入现有Gist ID进行关联',
            ignoreFocusOut: true 
        });

        const appData = await this.getAppData();
        await this.saveCloudSyncSettings({
            provider: 'github',
            token,
            gistId
        });

        vscode.window.showInformationMessage('GitHub Gist 同步已成功设置。');
        return appData;
    }

    private async setupGiteeSync(): Promise<AppData | void> {
        const token = await vscode.window.showInputBox({ 
            prompt: '输入你的Gitee Private Token (需要gists权限)', 
            password: true, 
            ignoreFocusOut: true 
        });
        if (!token) return;

        const gistId = await vscode.window.showInputBox({ 
            prompt: '（可选）输入现有Gist ID进行关联',
            ignoreFocusOut: true 
        });

        await this.saveCloudSyncSettings({
            provider: 'gitee',
            token,
            gistId
        });

        vscode.window.showInformationMessage('Gitee Gist 同步已成功设置。');
    }

    private async setupGitLabSync(): Promise<AppData | void> {
        const gitlabUrl = await vscode.window.showInputBox({ 
            prompt: '输入你的GitLab实例URL，如果使用gitlab.com请留空',
            placeHolder: 'https://gitlab.example.com',
            ignoreFocusOut: true
        }) || 'https://gitlab.com';

        const token = await vscode.window.showInputBox({ 
            prompt: '输入你的GitLab Personal Access Token (需要api scope)', 
            password: true, 
            ignoreFocusOut: true 
        });
        if (!token) return;

        const snippetId = await vscode.window.showInputBox({ 
            prompt: '（可选）输入现有Snippet ID进行关联',
            ignoreFocusOut: true 
        });

        await this.saveCloudSyncSettings({
            provider: 'gitlab',
            token,
            gistId: snippetId,
            gitlabUrl
        });

        vscode.window.showInformationMessage('GitLab Snippets 同步已成功设置。');
    }

    private async setupWebDAVSync(): Promise<AppData | void> {
        const webdavUrl = await vscode.window.showInputBox({ 
            prompt: '输入你的WebDAV服务器URL',
            ignoreFocusOut: true 
        });
        if (!webdavUrl) return;
        
        const webdavUsername = await vscode.window.showInputBox({ 
            prompt: '输入WebDAV用户名',
            ignoreFocusOut: true 
        });
        if (!webdavUsername) return;
        
        const webdavPassword = await vscode.window.showInputBox({ 
            prompt: '输入WebDAV密码', 
            password: true,
            ignoreFocusOut: true 
        });
        if (!webdavPassword) return;

        await this.saveCloudSyncSettings({
            provider: 'webdav',
            token: webdavPassword,
            webdavUrl,
            webdavUsername
        });

        vscode.window.showInformationMessage('WebDAV 同步已成功设置。');
    }

    private async setupCustomApiSync(): Promise<AppData | void> {
        const apiUrl = await vscode.window.showInputBox({ 
            prompt: '输入你的自定义API端点URL', 
            ignoreFocusOut: true 
        });
        if (!apiUrl) return;

        const apiKey = await vscode.window.showInputBox({ 
            prompt: '输入API密钥/Token', 
            password: true, 
            ignoreFocusOut: true 
        });
        if (!apiKey) return;

        await this.saveCloudSyncSettings({
            provider: 'custom',
            token: apiKey,
            customApiUrl: apiUrl
        });

        vscode.window.showInformationMessage('自定义API 同步已成功设置。');
    }

    public async disableCloudSync(): Promise<AppData | void> {
        const appData = await this.getAppData();
        if (!appData.settings.cloudSync) { return; }

        const confirmation = await vscode.window.showWarningMessage(
            '您确定要禁用云同步吗？这将清除您本地存储的所有同步设置（Token、密码等）。',
            { modal: true },
            '确定'
        );

        if (confirmation !== '确定') { return; }
        
        appData.settings.cloudSync = false;
        appData.settings.syncProvider = null;
        appData.settings.isValidated = false;
        appData.settings.token = undefined;
        appData.settings.gistId = undefined;
        appData.settings.gitlabUrl = undefined;
        appData.settings.webdavUrl = undefined;
        appData.settings.webdavUsername = undefined;
        appData.settings.customApiUrl = undefined;

        await this.syncManager.resetCloudSync();
        await this.saveAppData(appData);

        return appData;
    }

    public async syncToCloud(force: boolean = false): Promise<void> {
        const appData = await this.getAppData();
        await this.syncManager.syncToCloud(appData, force);
        
        // 更新最后同步时间戳
        appData.settings.lastSyncTimestamp = new Date().toISOString();
        await this.saveAppData(appData);
    }

    public async syncFromCloud(force: boolean = false): Promise<AppData> {
        const appData = await this.getAppData();
        const remoteData = await this.syncManager.syncFromCloud(appData, force);
        
        // 更新最后同步时间戳
        remoteData.settings.lastSyncTimestamp = new Date().toISOString();
        await this.saveAppData(remoteData);
        return remoteData;
    }

    public async getSystemStatus(): Promise<SystemStatus> {
        const appData = await this.getAppData();
        const storageMode = appData.settings.workspaceMode ? 'workspace' : 'global';
        let cloudSyncStatus = '未启用';
        if (appData.settings.cloudSync && appData.settings.syncProvider) {
            cloudSyncStatus = `已启用 (${appData.settings.syncProvider})`;
        }
        return {
            storageMode,
            cloudSync: {
                status: cloudSyncStatus,
            }
        };
    }

    public async reconcileCloudSync(): Promise<SyncResult> {
        const appData = await this.getAppData();
        const result = await this.syncManager.reconcileCloudSync(appData);
        
        // 如果需要下载数据，则执行下载操作
        if (result.status === 'downloaded') {
            try {
                const remoteData = await this.syncManager.syncFromCloud(appData, false);
                // 更新最后同步时间戳
                remoteData.settings.lastSyncTimestamp = new Date().toISOString();
                await this.saveAppData(remoteData);
                return { ...result, appData: remoteData };
            } catch (error) {
                console.error('Failed to download data during reconciliation:', error);
                return { status: 'error', message: `下载失败: ${error instanceof Error ? error.message : String(error)}` };
            }
        }
        
        // 在任何成功的同步操作后都更新时间戳
        // 包括上传和数据已同步的情况
        if (result.status === 'uploaded' || result.status === 'in_sync') {
            appData.settings.lastSyncTimestamp = new Date().toISOString();
            await this.saveAppData(appData);
        }
        
        return result;
    }

    public async resetCloudSync(): Promise<AppData> {
        const appData = await this.getAppData();
        if (!appData.settings.cloudSync) {
            throw new Error('云同步未启用');
        }

        appData.settings.cloudSync = false;
        appData.settings.syncProvider = null;
        appData.settings.isValidated = false;
        appData.settings.token = undefined;
        appData.settings.gistId = undefined;
        appData.settings.gitlabUrl = undefined;
        appData.settings.webdavUrl = undefined;
        appData.settings.webdavUsername = undefined;
        appData.settings.customApiUrl = undefined;
        appData.settings.autoSync = false;
        appData.settings.lastSyncTimestamp = undefined;

        await this.syncManager.resetCloudSync();
        await this.saveAppData(appData);

        return appData;
    }

    /**
     * 修复验证状态 - 对于已有有效配置但isValidated为false的情况
     * @param provider - 同步提供商
     */
    public async fixValidationStatus(provider: string): Promise<void> {
        const appData = await this.getAppData();
        
        // 检查是否有有效配置
        let hasValidConfig = false;
        switch (provider) {
            case 'github':
            case 'gitee':
            case 'gitlab':
                hasValidConfig = !!(appData.settings.gistId && appData.settings.gistId.trim());
                break;
            case 'webdav':
                hasValidConfig = !!(appData.settings.webdavUrl && appData.settings.webdavUrl.trim() && 
                                  appData.settings.webdavUsername && appData.settings.webdavUsername.trim());
                break;
            case 'custom':
                hasValidConfig = !!(appData.settings.customApiUrl && appData.settings.customApiUrl.trim());
                break;
        }
        
        if (hasValidConfig && !appData.settings.isValidated) {
            console.log(`修复${provider}的验证状态，设置isValidated为true`);
            appData.settings.isValidated = true;
            await this.saveAppData(appData);
        }
    }

    /**
     * 重置所有数据为初始状态
     * @returns Promise<AppData> 重置后的应用数据
     */
    public async resetAllData(): Promise<AppData> {
        console.log("DataManager: resetAllData called.");
        try {
            const resetData = await this.storageManager.resetAllData();
            await this.syncManager.resetCloudSync();
            console.log("DataManager: resetAllData completed successfully.");
            return resetData;
        } catch (error) {
            console.error("DataManager: Error in resetAllData.", error);
            throw error;
        }
    }

    /**
     * 清空所有数据
     * @returns Promise<AppData> 清空后的应用数据
     */
    public async clearAllData(): Promise<AppData> {
        console.log("DataManager: clearAllData called.");
        try {
            await this.storageManager.clearAllData();
            await this.syncManager.resetCloudSync();
            const appData = await this.getAppData();
            console.log("DataManager: clearAllData completed successfully.");
            return appData;
        } catch (error) {
            console.error("DataManager: Error in clearAllData.", error);
            throw error;
        }
    }
    // #endregion

    public dispose(): void {
        this.backupManager.dispose();
        this.syncManager.dispose();
    }

    /**
     * 创建特殊备份文件（默认数据和清空数据）
     * 这一操作在每次扩展激活时运行，以确保特殊备份文件始终与当前版本代码中的默认数据保持同步。
     */
    private async createSpecialBackupFiles(): Promise<void> {
        try {
            const backupDir = path.join(this.context.globalStorageUri.fsPath, 'backups');
            
            // 默认数据文件 - 使用 src/defaultData.ts 作为唯一数据源
            const defaultDataPath = path.join(backupDir, '默认数据.json');
            console.log(`[DataManager] Ensuring special backup file '默认数据.json' is up to date.`);
            
            const now = new Date().toISOString();
            const prompts = DEFAULT_PROMPTS;
            const categories = [...new Set(prompts.map(p => p.category))];

            const defaultData = {
                prompts,
                categories,
                settings: {
                    cloudSync: false,
                    autoSync: true,
                    syncProvider: null,
                    workspaceMode: false,
                    isValidated: false,
                    token: undefined,
                    gistId: undefined,
                    gitlabUrl: undefined,
                    webdavUrl: undefined,
                    webdavUsername: undefined,
                    customApiUrl: undefined,
                    lastSyncTimestamp: undefined,
                },
                metadata: {
                    version: this.getExtensionVersion(),
                    lastModified: now,
                    totalPrompts: prompts.length
                }
            };
            fs.writeFileSync(defaultDataPath, JSON.stringify(defaultData, null, 4));
            console.log(`[DataManager] Successfully updated '默认数据.json'.`);

            // 清空数据文件
            const clearDataPath = path.join(backupDir, '清空数据.json');
            console.log(`[DataManager] Ensuring special backup file '清空数据.json' is up to date.`);
            const clearData = {
                prompts: [],
                categories: [],
                settings: {
                    cloudSync: false,
                    autoSync: false,
                    syncProvider: null,
                    workspaceMode: false,
                    isValidated: false,
                    token: undefined,
                    gistId: undefined,
                    gitlabUrl: undefined,
                    webdavUrl: undefined,
                    webdavUsername: undefined,
                    customApiUrl: undefined,
                    lastSyncTimestamp: undefined,
                },
                metadata: {
                    version: this.getExtensionVersion(),
                    lastModified: now,
                    totalPrompts: 0
                }
            };
            fs.writeFileSync(clearDataPath, JSON.stringify(clearData, null, 4));
            console.log(`[DataManager] Successfully updated '清空数据.json'.`);
        } catch (error) {
            console.error('[DataManager] Failed to create or update special backup files:', error);
            vscode.window.showErrorMessage('无法创建或更新特殊的备份文件，功能可能受限。');
        }
    }
}