import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PromptHubProvider } from './promptHubProvider';
import { DataManager, SyncConflictError, SyncError } from './dataManager';

// let dataManager: DataManager; // REMOVE

// 获取扩展的版本号
function getExtensionVersion(context: vscode.ExtensionContext): string {
    try {
        const packageJsonPath = path.join(context.extensionPath, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return packageJson.version;
    } catch (error) {
        console.error('Failed to read extension version:', error);
        return '1.0.0'; // 回退版本号
    }
}

export function activate(context: vscode.ExtensionContext) {
    
    // dataManager = new DataManager(context); // REMOVE
    
    const promptHubProvider = new PromptHubProvider(context.extensionUri, context);
    
    // 注册 webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'promptHubView', 
            promptHubProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        )
    );
    
    // 注册命令
    context.subscriptions.push(
        vscode.commands.registerCommand('promptHub.openPanel', () => {
            vscode.commands.executeCommand('workbench.view.extension.promptHub');
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('promptHub.refresh', () => {
            promptHubProvider.refresh();
        })
    );

    // 数据管理相关命令
    context.subscriptions.push(
        vscode.commands.registerCommand('promptHub.exportData', async () => {
            try {
                await promptHubProvider.getDataManager().exportData();
            } catch (error) {
                vscode.window.showErrorMessage(`导出数据失败: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('promptHub.importData', async () => {
            try {
                const options: vscode.OpenDialogOptions = {
                    canSelectMany: false,
                    openLabel: '导入',
                    filters: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        'JSON files': ['json']
                    }
                };

                const fileUri = await vscode.window.showOpenDialog(options);
                if (fileUri && fileUri[0]) {
                    const fileContent = fs.readFileSync(fileUri[0].fsPath, 'utf-8');
                    const result = await promptHubProvider.getDataManager().importData(fileContent);
                if (result) {
                    promptHubProvider.refresh();
                    }
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`导入数据失败: ${error.message}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('promptHub.createBackup', async () => {
            try {
                const backupPath = await promptHubProvider.getDataManager().createBackup();
                vscode.window.showInformationMessage(`备份已创建: ${backupPath}`);
            } catch (error) {
                vscode.window.showErrorMessage(`创建备份失败: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('promptHub.restoreBackup', async () => {
            try {
                const dataManager = promptHubProvider.getDataManager();
                const backupList = await dataManager.listBackups();
                if (backupList.length === 0) {
                    vscode.window.showInformationMessage('没有可用的备份文件');
                    return;
                }

                const items: (vscode.QuickPickItem & { backupName: string })[] = backupList.map(backup => ({
                    label: new Date(backup.timestamp).toLocaleString('zh-CN'),
                    description: `${(backup.size / 1024).toFixed(2)} KB`,
                    detail: backup.name,
                    backupName: backup.name
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: '选择要恢复的备份'
                });

                if (selected) {
                    const result = await dataManager.restoreBackup(selected.backupName);
                    if (result.success) {
                        promptHubProvider.refresh();
                        vscode.window.showInformationMessage("备份已成功恢复。");
                    } else {
                        vscode.window.showErrorMessage(`恢复备份失败: ${result.error}`);
                    }
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`恢复备份失败: ${error.message}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('promptHub.setupCloudSync', async () => {
            try {
                const result = await promptHubProvider.getDataManager().setupCloudSync();
                if (result) {
                    promptHubProvider.refresh();
                }
            } catch (error) {
                vscode.window.showErrorMessage(`设置云同步失败: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('promptHub.syncToCloud', async () => {
            const dataManager = promptHubProvider.getDataManager();
            try {
                await dataManager.syncToCloud();
                vscode.window.showInformationMessage('成功同步到云端。');
            } catch (error: any) {
                if (error instanceof SyncConflictError) {
                    const choice = await vscode.window.showWarningMessage(
                        `同步冲突：云端数据比本地新。强制上传将覆盖云端更改。`,
                        { modal: true },
                        '强制上传'
                    );
                    if (choice === '强制上传') {
                        try {
                            await dataManager.syncToCloud(true);
                            vscode.window.showInformationMessage('强制上传成功。');
                        } catch (e: any) {
                            vscode.window.showErrorMessage(`强制上传失败: ${e.message}`);
                        }
                    }
                } else {
                    vscode.window.showErrorMessage(`同步到云端失败: ${error.message}`);
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('promptHub.syncFromCloud', async () => {
            const dataManager = promptHubProvider.getDataManager();
            try {
                await dataManager.syncFromCloud();
                promptHubProvider.refresh();
                vscode.window.showInformationMessage('从云端同步成功。');
            } catch (error: any) {
                if (error instanceof SyncConflictError) {
                    const choice = await vscode.window.showWarningMessage(
                        `同步冲突：本地数据比云端新或无变化。强制下载将覆盖本地更改。`,
                        { modal: true },
                        '强制下载'
                    );
                    if (choice === '强制下载') {
                        try {
                            await dataManager.syncFromCloud(true);
                            promptHubProvider.refresh();
                            vscode.window.showInformationMessage('强制下载成功。');
                        } catch (e: any) {
                            vscode.window.showErrorMessage(`强制下载失败: ${e.message}`);
                        }
                    }
                } else if (error instanceof SyncError && error.code === 'remote_empty') {
                    vscode.window.showInformationMessage('云端无数据，无需同步。');
                }
                else {
                    vscode.window.showErrorMessage(`从云端同步失败: ${error.message}`);
                }
            }
        })
    );



    context.subscriptions.push(
        vscode.commands.registerCommand('promptHub.showStorageInfo', async () => {
            try {
                const dataManager = promptHubProvider.getDataManager();
                const storageInfo = await dataManager.getStorageInfo();
                const appData = await dataManager.getAppData();
                
                const info = [
                    `存储模式：${storageInfo.location}`,
                    `提示词数量：${appData.prompts.length}`,
                    `分类数量：${appData.categories.length}`,
                    `最后修改：${new Date(appData.metadata.lastModified).toLocaleString('zh-CN')}`,
                    `版本：${getExtensionVersion(context)}`
                ].join('\n');

                vscode.window.showInformationMessage(info, { modal: true });
            } catch (error) {
                vscode.window.showErrorMessage(`获取存储信息失败: ${error}`);
            }
        })
    );

    // 将数据管理器添加到context，以便在停用时清理
    context.subscriptions.push({
        dispose: () => promptHubProvider.getDataManager().dispose()
    });

    // 启动时自动同步检查
    // Use a timeout to ensure the webview has had a chance to fully initialize
    setTimeout(() => {
        handleStartupSync(promptHubProvider.getDataManager(), promptHubProvider);
    }, 2000); 
}

async function handleStartupSync(dataManager: DataManager, provider: PromptHubProvider) {
    try {
        const appData = await dataManager.getAppData();
        
        // 安全检查：确保数据完整初始化
        if (!appData || !appData.metadata || !appData.metadata.lastModified || !appData.settings) {
            console.log('[PromptHub] Startup auto-sync skipped: App data not fully initialized');
            return;
        }
        
        if (appData.settings.cloudSync && appData.settings.autoSync) {
            // 检查云同步配置是否完整
            const { syncProvider, gistId, webdavUrl, webdavUsername, customApiUrl } = appData.settings;
            
            let isConfigComplete = false;
            switch (syncProvider) {
                case 'github':
                case 'gitee': 
                case 'gitlab':
                    isConfigComplete = !!gistId;
                    break;
                case 'webdav':
                    isConfigComplete = !!(webdavUrl && webdavUsername);
                    break;
                case 'custom':
                    isConfigComplete = !!customApiUrl;
                    break;
                default:
                    isConfigComplete = false;
            }

            if (!isConfigComplete) {
                console.log(`[PromptHub] Startup auto-sync skipped: ${syncProvider} provider not properly configured`);
                return;
            }

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Prompt Hub",
                cancellable: false
            }, async (progress) => {
                progress.report({ message: '正在与云端同步数据...' });
                try {
                    const result = await dataManager.reconcileCloudSync();
                    switch (result.status) {
                        case 'downloaded':
                            vscode.window.showInformationMessage('已从云端同步最新数据。');
                            provider.refresh();
                            break;
                        case 'uploaded':
                            vscode.window.showInformationMessage('本地数据已成功同步到云端。');
                            break;
                        case 'in_sync':
                            // Data already in sync, no action needed
                            break;
                        case 'conflict':
                            vscode.window.showWarningMessage('自动同步检测到冲突，请手动解决。');
                            break;
                        case 'error':
                            vscode.window.showErrorMessage(`启动时自动同步失败: ${result.message}`);
                            break;
                    }
                } catch (error: any) {
                     vscode.window.showErrorMessage(`启动时自动同步发生未知错误: ${error.message}`);
                }
            });
        }
    } catch (error: any) {
        console.error('[PromptHub] Error in handleStartupSync:', error);
        vscode.window.showErrorMessage(`启动时自动同步发生错误: ${error.message}`);
    }
}

function deactivate() {
    // if (dataManager) { // REMOVED
    //     dataManager.dispose();
    // }
} 