import * as vscode from 'vscode';
import { AppData } from '../types';

/**
 * 同步相关的常量定义
 */
export class SyncConstants {
    public static readonly SYNC_FILENAME = 'prompt-hub.json';
    
    public static readonly STORAGE_KEYS = {
        GITHUB_TOKEN: 'promptHub.githubToken',
        GITEE_TOKEN: 'promptHub.giteeToken',
        GITLAB_TOKEN: 'promptHub.gitlabToken',
        WEBDAV_PASSWORD: 'promptHub.webdavPassword',
        CUSTOM_API_KEY: 'promptHub.customApiKey'
    };
}

/**
 * 云同步设置接口
 */
export interface CloudSyncSettings {
    provider: 'github' | 'gitee' | 'gitlab' | 'webdav' | 'custom';
    gistId?: string;
    gitlabUrl?: string;
    webdavUrl?: string;
    webdavUsername?: string;
    customApiUrl?: string;
    token: string;
}

/**
 * 提供商测试结果接口
 */
export interface ProviderTestResult {
    gistId?: string;
    snippetId?: string;
    isNew: boolean;
}

/**
 * Secret管理器接口
 */
export interface ISecretManager {
    getSecret(key: 'githubToken' | 'giteeToken' | 'gitlabToken' | 'webdavPassword' | 'customApiKey'): Promise<string | undefined>;
    clearAllSecrets(): Promise<void>;
    storeSecret(key: string, value: string): Promise<void>;
}

/**
 * 云服务提供商基础接口
 */
export interface ICloudProvider {
    test(token: string, id?: string): Promise<ProviderTestResult>;
    syncTo(content: string, appData: AppData, secretManager: ISecretManager): Promise<void>;
    syncFrom(appData: AppData, secretManager: ISecretManager): Promise<AppData | null>;
} 