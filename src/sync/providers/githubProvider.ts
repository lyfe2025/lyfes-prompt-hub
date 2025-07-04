import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import { AppData } from '../../types';
import { SyncError } from '../../errors';
import { ProviderTestResult, ICloudProvider, ISecretManager } from '../syncTypes';

/**
 * GitHub 同步提供商
 */
export class GitHubProvider implements ICloudProvider {
    constructor(private extensionPath: string) {}

    /**
     * 获取扩展的版本号
     */
    private getExtensionVersion(): string {
        try {
            const packageJsonPath = path.join(this.extensionPath, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            return packageJson.version;
        } catch (error) {
            console.error('Failed to read extension version:', error);
            return '1.0.0'; // 回退版本号
        }
    }

    public async test(token: string, gistId?: string): Promise<ProviderTestResult> {
        // 清理Token
        const cleanToken = token.trim().replace(/[\r\n]/g, '');
            
        if (!cleanToken) {
            throw new SyncError('GitHub Token 不能为空。', 'INVALID_CREDENTIALS');
            }

        // 简单的token验证 - 只验证token是否有效
        try {
            const response = await axios.get('https://api.github.com/user', {
                headers: { 
                    'Authorization': `Bearer ${cleanToken}`, 
                    'Accept': 'application/vnd.github+json'
                },
                timeout: 30000
            });

            // 验证成功，返回结果
        if (gistId) {
                    return { gistId, isNew: false };
                } else {
                // 创建新Gist
                const createResponse = await axios.post('https://api.github.com/gists', {
                description: 'Lyfe\'s Prompt Hub Sync',
                public: false,
                    files: { 
                        'prompt-hub-data.json': { 
                            content: JSON.stringify({ prompts: [], categories: [], version: this.getExtensionVersion() }, null, 2) 
                        } 
                    }
                }, {
                    headers: { 
                        'Authorization': `Bearer ${cleanToken}`, 
                        'Accept': 'application/vnd.github+json'
                    },
                    timeout: 30000
                });
                
                return { gistId: createResponse.data.id, isNew: true };
            }
        } catch (error: any) {
            if (error.response?.status === 401) {
                throw new SyncError('GitHub Token 无效或已过期。', 'INVALID_CREDENTIALS');
            }
            if (error.response?.status === 403) {
                throw new SyncError('GitHub Token 权限不足。', 'FORBIDDEN');
            }
            throw new SyncError(`GitHub 连接失败: ${error.message}`, 'CONNECTION_ERROR');
        }
    }

    public async syncTo(content: string, appData: AppData, secretManager: ISecretManager): Promise<void> {
        const token = await secretManager.getSecret('githubToken');
        const gistId = appData.settings.gistId;

        if (!token || !gistId) {
            throw new SyncError('GitHub token 或 Gist ID 未配置。', 'config_missing');
        }

        // 清理Token
        const cleanToken = token.trim().replace(/[\r\n]/g, '');

        try {
            const response = await axios.patch(`https://api.github.com/gists/${gistId}`, {
                files: {
                    'prompt-hub-data.json': {
                        content: content
                    }
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${cleanToken}`,
                    'Accept': 'application/vnd.github+json'
                },
                timeout: 30000
            });

            if (response.status >= 400) {
                throw new SyncError(`GitHub 同步失败，状态码: ${response.status}`, 'sync_failed');
            }
        } catch (error: any) {
            if (error instanceof SyncError) {
                throw error;
            }
            throw new SyncError(`GitHub 同步失败: ${error.message}`, 'CONNECTION_ERROR');
        }
    }

    public async syncFrom(appData: AppData, secretManager: ISecretManager): Promise<AppData | null> {
        const token = await secretManager.getSecret('githubToken');
        const gistId = appData.settings.gistId;

        if (!token || !gistId) {
            throw new SyncError('GitHub token 或 Gist ID 未配置。', 'config_missing');
        }

        // 清理Token
        const cleanToken = token.trim().replace(/[\r\n]/g, '');
        
        try {
            const response = await axios.get(`https://api.github.com/gists/${gistId}`, {
                headers: { 
                    'Authorization': `Bearer ${cleanToken}`,
                    'Accept': 'application/vnd.github+json'
                },
                timeout: 30000
            });
            
            const content = response.data.files['prompt-hub-data.json']?.content;
            return content ? JSON.parse(content) : null;
        } catch (error: any) {
            throw new SyncError(`GitHub 同步失败: ${error.message}`, 'CONNECTION_ERROR');
        }
    }
} 