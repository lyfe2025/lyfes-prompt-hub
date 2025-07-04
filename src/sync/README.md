# 同步模块 (Sync Module)

本模块包含所有云同步相关的功能，已从原来的 `syncManager.ts` 文件中分离出来。

## 文件结构

### 核心组件
- `syncTypes.ts` - 类型定义和常量
- `syncErrorUtils.ts` - 错误处理工具
- `secretManager.ts` - 密钥管理器
- `index.ts` - 统一导出文件

### 云服务提供商 (Providers)
- `providers/githubProvider.ts` - GitHub Gist 同步
- `providers/giteeProvider.ts` - Gitee Gist 同步  
- `providers/gitlabProvider.ts` - GitLab Snippet 同步
- `providers/webdavProvider.ts` - WebDAV 同步
- `providers/customApiProvider.ts` - 自定义 API 同步

## 主要接口

### ICloudProvider
所有云服务提供商都实现此接口：
```typescript
interface ICloudProvider {
    test(token: string, id?: string): Promise<ProviderTestResult>;
    syncTo(content: string, appData: AppData, secretManager: ISecretManager): Promise<void>;
    syncFrom(appData: AppData, secretManager: ISecretManager): Promise<AppData | null>;
}
```

### ISecretManager
密钥管理接口：
```typescript
interface ISecretManager {
    getSecret(key: string): Promise<string | undefined>;
    clearAllSecrets(): Promise<void>;
    storeSecret(key: string, value: string): Promise<void>;
}
```

## 使用方式

主 SyncManager 现在作为协调器，使用这些分离的组件：

```typescript
import { SyncManager } from '../syncManager';

// SyncManager 会自动初始化所有提供商
const syncManager = new SyncManager(context);

// 使用现有的 API
await syncManager.saveCloudSyncSettings(settings);
await syncManager.syncToCloud(appData);
const remoteData = await syncManager.syncFromCloud(appData);
```

## 分离目标

1. **模块化** - 每个云服务提供商独立实现
2. **可维护性** - 代码结构清晰，职责分离
3. **可扩展性** - 容易添加新的云服务提供商
4. **功能保持** - 原有功能完全保持不变
5. **错误处理** - 统一的错误处理机制 