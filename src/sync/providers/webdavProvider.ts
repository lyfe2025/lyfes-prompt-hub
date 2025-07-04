// @ts-ignore
import { createClient, WebDAVClient, AuthType } from 'webdav';
import { AppData } from '../../types';
import { SyncError } from '../../errors';
import { ProviderTestResult, ICloudProvider, ISecretManager } from '../syncTypes';

/**
 * WebDAV 同步提供商
 */
export class WebDAVProvider implements ICloudProvider {
    constructor() {}

    public async test(token: string, id?: string): Promise<ProviderTestResult> {
        // For WebDAV, this method will be called differently - see validateAndStoreWebDAV
        throw new SyncError('WebDAV test should use dedicated testWebDAV method', 'NOT_IMPLEMENTED');
    }

    public async testWebDAV(url: string, username: string, password: string): Promise<ProviderTestResult> {
        // 清理参数
        const cleanUrl = url.trim().replace(/[\r\n]/g, '');
        const cleanUsername = username.trim().replace(/[\r\n]/g, '');
        const cleanPassword = password.trim().replace(/[\r\n]/g, '');
        
        if (!cleanUrl) {
            throw new SyncError('WebDAV URL 不能为空。', 'INVALID_CREDENTIALS');
        }
        if (!cleanUsername) {
            throw new SyncError('WebDAV 用户名不能为空。', 'INVALID_CREDENTIALS');
                }
        if (!cleanPassword) {
            throw new SyncError('WebDAV 密码不能为空。', 'INVALID_CREDENTIALS');
            }
            
        // 简单的连接验证
        try {
            const client: WebDAVClient = createClient(cleanUrl, { 
                username: cleanUsername, 
                password: cleanPassword
            });
            
            // 测试连接 - 尝试列出根目录
            await client.getDirectoryContents('/');
            
            return { isNew: false };
        } catch (error: any) {
            if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
                throw new SyncError('WebDAV 认证失败。', 'INVALID_CREDENTIALS');
            }
            if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
                throw new SyncError('WebDAV 权限不足。', 'FORBIDDEN');
            }
            if (error.message?.includes('404') || error.message?.includes('Not Found')) {
                throw new SyncError('WebDAV 路径不存在。', 'NOT_FOUND');
            }
            throw new SyncError(`WebDAV 连接失败: ${error.message}`, 'CONNECTION_ERROR');
        }
    }

    public async syncTo(content: string, appData: AppData, secretManager: ISecretManager): Promise<void> {
        const pass = await secretManager.getSecret('webdavPassword');
        const url = appData.settings.webdavUrl;
        const user = appData.settings.webdavUsername;

        if (!url || !user || !pass) {
            throw new SyncError('WebDAV 配置不完整，请检查配置信息。', 'config_missing');
        }

        // 清理密码
        const cleanPassword = pass.trim().replace(/[\r\n]/g, '');
        
        try {
            const client: WebDAVClient = createClient(url, { username: user, password: cleanPassword });
            await client.putFileContents('/prompt-hub-data.json', content, { overwrite: true });
        } catch (error: any) {
            throw new SyncError(`WebDAV 同步失败: ${error.message}`, 'CONNECTION_ERROR');
        }
    }

    public async syncFrom(appData: AppData, secretManager: ISecretManager): Promise<AppData | null> {
        const pass = await secretManager.getSecret('webdavPassword');
        const url = appData.settings.webdavUrl;
        const user = appData.settings.webdavUsername;

        if (!url || !user || !pass) {
            throw new SyncError('WebDAV 配置不完整，请检查配置信息。', 'config_missing');
        }
        
        // 清理密码
        const cleanPassword = pass.trim().replace(/[\r\n]/g, '');
        
        try {
            const client: WebDAVClient = createClient(url, { username: user, password: cleanPassword });

            if (await client.exists('/prompt-hub-data.json')) {
                const content = await client.getFileContents('/prompt-hub-data.json', { format: "text" });
                return content ? JSON.parse(content as string) : null;
            }
            return null;
        } catch (error: any) {
            throw new SyncError(`WebDAV 同步失败: ${error.message}`, 'CONNECTION_ERROR');
        }
    }
} 