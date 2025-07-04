import * as vscode from 'vscode';
import { AppData, Prompt, StorageInfo } from './types';
import * as path from 'path';
import * as fs from 'fs';
import { DEFAULT_PROMPTS } from './defaultData';

/**
 * 存储管理器 - 负责核心数据存储和CRUD操作
 * 
 * 职责：
 * - 核心数据的读取和保存
 * - 工作区模式管理
 * - Prompt的CRUD操作
 * - 分类和标签管理
 */
export class StorageManager {
    private static readonly STORAGE_KEYS = {
        APP_DATA: 'promptHub.appData',
        WORKSPACE_DATA: 'promptHub.workspaceData',
        BACKUP_HISTORY: 'promptHub.backupHistory'
    };

    constructor(private context: vscode.ExtensionContext) {}

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

    // #region Core Data Handling
    public async getAppData(): Promise<AppData> {
        try {
            let data: AppData | undefined;

            // 根据工作区模式选择数据源
            if (this.context.workspaceState.get<AppData>(StorageManager.STORAGE_KEYS.WORKSPACE_DATA)) {
                // 如果存在工作区数据，优先使用工作区数据
                data = this.context.workspaceState.get<AppData>(StorageManager.STORAGE_KEYS.WORKSPACE_DATA);
                console.log('[StorageManager] Loading workspace data');
            } else {
                // 否则使用全局数据
                data = this.context.globalState.get<AppData>(StorageManager.STORAGE_KEYS.APP_DATA);
                console.log('[StorageManager] Loading global data');
            }

            // 修复的逻辑：只有在完全没有数据时才视为首次启动，加载默认数据
            // 如果数据存在但prompts为空，说明是用户故意清空的数据，应该保持清空状态
            if (!data) {
                console.log('[StorageManager] No existing data found, loading default data for first time installation.');
                data = this.getBackupDefaultData();
                await this.saveAppData(data);
                console.log('[StorageManager] Default data saved for first time user.');
                return data;
            }

            // 确保数据结构完整性（但不会因为prompts为空而重新加载默认数据）
            data = this.ensureDataIntegrity(data);
            
            // 确保prompts数组存在（如果不存在则初始化为空数组）
            if (!data.prompts) {
                data.prompts = [];
            }
            
            console.log('[StorageManager] Successfully loaded existing data with', data.prompts.length, 'prompts');
            return data;
        } catch (error) {
            console.error('[StorageManager] Error loading app data:', error);
            // 在发生错误时，返回安全的默认数据
            const safeData = this.getBackupDefaultData();
            console.log('[StorageManager] Returning safe backup default data due to error');
            return safeData;
        }
    }

    public async saveAppData(data: AppData): Promise<void> {
        data.metadata = { ...data.metadata, lastModified: new Date().toISOString(), totalPrompts: data.prompts.length };

        if (data.settings.workspaceMode) {
            await this.context.workspaceState.update(StorageManager.STORAGE_KEYS.WORKSPACE_DATA, data);
        } else {
            await this.context.globalState.update(StorageManager.STORAGE_KEYS.APP_DATA, data);
        }
    }

    public async getPrompts(): Promise<Prompt[]> {
        const appData = await this.getAppData();
        return appData.prompts || [];
    }

    public async getAllTags(): Promise<string[]> {
        try {
            const appData = await this.getAppData();
            const allTags = new Set<string>();
            
            // 安全检查：确保prompts是数组
            if (Array.isArray(appData.prompts)) {
                for (const prompt of appData.prompts) {
                    // 安全检查：确保prompt.tags是数组
                    if (prompt && Array.isArray(prompt.tags)) {
                        for (const tag of prompt.tags) {
                            // 确保tag是字符串类型
                            if (typeof tag === 'string' && tag.trim()) {
                                allTags.add(tag.trim());
                            }
                        }
                    }
                }
            }
            
            // 确保返回的是排序后的字符串数组
            return Array.from(allTags).sort();
        } catch (error) {
            console.error('[StorageManager] Error getting all tags:', error);
            // 在出错时返回空数组，确保调用方收到的总是数组
            return [];
        }
    }

    public async updateSetting(key: string, value: any): Promise<void> {
        try {
            console.log(`[StorageManager] Updating setting: ${key} = ${value}`);
            const appData = await this.getAppData();
            
            // 检查settings对象是否存在
            if (!appData.settings) {
                console.error('[StorageManager] Settings object is missing from appData');
                throw new Error('Settings object is missing from application data');
            }
            
            // Type-safe way to update settings
            if (key in appData.settings) {
                console.log(`[StorageManager] Setting ${key} exists in settings, updating...`);
                (appData.settings as any)[key] = value;
                await this.saveAppData(appData);
                console.log(`[StorageManager] Successfully updated setting ${key}`);
            } else {
                console.warn(`[StorageManager] Attempted to update a non-existent setting: ${key}`);
                console.log('[StorageManager] Available settings keys:', Object.keys(appData.settings));
                throw new Error(`Setting ${key} not found.`);
            }
        } catch (error) {
            console.error(`[StorageManager] Error updating setting ${key}:`, error);
            throw error;
        }
    }
    // #endregion

    // #region Workspace Mode
    public async toggleWorkspaceMode(enable: boolean): Promise<void> {
        const currentData = await this.getAppData();
        currentData.settings.workspaceMode = enable;
        if (enable) {
            await this.context.workspaceState.update(StorageManager.STORAGE_KEYS.WORKSPACE_DATA, currentData);
            await this.context.globalState.update(StorageManager.STORAGE_KEYS.APP_DATA, undefined);
        } else {
            await this.context.globalState.update(StorageManager.STORAGE_KEYS.APP_DATA, currentData);
            await this.context.workspaceState.update(StorageManager.STORAGE_KEYS.WORKSPACE_DATA, undefined);
        }
    }

    public async getStorageInfo(): Promise<StorageInfo> {
        const data = await this.getAppData();
        return {
            mode: data.settings.workspaceMode ? 'workspace' : 'global',
            location: data.settings.workspaceMode ? '工作区' : '全局'
        };
    }
    // #endregion

    // #region CRUD Operations
    public async savePrompt(promptData: Partial<Prompt> & { id?: string | number }): Promise<AppData> {
        if (!promptData) {
            throw new Error('Attempted to save invalid prompt data.');
        }

        const appData = await this.getAppData();
        const now = new Date().toISOString();

        if (promptData.id) {
            const promptId = promptData.id.toString();
            const promptIndex = appData.prompts.findIndex(p => p.id === promptId);
            if (promptIndex > -1) {
                appData.prompts[promptIndex] = { ...appData.prompts[promptIndex], ...promptData, id: promptId, updatedAt: now };
            }
        } else {
            const newPrompt: Prompt = {
                id: Date.now().toString(),
                title: promptData.title || '无标题',
                content: promptData.content || '',
                category: promptData.category || '',
                tags: promptData.tags || [],
                createdAt: now,
                updatedAt: now,
                version: 1,
                isFavorite: false,
            };
            appData.prompts.push(newPrompt);
        }

        if (promptData.category && !appData.categories.includes(promptData.category)) {
            appData.categories.push(promptData.category);
        }
        await this.saveAppData(appData);
        return appData;
    }
    
    public async deletePrompt(promptId: number | string): Promise<void> {
        const appData = await this.getAppData();
        appData.prompts = appData.prompts.filter(p => p.id.toString() !== promptId.toString());
        await this.saveAppData(appData);
    }

    public async getCategoryPromptCount(categoryName: string): Promise<number> {
        const appData = await this.getAppData();
        return appData.prompts.filter(p => p.category === categoryName).length;
    }

    public async addCategory(categoryName: string): Promise<AppData> {
        const appData = await this.getAppData();
        if (!categoryName || categoryName.trim() === '') {
            throw new Error('分类名称不能为空。');
        }
        if (appData.categories.includes(categoryName)) {
            throw new Error(`分类 "${categoryName}" 已存在.`);
        }
        appData.categories.push(categoryName);
        await this.saveAppData(appData);
        return appData;
    }

    public async renameCategory(oldName: string, newName: string): Promise<AppData> {
        const appData = await this.getAppData();
        const index = appData.categories.indexOf(oldName);
        if (index > -1) {
            appData.categories[index] = newName;
            appData.prompts.forEach(p => {
                if (p.category === oldName) {
                    p.category = newName;
                }
            });
            await this.saveAppData(appData);
        }
        return appData;
    }

    public async deleteCategory(categoryName: string): Promise<AppData> {
        const appData = await this.getAppData();

        const categoryToDelete = categoryName;
        // 过滤掉要删除的分类
        appData.categories = appData.categories.filter(c => c !== categoryToDelete);
        
        // 可选：将属于该分类的prompt移动到默认分类或进行其他处理
        // 这里我们简单地保留它们，但它们的分类可能不再有效
        appData.prompts.forEach(p => {
            if (p.category === categoryToDelete) {
                // 例如，移动到"未分类"
                // p.category = "未分类"; 
            }
        });

        await this.saveAppData(appData);
        return appData;
    }
    
    public async deleteTag(tagName: string): Promise<AppData> {
        const appData = await this.getAppData();
        // 遍历所有 prompt，移除指定的 tag
        appData.prompts.forEach(p => {
            if (p.tags && p.tags.includes(tagName)) {
                p.tags = p.tags.filter(t => t !== tagName);
            }
        });
        await this.saveAppData(appData);
        return appData;
    }

    public async toggleFavoriteStatus(promptId: string | number): Promise<Prompt | undefined> {
        const appData = await this.getAppData();
        const prompt = appData.prompts.find(p => p.id.toString() === promptId.toString());

        if (prompt) {
            prompt.isFavorite = !prompt.isFavorite;
            prompt.updatedAt = new Date().toISOString();
            await this.saveAppData(appData);
            return prompt;
        } else {
            console.warn(`[StorageManager] Prompt with ID ${promptId} not found for toggleFavoriteStatus.`);
            return undefined;
        }
    }
    
    // #endregion

    // #region Data Management
    /**
     * 重置所有数据（包括预设）
     * @returns 返回重置后的数据
     */
    public async resetAllData(): Promise<AppData> {
        console.log('[StorageManager] Resetting all data to default prompts.');
        const defaultData = this.getBackupDefaultData();

        console.log('[StorageManager] Saving default data structure to overwrite existing data.');
        console.log('[StorageManager] Data being written:', JSON.stringify(defaultData, null, 2));

        await this.saveAppData(defaultData);

        console.log('[StorageManager] All data has been reset to defaults.');
        return defaultData;
    }

    /**
     * 完全清除所有用户数据，恢复到空白状态。
     * 关键变更：此函数现在通过保存一个空的AppData结构来"覆盖"现有数据，
     * 这可以防止因文件暂时不存在而导致的"首次运行"逻辑问题。
     */
    public async clearAllData(): Promise<AppData> {
        console.log('[StorageManager] Clearing all user data...');
        const emptyData = this.getEmptyDefaultData();
        
        console.log('[StorageManager] Saving empty data structure to overwrite existing data.');
        console.log('[StorageManager] Data being written:', JSON.stringify(emptyData, null, 2));
        
        await this.saveAppData(emptyData);
        
        console.log('[StorageManager] All user data has been cleared.');
        return emptyData;
    }

    public async getBackupHistory(): Promise<any[]> {
        return this.context.globalState.get<any[]>(StorageManager.STORAGE_KEYS.BACKUP_HISTORY) || [];
    }
    // #endregion

    /**
     * 确保数据结构的完整性，补充缺失的字段
     * @param data 原始数据
     * @returns 结构完整的数据
     */
    private ensureDataIntegrity(data: AppData): AppData {
        const extensionVersion = this.getExtensionVersion();
        
        // 确保 metadata 存在
        if (!data.metadata) {
            data.metadata = {
                version: '1.0.0',
                lastModified: new Date().toISOString(),
                totalPrompts: data.prompts?.length || 0
            };
        }

        // 确保 settings 存在
        if (!data.settings) {
            data.settings = this.getEmptyDefaultData().settings;
        }

        // 确保 prompts 数组中的每个对象都符合最新的 Prompt 结构
        if (Array.isArray(data.prompts)) {
            data.prompts.forEach(p => {
                // 移除已废弃的 isActive 字段
                if ('isActive' in p) {
                    delete (p as any).isActive;
                }

                if (typeof p.isFavorite !== 'boolean') {
                    p.isFavorite = false;
                }
                if (typeof p.version !== 'number') {
                    p.version = 1;
                }
            });
        }

        
        // 版本比较和迁移逻辑
        if (data.metadata.version !== extensionVersion) {
            console.log(`[StorageManager] Data version mismatch. Data: ${data.metadata.version}, Extension: ${extensionVersion}. Performing migration if necessary.`);
            // 在这里可以添加未来的数据迁移逻辑
            data.metadata.version = extensionVersion; // 更新版本号
        }
        
        return data;
    }

    /**
     * 获取一个不包含任何用户输入数据的默认应用数据对象
     * @returns AppData 一个不包含任何用户输入数据的默认应用数据对象
     */
    private getEmptyDefaultData(): AppData {
        const now = new Date().toISOString();
        return {
            prompts: [],
            categories: [],
            settings: {
                cloudSync: false,
                autoSync: false,
                syncProvider: null,
                workspaceMode: false,
                isValidated: false, // 明确重置
                token: undefined, // 明确重置
                gistId: undefined, // 明确重置
                gitlabUrl: undefined, // 明确重置
                webdavUrl: undefined, // 明确重置
                webdavUsername: undefined, // 明确重置
                customApiUrl: undefined, // 明确重置
                lastSyncTimestamp: undefined, // 明确重置
            },
            metadata: {
                version: this.getExtensionVersion(),
                lastModified: now,
                totalPrompts: 0
            }
        };
    }

    /**
     * 获取备份管理中的默认数据模板（用于首次安装）
     * 与备份管理中的"默认数据"保持一致，确保云同步数据为空，云同步功能关闭
     * @returns AppData 备份管理的默认数据模板
     */
    private getBackupDefaultData(): AppData {
        const now = new Date().toISOString();
        const prompts = DEFAULT_PROMPTS;
        const categories = [...new Set(prompts.map(p => p.category))];

        return {
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
                totalPrompts: prompts.length,
            },
        };
    }
}