import * as vscode from 'vscode';
import { SyncConstants, ISecretManager } from './syncTypes';

/**
 * 密钥管理器 - 负责管理扩展的所有密钥存储
 */
export class SecretManager implements ISecretManager {
    constructor(private context: vscode.ExtensionContext) {}

    public async getSecret(key: 'githubToken' | 'giteeToken' | 'gitlabToken' | 'webdavPassword' | 'customApiKey'): Promise<string | undefined> {
        const keyMap = {
            githubToken: SyncConstants.STORAGE_KEYS.GITHUB_TOKEN,
            giteeToken: SyncConstants.STORAGE_KEYS.GITEE_TOKEN,
            gitlabToken: SyncConstants.STORAGE_KEYS.GITLAB_TOKEN,
            webdavPassword: SyncConstants.STORAGE_KEYS.WEBDAV_PASSWORD,
            customApiKey: SyncConstants.STORAGE_KEYS.CUSTOM_API_KEY,
        };
        const secretKey = keyMap[key];
        if (!secretKey) return undefined;
        return this.context.secrets.get(secretKey);
    }

    public async storeSecret(key: string, value: string): Promise<void> {
        await this.context.secrets.store(key, value);
    }

    public async clearAllSecrets(): Promise<void> {
        await this.context.secrets.delete(SyncConstants.STORAGE_KEYS.GITHUB_TOKEN);
        await this.context.secrets.delete(SyncConstants.STORAGE_KEYS.GITEE_TOKEN);
        await this.context.secrets.delete(SyncConstants.STORAGE_KEYS.GITLAB_TOKEN);
        await this.context.secrets.delete(SyncConstants.STORAGE_KEYS.WEBDAV_PASSWORD);
        await this.context.secrets.delete(SyncConstants.STORAGE_KEYS.CUSTOM_API_KEY);
    }
} 