import axios from 'axios';
import { AppData } from '../../types';
import { SyncError } from '../../errors';
import { ProviderTestResult, ICloudProvider, ISecretManager } from '../syncTypes';

/**
 * Custom API 同步提供商
 */
export class CustomApiProvider implements ICloudProvider {
    constructor() {}

    public async test(token: string, url: string): Promise<ProviderTestResult> {
        // 清理Token和URL
        const cleanToken = token.trim().replace(/[\r\n]/g, '');
        const cleanUrl = url.trim().replace(/[\r\n]/g, '');
            
        if (!cleanToken) {
            throw new SyncError('Custom API Key 不能为空。', 'INVALID_CREDENTIALS');
            }
        if (!cleanUrl) {
            throw new SyncError('Custom API URL 不能为空。', 'INVALID_CREDENTIALS');
            }
            
        // 简单的API验证
        try {
            const response = await axios.get(cleanUrl, {
                headers: { 
                    'Authorization': `Bearer ${cleanToken}`
                },
                timeout: 30000
            });

            return { isNew: false };
        } catch (error: any) {
            if (error.response?.status === 401) {
                throw new SyncError('Custom API Key 无效或已过期。', 'INVALID_CREDENTIALS');
            }
            if (error.response?.status === 403) {
                throw new SyncError('Custom API Key 权限不足。', 'FORBIDDEN');
            }
            if (error.response?.status === 404) {
                throw new SyncError('Custom API 端点未找到。', 'NOT_FOUND');
            }
            throw new SyncError(`Custom API 连接失败: ${error.message}`, 'CONNECTION_ERROR');
        }
    }

    public async syncTo(content: string, appData: AppData, secretManager: ISecretManager): Promise<void> {
        const apiKey = await secretManager.getSecret('customApiKey');
        const apiUrl = appData.settings.customApiUrl;

        if (!apiKey || !apiUrl) {
            throw new SyncError('自定义 API 密钥或 URL 未配置。', 'config_missing');
        }

        // 清理API Key
        const cleanApiKey = apiKey.trim().replace(/[\r\n]/g, '');

        try {
            const response = await axios.post(apiUrl, { content }, {
                headers: { 
                    'Authorization': `Bearer ${cleanApiKey}`
                },
                timeout: 30000
            });

            if (response.status >= 400) {
                throw new SyncError(`Custom API 同步失败，状态码: ${response.status}`, 'sync_failed');
            }
        } catch (error: any) {
            if (error instanceof SyncError) {
                throw error;
            }
            throw new SyncError(`Custom API 同步失败: ${error.message}`, 'CONNECTION_ERROR');
        }
    }

    public async syncFrom(appData: AppData, secretManager: ISecretManager): Promise<AppData | null> {
        const apiKey = await secretManager.getSecret('customApiKey');
        const apiUrl = appData.settings.customApiUrl;

        if (!apiKey || !apiUrl) {
            throw new SyncError('自定义 API 密钥或 URL 未配置。', 'config_missing');
        }

        // 清理API Key
        const cleanApiKey = apiKey.trim().replace(/[\r\n]/g, '');

        try {
            const response = await axios.get(apiUrl, {
                headers: { 
                    'Authorization': `Bearer ${cleanApiKey}`
                },
                timeout: 30000
            });

            const content = response.data?.content || response.data;
            return content ? (typeof content === 'string' ? JSON.parse(content) : content) : null;
        } catch (error: any) {
            throw new SyncError(`Custom API 同步失败: ${error.message}`, 'CONNECTION_ERROR');
        }
    }
} 