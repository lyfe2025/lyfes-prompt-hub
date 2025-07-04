import axios, { AxiosError } from 'axios';
import { SyncError } from '../errors';

/**
 * 同步错误处理工具类
 */
export class SyncErrorUtils {
    /**
     * 处理 Axios 错误并转换为 SyncError
     */
    public static handleAxiosError(error: any, provider: string, operation: 'read' | 'write' | 'test'): SyncError {
        if (axios.isAxiosError(error)) {
            const err = error as AxiosError;
            const status = err.response?.status;
            switch (status) {
                case 401:
                    return new SyncError(`${provider} 凭证无效或已过期，请检查 Token/密码。`, 'INVALID_CREDENTIALS');
                case 403:
                    return new SyncError(`您没有权限访问此 ${provider} 资源，请检查权限设置。`, 'FORBIDDEN');
                case 404:
                    return new SyncError(`${provider} ${operation === 'read' ? '资源' : 'Gist/Snippet'} 未找到，请检查 ID 或 URL。`, 'NOT_FOUND');
                default:
                    if (err.request) {
                        return new SyncError(`无法连接到 ${provider} 服务器，请检查网络连接或 ${provider} URL。`, 'CONNECTION_FAILED');
                    }
                    return new SyncError(`${provider} 请求失败: ${err.message}`, 'REQUEST_FAILED');
            }
        }
        return new SyncError(`${provider} 发生未知错误: ${error.message}`, 'UNKNOWN_ERROR');
    }
} 