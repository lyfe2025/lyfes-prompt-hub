import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import { AppData } from '../../types';
import { SyncError } from '../../errors';
import { ProviderTestResult, ICloudProvider, ISecretManager } from '../syncTypes';

/**
 * GitLab 同步提供商
 */
export class GitLabProvider implements ICloudProvider {
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

    public async test(token: string, snippetId?: string, url: string = 'https://gitlab.com'): Promise<ProviderTestResult> {
        console.log('[GitLabProvider] test() called with:', {
            tokenLength: token.length,
            tokenPreview: token.substring(0, 10) + '...',
            snippetId: snippetId || 'none',
            url: url
        });

        // 清理Token
        const cleanToken = token.trim().replace(/[\r\n]/g, '');
        console.log('[GitLabProvider] Token cleaned:', {
            originalLength: token.length,
            cleanedLength: cleanToken.length,
            lengthChanged: token.length !== cleanToken.length
        });
        
        if (!cleanToken) {
            throw new SyncError('GitLab Token 不能为空。', 'INVALID_CREDENTIALS');
        }

        // 基本 Token 格式验证（GitLab tokens 通常以 glpat- 开头）
        if (cleanToken.length < 20) {
            throw new SyncError('GitLab Token 格式无效：Token长度过短。', 'INVALID_TOKEN_FORMAT');
        }

        // 确保URL格式正确
        url = url && url.trim() ? url.trim() : 'https://gitlab.com';
        const apiUrl = url.endsWith('/') ? `${url}api/v4` : `${url}/api/v4`;
        console.log('[GitLabProvider] Using API URL:', apiUrl);
        
        try {
            console.log('[GitLabProvider] Testing token with user endpoint...');
            const response = await axios.get(`${apiUrl}/user`, {
                headers: { 
                    'PRIVATE-TOKEN': cleanToken
                },
                timeout: 30000,
                validateStatus: (status) => status < 500 // 让我们处理4xx错误
            });

            console.log('[GitLabProvider] User endpoint response:', {
                status: response.status,
                hasData: !!response.data,
                username: response.data?.username || 'unknown'
            });

            if (response.status === 401) {
                throw new SyncError('GitLab Token 无效或已过期。请检查Token是否正确并具有api权限。', 'INVALID_CREDENTIALS');
            }
            if (response.status === 403) {
                throw new SyncError('GitLab Token 权限不足。请确保Token具有api权限。', 'FORBIDDEN');
            }
            if (response.status >= 400) {
                throw new SyncError(`GitLab API 返回错误状态: ${response.status}`, 'API_ERROR');
            }
            
            // 验证成功，返回结果
            if (snippetId) {
                console.log('[GitLabProvider] Using existing snippet:', snippetId);
                return { snippetId, isNew: false };
            } else {
                console.log('[GitLabProvider] Creating new snippet...');
                // 创建新snippet
                const createResponse = await axios.post(`${apiUrl}/snippets`, {
                    title: 'Prompt Hub Sync Data',
                    file_name: 'prompt-hub-data.json',
                    content: JSON.stringify({ prompts: [], categories: [], version: this.getExtensionVersion() }, null, 2),
                    visibility: 'private'
                }, {
                    headers: { 
                        'PRIVATE-TOKEN': cleanToken
                    },
                    timeout: 30000,
                    validateStatus: (status) => status < 500
                });
                
                console.log('[GitLabProvider] Snippet creation response:', {
                    status: createResponse.status,
                    snippetId: createResponse.data?.id || 'unknown'
                });

                if (createResponse.status >= 400) {
                    throw new SyncError(`创建 GitLab Snippet 失败: HTTP ${createResponse.status}`, 'SNIPPET_CREATION_FAILED');
                }
                
                return { snippetId: createResponse.data.id.toString(), isNew: true };
            }
        } catch (error: any) {
            console.error('[GitLabProvider] Test failed:', {
                name: error.name,
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });

            // 如果已经是 SyncError，直接抛出
            if (error instanceof SyncError) {
                throw error;
            }
            
            // 网络错误处理
                if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                throw new SyncError(`无法连接到 GitLab 服务器 (${url})。请检查网络连接和URL是否正确。`, 'CONNECTION_ERROR');
                }
                
                if (error.code === 'ETIMEDOUT') {
                throw new SyncError('GitLab 连接超时。请检查网络连接。', 'TIMEOUT_ERROR');
                }
                
            // HTTP 错误处理
            if (error.response) {
                const status = error.response.status;
                if (status === 401) {
                    throw new SyncError('GitLab Token 无效或已过期。请检查Token是否正确。', 'INVALID_CREDENTIALS');
            }
                if (status === 403) {
                    throw new SyncError('GitLab Token 权限不足。请确保Token具有api权限。', 'FORBIDDEN');
            }
                if (status === 404) {
                    throw new SyncError('GitLab API 端点未找到。请检查URL是否正确。', 'API_NOT_FOUND');
                }
                throw new SyncError(`GitLab API 错误: HTTP ${status} - ${error.response.statusText}`, 'API_ERROR');
            }

            // 其他错误
            throw new SyncError(`GitLab 连接失败: ${error.message}`, 'CONNECTION_ERROR');
        }
    }

    public async syncTo(content: string, appData: AppData, secretManager: ISecretManager): Promise<void> {
        const token = await secretManager.getSecret('gitlabToken');
        const snippetId = appData.settings.gistId;
        const gitlabUrl = appData.settings.gitlabUrl || 'https://gitlab.com';

        console.log('[GitLabProvider] syncTo() called:', {
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
            snippetId: snippetId || 'none',
            gitlabUrl: gitlabUrl
        });

        if (!token || !snippetId) {
            throw new SyncError('GitLab token 或 Snippet ID 未配置。', 'config_missing');
        }

        // 清理Token
        const cleanToken = token.trim().replace(/[\r\n]/g, '');
        console.log('[GitLabProvider] Token cleaned for syncTo:', {
            originalLength: token.length,
            cleanedLength: cleanToken.length
        });

        const apiUrl = gitlabUrl.endsWith('/') ? `${gitlabUrl}api/v4` : `${gitlabUrl}/api/v4`;
        console.log('[GitLabProvider] Using API URL for syncTo:', apiUrl);

        try {
            console.log('[GitLabProvider] Uploading to snippet:', snippetId);
            const response = await axios.put(`${apiUrl}/snippets/${snippetId}`, {
                files: [{
                    file_path: 'prompt-hub-data.json',
                    content: content
                }]
            }, {
                headers: { 
                    'PRIVATE-TOKEN': cleanToken
                },
                timeout: 30000,
                validateStatus: (status) => status < 500
            });

            console.log('[GitLabProvider] Upload response:', {
                status: response.status,
                statusText: response.statusText
            });

            if (response.status >= 400) {
                if (response.status === 401) {
                    throw new SyncError('GitLab Token 无效或已过期。', 'INVALID_CREDENTIALS');
                }
                if (response.status === 403) {
                    throw new SyncError('GitLab Token 权限不足。', 'FORBIDDEN');
                }
                if (response.status === 404) {
                    throw new SyncError(`GitLab Snippet ${snippetId} 不存在或无权限访问。`, 'SNIPPET_NOT_FOUND');
                }
                throw new SyncError(`GitLab 同步失败，状态码: ${response.status}`, 'sync_failed');
            }

            console.log('[GitLabProvider] Upload successful');
        } catch (error: any) {
            console.error('[GitLabProvider] syncTo failed:', {
                name: error.name,
                message: error.message,
                status: error.response?.status
            });

            if (error instanceof SyncError) {
                throw error;
            }

            // 网络错误处理
            if (error.code === 'ETIMEDOUT') {
                throw new SyncError('GitLab 上传超时。请检查网络连接。', 'TIMEOUT_ERROR');
            }
            if (error.code === 'ENOTFOUND') {
                throw new SyncError(`无法连接到 GitLab 服务器 (${gitlabUrl})。`, 'CONNECTION_ERROR');
            }

            throw new SyncError(`GitLab 同步失败: ${error.message}`, 'CONNECTION_ERROR');
        }
    }

    public async syncFrom(appData: AppData, secretManager: ISecretManager): Promise<AppData | null> {
        const token = await secretManager.getSecret('gitlabToken');
        const snippetId = appData.settings.gistId;
        const gitlabUrl = appData.settings.gitlabUrl || 'https://gitlab.com';

        console.log('[GitLabProvider] syncFrom() called:', {
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
            snippetId: snippetId || 'none',
            gitlabUrl: gitlabUrl
        });

        if (!token || !snippetId) {
            throw new SyncError('GitLab token 或 Snippet ID 未配置。', 'config_missing');
        }

        // 清理Token
        const cleanToken = token.trim().replace(/[\r\n]/g, '');
        console.log('[GitLabProvider] Token cleaned for syncFrom:', {
            originalLength: token.length,
            cleanedLength: cleanToken.length
        });

        const apiUrl = gitlabUrl.endsWith('/') ? `${gitlabUrl}api/v4` : `${gitlabUrl}/api/v4`;
        console.log('[GitLabProvider] Using API URL for syncFrom:', apiUrl);

        try {
            console.log('[GitLabProvider] Fetching snippet metadata:', snippetId);
            const response = await axios.get(`${apiUrl}/snippets/${snippetId}`, {
                headers: { 
                    'PRIVATE-TOKEN': cleanToken
                },
                timeout: 30000,
                validateStatus: (status) => status < 500
            });

            console.log('[GitLabProvider] Snippet metadata response:', {
                status: response.status,
                hasRawUrl: !!response.data?.raw_url
            });

            if (response.status >= 400) {
                if (response.status === 401) {
                    throw new SyncError('GitLab Token 无效或已过期。', 'INVALID_CREDENTIALS');
                }
                if (response.status === 403) {
                    throw new SyncError('GitLab Token 权限不足。', 'FORBIDDEN');
                }
                if (response.status === 404) {
                    throw new SyncError(`GitLab Snippet ${snippetId} 不存在或无权限访问。`, 'SNIPPET_NOT_FOUND');
                }
                throw new SyncError(`获取 GitLab Snippet 失败，状态码: ${response.status}`, 'sync_failed');
            }

            // 直接获取snippet的raw内容
            if (response.data.raw_url) {
                console.log('[GitLabProvider] Fetching snippet content from:', response.data.raw_url);
                const contentResponse = await axios.get(response.data.raw_url, {
                headers: { 
                        'PRIVATE-TOKEN': cleanToken
                    },
                    timeout: 30000,
                    validateStatus: (status) => status < 500
                });

                console.log('[GitLabProvider] Content response:', {
                    status: contentResponse.status,
                    contentLength: contentResponse.data ? contentResponse.data.toString().length : 0
                });

                if (contentResponse.status >= 400) {
                    throw new SyncError(`获取 GitLab Snippet 内容失败，状态码: ${contentResponse.status}`, 'sync_failed');
                }

                try {
                    const data = typeof contentResponse.data === 'string' 
                        ? JSON.parse(contentResponse.data) 
                        : contentResponse.data;
                    console.log('[GitLabProvider] Successfully parsed content:', {
                        hasPrompts: !!data?.prompts,
                        promptCount: Array.isArray(data?.prompts) ? data.prompts.length : 0
                    });
                    return data;
                } catch (parseError) {
                    console.error('[GitLabProvider] Failed to parse JSON:', parseError);
                    throw new SyncError('GitLab Snippet 内容格式无效（不是有效的JSON）。', 'INVALID_JSON');
                }
            }
            
            console.log('[GitLabProvider] No raw_url in response');
            return null;
        } catch (error: any) {
            console.error('[GitLabProvider] syncFrom failed:', {
                name: error.name,
                message: error.message,
                status: error.response?.status
            });

            if (error instanceof SyncError) {
                throw error;
            }

            // 网络错误处理
            if (error.code === 'ETIMEDOUT') {
                throw new SyncError('GitLab 下载超时。请检查网络连接。', 'TIMEOUT_ERROR');
            }
            if (error.code === 'ENOTFOUND') {
                throw new SyncError(`无法连接到 GitLab 服务器 (${gitlabUrl})。`, 'CONNECTION_ERROR');
            }

            throw new SyncError(`GitLab 同步失败: ${error.message}`, 'CONNECTION_ERROR');
        }
    }
} 