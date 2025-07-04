import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AppData, SyncResult } from './types';
import { SyncError, SyncConflictError } from './errors';

// 导入分离的组件
import { SyncConstants, CloudSyncSettings, ProviderTestResult, ICloudProvider } from './sync/syncTypes';
import { SecretManager } from './sync/secretManager';
import { GitHubProvider } from './sync/providers/githubProvider';
import { GiteeProvider } from './sync/providers/giteeProvider';
import { GitLabProvider } from './sync/providers/gitlabProvider';
import { WebDAVProvider } from './sync/providers/webdavProvider';
import { CustomApiProvider } from './sync/providers/customApiProvider';

/**
 * 云同步管理器 - 负责所有云同步相关的功能
 * 
 * 职责：
 * - 管理云同步设置和验证
 * - 各种云服务的同步实现（GitHub、Gitee、GitLab、WebDAV、Custom API）
 * - 同步冲突检测和处理
 * - 云同步状态管理
 */
export class SyncManager {
    private syncDebouncer?: NodeJS.Timeout;
    private secretManager: SecretManager;
    private providers: Map<string, ICloudProvider>;
    private webdavProvider: WebDAVProvider;
    private customApiProvider: CustomApiProvider;

    constructor(private context: vscode.ExtensionContext) {
        this.secretManager = new SecretManager(context);
        
        // 初始化云服务提供商
        this.providers = new Map();
        this.providers.set('github', new GitHubProvider(context.extensionPath));
        this.providers.set('gitee', new GiteeProvider(context.extensionPath));
        this.providers.set('gitlab', new GitLabProvider(context.extensionPath));
        
        // WebDAV和Custom API需要特殊处理
        this.webdavProvider = new WebDAVProvider();
        this.customApiProvider = new CustomApiProvider();
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



    // #region Cloud Sync Setup
    public async saveCloudSyncSettings(settings: CloudSyncSettings): Promise<string | undefined> {
        const { provider, gistId, gitlabUrl, webdavUrl, webdavUsername, customApiUrl, token } = settings;

        // Clear all secrets first
        await this.secretManager.clearAllSecrets();

        try {
            switch (provider) {
                case 'github':
                    return await this._validateAndStoreGitHub(token, gistId);
                case 'gitee':
                    return await this._validateAndStoreGitee(token, gistId);
                case 'gitlab':
                    const finalGitlabUrl = gitlabUrl || 'https://gitlab.com';
                    return await this._validateAndStoreGitLab(finalGitlabUrl, token, gistId);
                case 'webdav':
                    if (!webdavUrl || !webdavUsername) throw new SyncError('WebDAV URL 和用户名不能为空。', 'WEBDAV_CONFIG_MISSING');
                    await this._validateAndStoreWebDAV(webdavUrl, webdavUsername, token);
                    return undefined; // WebDAV doesn't need an ID
                case 'custom':
                    if (!customApiUrl) throw new SyncError('自定义 API URL 不能为空。', 'CUSTOM_API_URL_MISSING');
                    await this._validateAndStoreCustomApi(customApiUrl, token);
                    return undefined; // Custom API doesn't need an ID
                default:
                    throw new SyncError(`未知的云服务提供商: ${provider}`, 'UNKNOWN_PROVIDER');
            }
        } catch (error) {
            // Passthrough SyncError, wrap others
            if (error instanceof SyncError) {
                throw error;
            } else if (error instanceof Error) {
                throw new SyncError(`验证失败: ${error.message}`, 'VALIDATION_FAILED');
            } else {
                throw new SyncError('发生未知验证错误。', 'UNKNOWN_VALIDATION_ERROR');
            }
        }
    }

    private async _validateAndStoreGitHub(token: string, gistId?: string): Promise<string> {
        const provider = this.providers.get('github')!;
        const result = await provider.test(token, gistId);
        await this.secretManager.storeSecret(SyncConstants.STORAGE_KEYS.GITHUB_TOKEN, token);
        return result.gistId!;
    }

    private async _validateAndStoreGitee(token: string, gistId?: string): Promise<string> {
        console.log('[SyncManager] _validateAndStoreGitee called with token length:', token.length);
        console.log('[SyncManager] _validateAndStoreGitee gistId:', gistId || 'none');
        
        // 清理Token，确保与前端处理一致
        const cleanToken = token.trim().replace(/[\r\n]/g, '');
        console.log('[SyncManager] Token cleaned, length changed from', token.length, 'to', cleanToken.length);
        
        const provider = this.providers.get('gitee')!;
        const validatedGist = await provider.test(cleanToken, gistId);
        
        console.log('[SyncManager] Provider test successful, storing cleaned token');
        // 存储清理后的Token，确保一致性
        await this.secretManager.storeSecret(SyncConstants.STORAGE_KEYS.GITEE_TOKEN, cleanToken);
        
        console.log('[SyncManager] Gitee validation and storage completed successfully');
        return validatedGist.gistId!;
    }

    private async _validateAndStoreGitLab(url: string, token: string, snippetId?: string): Promise<string> {
        console.log('[SyncManager] _validateAndStoreGitLab called with token length:', token.length);
        console.log('[SyncManager] _validateAndStoreGitLab snippetId:', snippetId || 'none');
        console.log('[SyncManager] _validateAndStoreGitLab URL:', url);
        
        // 清理Token，确保与前端处理一致
        const cleanToken = token.trim().replace(/[\r\n]/g, '');
        console.log('[SyncManager] Token cleaned, length changed from', token.length, 'to', cleanToken.length);
        
        const provider = this.providers.get('gitlab') as GitLabProvider;
        const validatedSnippet = await provider.test(cleanToken, snippetId, url);
        
        console.log('[SyncManager] Provider test successful, storing cleaned token');
        // 存储清理后的Token，确保一致性
        await this.secretManager.storeSecret(SyncConstants.STORAGE_KEYS.GITLAB_TOKEN, cleanToken);
        
        console.log('[SyncManager] GitLab validation and storage completed successfully');
        return validatedSnippet.snippetId!;
    }

    private async _validateAndStoreWebDAV(url: string, user: string, pass: string): Promise<void> {
        await this.webdavProvider.testWebDAV(url, user, pass);
        await this.secretManager.storeSecret(SyncConstants.STORAGE_KEYS.WEBDAV_PASSWORD, pass);
    }

    private async _validateAndStoreCustomApi(url: string, key: string): Promise<void> {
        await this.customApiProvider.test(key, url);
        await this.secretManager.storeSecret(SyncConstants.STORAGE_KEYS.CUSTOM_API_KEY, key);
    }
    // #endregion

    // #region Cloud Sync Operations
    public async syncToCloud(appData: AppData, force: boolean = false): Promise<void> {
        if (!appData.settings.cloudSync || !appData.settings.syncProvider) {
            return;
        }

        // 安全检查：确保appData有完整的metadata
        if (!appData.metadata || !appData.metadata.lastModified) {
            throw new SyncError('Local data metadata is incomplete.', 'metadata_missing');
        }

        if (!force) {
            const remoteData = await this.getRemoteAppData(appData);
            if (remoteData && remoteData.metadata && remoteData.metadata.lastModified) {
                const localModified = new Date(appData.metadata.lastModified);
                const remoteModified = new Date(remoteData.metadata.lastModified);

                if (localModified <= remoteModified) {
                    throw new SyncConflictError(
                        'Local data is not newer than cloud data. Upload would overwrite remote changes.',
                        appData.metadata.lastModified,
                        remoteData.metadata.lastModified
                    );
                }
            }
        }

        const content = JSON.stringify(appData, null, 4);

        switch (appData.settings.syncProvider) {
            case 'github':
            case 'gitee':
            case 'gitlab':
                const provider = this.providers.get(appData.settings.syncProvider)!;
                await provider.syncTo(content, appData, this.secretManager);
                break;
            case 'webdav':
                await this.webdavProvider.syncTo(content, appData, this.secretManager);
                break;
            case 'custom':
                await this.customApiProvider.syncTo(content, appData, this.secretManager);
                break;
            default:
                throw new SyncError('Unsupported sync provider.', 'unsupported_provider');
        }
    }

    public async syncFromCloud(appData: AppData, force: boolean = false): Promise<AppData> {
        const remoteData = await this.getRemoteAppData(appData);

        if (!remoteData) {
            throw new SyncError('Could not retrieve remote data. The cloud may be empty.', 'remote_empty');
        }

        // 安全检查：确保两边都有完整的metadata
        if (!appData.metadata || !appData.metadata.lastModified) {
            console.warn('[SyncManager] Local metadata incomplete, accepting remote data');
            return remoteData;
        }

        if (!remoteData.metadata || !remoteData.metadata.lastModified) {
            console.warn('[SyncManager] Remote metadata incomplete, keeping local data');
            throw new SyncError('Remote data metadata is incomplete.', 'remote_metadata_incomplete');
        }

        if (!force) {
            const localModified = new Date(appData.metadata.lastModified);
            const remoteModified = new Date(remoteData.metadata.lastModified);

            if (remoteModified <= localModified) {
                throw new SyncConflictError(
                    'Remote data is not newer than local data. Download would overwrite local changes.',
                    appData.metadata.lastModified,
                    remoteData.metadata.lastModified
                );
            }
        }

        return remoteData;
    }

    public async getRemoteAppData(appData: AppData): Promise<AppData | null> {
        if (!appData.settings.cloudSync || !appData.settings.syncProvider) {
            return null;
        }

        switch (appData.settings.syncProvider) {
            case 'github':
            case 'gitee':
            case 'gitlab':
                const provider = this.providers.get(appData.settings.syncProvider)!;
                return provider.syncFrom(appData, this.secretManager);
            case 'webdav':
                return this.webdavProvider.syncFrom(appData, this.secretManager);
            case 'custom':
                return this.customApiProvider.syncFrom(appData, this.secretManager);
            default:
                throw new SyncError('Unsupported sync provider.', 'unsupported_provider');
        }
    }
    // #endregion

    // #region Sync Reconciliation
    public async reconcileCloudSync(appData: AppData): Promise<SyncResult> {
        if (!appData.settings.cloudSync || !appData.settings.syncProvider) {
            return { status: 'disabled', message: 'Cloud sync is not enabled.' };
        }

        // 安全检查：确保appData有完整的metadata
        if (!appData.metadata || !appData.metadata.lastModified) {
            console.warn('[SyncManager] Local metadata is incomplete, skipping sync reconciliation');
            return { status: 'error', message: 'Local data metadata is incomplete.' };
        }

        try {
            const remoteData = await this.getRemoteAppData(appData);

            if (!remoteData) {
                // No remote data, so we can safely upload.
                await this.syncToCloud(appData, true); // Force push as it's the first time
                return { status: 'uploaded', message: 'Initial data uploaded to cloud.' };
            }

            // 安全检查：确保remoteData有完整的metadata
            if (!remoteData.metadata || !remoteData.metadata.lastModified) {
                console.warn('[SyncManager] Remote metadata is incomplete, treating as first upload');
                await this.syncToCloud(appData, true);
                return { status: 'uploaded', message: 'Local data uploaded to cloud (remote metadata incomplete).' };
            }

            const localModified = new Date(appData.metadata.lastModified);
            const remoteModified = new Date(remoteData.metadata.lastModified);

            if (localModified > remoteModified) {
                await this.syncToCloud(appData, false);
                return { status: 'uploaded', message: 'Local changes uploaded.' };
            } else if (remoteModified > localModified) {
                // This would require updating the local data, which needs to be handled by the calling code
                return { status: 'downloaded', message: 'Remote changes available for download.' };
            } else {
                return { status: 'in_sync', message: 'Data is already in sync.' };
            }

        } catch (error) {
            if (error instanceof SyncConflictError) {
                console.warn(`[SyncManager] Sync conflict during reconciliation: ${error.message}`);
                return { status: 'conflict', message: error.message };
            }
            console.error(`[SyncManager] Error during sync reconciliation: ${error}`);
            return { status: 'error', message: error instanceof Error ? error.message : String(error) };
        }
    }

    /**
     * 启动自动同步debounced任务
     * @param appData 应用数据
     * @param onConflict 冲突处理回调
     */
    public async startAutoSync(
        appData: AppData,
        onConflict: (message: string) => void
    ): Promise<void> {
        if (!appData.settings.cloudSync || !appData.settings.autoSync) {
            return;
        }

        // 检查当前配置的同步提供商是否完整
        const { syncProvider, gistId, webdavUrl, webdavUsername } = appData.settings;
        
        // 验证配置完整性
        let isConfigValid = false;
        switch (syncProvider) {
            case 'github':
            case 'gitee':
            case 'gitlab':
                isConfigValid = !!gistId;
                break;
            case 'webdav':
                isConfigValid = !!(webdavUrl && webdavUsername);
                break;
            case 'custom':
                isConfigValid = !!appData.settings.customApiUrl;
                break;
            default:
                isConfigValid = false;
        }

        if (!isConfigValid) {
            console.warn(`[SyncManager] Auto-sync skipped: ${syncProvider} provider not properly configured`);
            return;
        }

        if (this.syncDebouncer) {
            clearTimeout(this.syncDebouncer);
        }

        this.syncDebouncer = setTimeout(() => {
            this.reconcileCloudSync(appData)
                .then(result => {
                    if (result.status === 'conflict') {
                        onConflict('自动同步检测到冲突，请手动同步。');
                    }
                })
                .catch(err => {
                    if (err instanceof SyncConflictError) {
                        console.warn('[SyncManager] Auto-sync conflict detected. Needs manual intervention.');
                        onConflict('自动同步检测到冲突，请手动同步。');
                    } else {
                        console.error('[SyncManager] Auto-sync failed:', err);
                    }
                });
        }, 5000); // 5-second debounce delay
    }

    public async resetCloudSync(): Promise<void> {
        // 清除所有保存的密钥
        await this.secretManager.clearAllSecrets();
    }

    public dispose(): void {
        if (this.syncDebouncer) {
            clearTimeout(this.syncDebouncer);
        }
    }
    // #endregion
} 