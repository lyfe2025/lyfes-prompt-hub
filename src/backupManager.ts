import * as vscode from 'vscode';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { AppData, BackupInfo, BackupFile } from './types';
import { StorageManager } from './storageManager';
import { DEFAULT_PROMPTS } from './defaultData';

/**
 * 备份管理器 - 负责数据备份和恢复功能
 * 
 * 职责：
 * - 创建和管理数据备份
 * - 恢复数据从备份文件
 * - 备份文件清理
 */
export class BackupManager {
    private backupDir: string;
    private storageManager: StorageManager;

    constructor(private context: vscode.ExtensionContext, backupDir: string, storageManager: StorageManager) {
        this.backupDir = backupDir;
        this.storageManager = storageManager;
    }

    // #region Public API for Webview
    public async getBackupList(): Promise<BackupFile[]> {
        if (!fs.existsSync(this.backupDir)) {
            console.log('Backup directory does not exist, creating it.');
            fs.mkdirSync(this.backupDir, { recursive: true });
            return [];
        }

        const files = await fsPromises.readdir(this.backupDir);
        const backupFiles = files.filter(file => file.endsWith('.json') || file.endsWith('.json.bak'));

        const backupDetails = await Promise.all(
            backupFiles.map(async (file: string) => {
                const filePath = path.join(this.backupDir, file);
                try {
                    const stats = await fsPromises.stat(filePath);
                    let timestamp = stats.mtimeMs; // Default to modification time
                    let size = stats.size;

                    try {
                        const content = await fsPromises.readFile(filePath, 'utf-8');
                        const jsonData = JSON.parse(content);
                        // If the backup file has a valid timestamp, use it.
                        if (jsonData && typeof jsonData.timestamp === 'number') {
                            timestamp = jsonData.timestamp;
                        }
                    } catch (e) {
                        // Content is malformed or unreadable, ignore and use file stats.
                        console.warn(`Could not read or parse backup content for ${file}. Falling back to file stats.`);
                    }

                    return {
                        name: file,
                        timestamp: timestamp,
                        size: size,
                    };
                } catch (error) {
                    console.error(`Failed to stat backup file ${file}:`, error);
                    return null; // Skip files that can't be stat'd
                }
            })
        );

        const validBackups = backupDetails
            .filter((details): details is BackupFile => details !== null)
            .sort((a: BackupFile, b: BackupFile) => b.timestamp - a.timestamp);

        return validBackups;
    }

    /**
     * 重命名备份文件。参数 newDescription 必须为纯文件名（不带 .json），方法内部自动补全 .json 后缀。
     * @param oldName 旧文件名（带 .json）
     * @param newDescription 新文件名（不带 .json）
     */
    public async renameBackup(oldName: string, newDescription: string): Promise<void> {
        // 1. Validate newDescription
        if (!newDescription || newDescription.trim() === '') {
            throw new Error('新的备份名称不能为空。');
        }
        if (newDescription.includes('/') || newDescription.includes('\\')) {
            throw new Error('无效的描述，不能包含路径分隔符。');
        }
        // 允许中文、字母、数字、连字符，不允许特殊符号
        const sanitizedDescription = newDescription.replace(/\.json$|\.json\.bak$/i, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9\-\u4e00-\u9fa5]/g, '');
        if (!sanitizedDescription) {
            throw new Error('处理后备份名称无效。请使用中文、字母、数字或连字符。');
        }
        // 自动补全 .json 后缀
        const newFileName = `${sanitizedDescription}.json`;
        const oldPath = path.join(this.backupDir, oldName);
        const newPath = path.join(this.backupDir, newFileName);
        if (!fs.existsSync(oldPath)) {
            throw new Error(`备份文件未找到: ${oldName}`);
        }
        // If paths are identical (case-insensitive), no action is needed.
        if (oldPath.toLowerCase() === newPath.toLowerCase() && oldPath !== newPath) {
            // If only casing is different, proceed with rename.
        } else if (oldPath.toLowerCase() === newPath.toLowerCase()) {
            return; // Exactly the same, do nothing.
        }
        if (fs.existsSync(newPath)) {
            throw new Error(`一个名为 ${newFileName} 的备份已经存在。`);
        }
        await fsPromises.rename(oldPath, newPath);
    }

    public async restoreFromBackupWithFileName(fileName: string): Promise<AppData | null> {
        const backupPath = path.join(this.backupDir, fileName);
        return this.restoreFromBackup(backupPath);
    }
    
    public async deleteBackup(fileName: string): Promise<void> {
        const backupPath = path.join(this.backupDir, fileName);
        if (await fsPromises.stat(backupPath).catch(() => false)) {
            await fsPromises.unlink(backupPath);
        } else {
            throw new Error(`Backup file not found: ${fileName}`);
        }
    }

    /**
     * 创建一个包含预设提示的备份文件，命名为"默认数据.json"
     */
    public async createDefaultDataBackup(): Promise<void> {
        const defaultData = this.getDefaultAppData();
        const backupPath = path.join(this.backupDir, '默认数据.json');
        
        // 每次启动都强制覆盖，确保使用的是最新的默认数据
        await fsPromises.writeFile(backupPath, JSON.stringify(defaultData, null, 4));
        console.log('[BackupManager] Default data backup file created/updated.');
    }

    /**
     * 创建一个空数据的备份文件，命名为"清空数据.json"
     */
    public async createEmptyDataBackup(): Promise<void> {
        const emptyData = this.getEmptyAppData();
        const backupPath = path.join(this.backupDir, '清空数据.json');
        
        // 每次启动都强制覆盖
        await fsPromises.writeFile(backupPath, JSON.stringify(emptyData, null, 4));
        console.log('[BackupManager] Empty data backup file created/updated.');
    }
    // #endregion

    // #region Backup/Restore
    public async createBackup(data: AppData): Promise<string> {
        const backupDir = this.getBackupDirectory();
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const now = new Date();
        // 优化：文件名格式为 YYYYMMDD-HHmmss.json
        const pad = (n: number) => n.toString().padStart(2, '0');
        const fileName = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;
        const backupPath = path.join(backupDir, fileName);

        const backupData = {
            ...data,
            timestamp: now.getTime() // Embed timestamp into the backup data
        };

        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 4));
        await this.updateBackupHistory(backupPath, now.toISOString());
        await this.cleanupOldBackups();
        return backupPath;
    }

    public async restoreFromBackup(backupPath: string): Promise<AppData | null> {
        if (await fsPromises.stat(backupPath).catch(() => false)) {
            const data = await fsPromises.readFile(backupPath, 'utf-8');
            const appData = JSON.parse(data);
            return appData;
        }
        return null;
    }

    private extractTimestamp(filename: string): string {
        const match = filename.match(/backup-(.*)\.json/);
        if (!match) {
            return 'N/A';
        }

        const pseudoISO = match[1];
        const parts = pseudoISO.split('T');
        if (parts.length !== 2) {
            return 'N/A'; // Invalid format if 'T' is not present
        }

        const datePart = parts[0]; // e.g., "2025-06-22"
        const timePart = parts[1].replace(/-/g, ':'); // e.g., "05-12-30" -> "05:12:30"
        
        // Reconstruct a valid ISO string that the Date constructor can parse reliably.
        return `${datePart}T${timePart}Z`;
    }

    private getBackupDirectory(): string {
        return path.join(this.context.globalStorageUri.fsPath, 'backups');
    }

    private async updateBackupHistory(backupPath: string, timestamp: string): Promise<void> {
        // 可以在这里记录备份历史，暂时留空
    }

    private async cleanupOldBackups(): Promise<void> {
        // 可以在这里清理老的备份文件，暂时留空
    }

    private getEmptyAppData(): AppData {
        const now = new Date().toISOString();
        const version = this.getExtensionVersion();
        return {
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
                version: version,
                lastModified: now,
                totalPrompts: 0
            }
        };
    }

    private getDefaultAppData(): AppData {
        const now = new Date().toISOString();
        const version = this.getExtensionVersion();
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
                version: version,
                lastModified: now,
                totalPrompts: prompts.length,
            },
        };
    }
    
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

    public dispose(): void {
        // 清理资源（如果有的话）
    }
    // #endregion
} 