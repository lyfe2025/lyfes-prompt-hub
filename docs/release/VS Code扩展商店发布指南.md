# VS Code 扩展商店发布指南

## 🎯 发布前准备

### 0. 账户选择建议 💡

在开始之前，您需要选择一个账户来管理扩展发布：

- **Microsoft 账户**（推荐）：
  - 与 Azure DevOps 完全集成
  - 支持所有 Azure 服务
  - 适合企业和个人开发者

- **GitHub 账户**：
  - 如果您主要使用 GitHub 进行开发
  - 同样支持 VS Code Marketplace 发布
  - 对开源开发者更友好

**重要**: 无论选择哪种账户，后续的 Azure DevOps 组织创建和 PAT 管理流程都是相同的。

### 1. 安装发布工具
```bash
# 全局安装 VS Code Extension Manager
npm install -g vsce

# 验证安装
vsce --version
```

### 2. 创建 Azure DevOps 账户和 PAT

#### 方法一：通过 VS Code Marketplace 管理页面（推荐） 🎯
这是最直接和可靠的方法：

1. **直接访问** VS Code Marketplace 管理页面：https://marketplace.visualstudio.com/manage
2. **选择登录方式**：
   - **Microsoft 账户登录**（推荐，与 Azure DevOps 完全集成）
   - **GitHub 账户登录**（如果您更习惯使用 GitHub，同样有效）
3. **首次访问需要手动操作**：
   - 登录后会看到 Marketplace 管理界面
   - **需要手动点击特定位置**来触发组织创建流程
   - 通常是点击某个需要权限的功能或设置选项
4. **创建 Azure DevOps 组织**：
   - **手动触发**：点击右上角用户头像或相关设置选项
   - 系统会提示需要创建 Azure DevOps 组织
   - 输入组织名称（建议使用有意义的名称，如：your-name-org）
   - 选择地区（建议选择离您最近的区域）
   - 点击 "Continue" 继续
5. **创建项目**（如果系统要求）：
   - 系统可能会要求创建第一个项目
   - 项目名可以随意填写（如：my-extensions）
   - 选择项目可见性（Private 或 Public）
   - 点击 "Create project"
6. **完成组织创建后**：
   - 返回到 Marketplace 管理界面
   - 现在可以看到发布者信息和相关选项

#### 创建 Personal Access Token (PAT)
**重要**：只有完成上述组织和项目创建后，才能看到 PAT 创建选项

**方式一：通过 Azure DevOps 用户设置（推荐）**

1. **完成组织创建后**，需要手动访问 PAT 管理页面：
   - **方式一**：直接访问 `dev.azure.com/您的组织ID/usersSettings/tokens`
   - **方式二**：在 Marketplace 管理页面点击右上角用户头像 → **"Personal access tokens"**
   - **方式三**：在 Azure DevOps 组织页面点击用户头像 → **"Personal access tokens"**

2. **在 Personal Access Tokens 页面**：
   - 左侧菜单中选择 **"Personal access tokens"**（在 Security 部分下）
   - 您会看到 "Manage tokens" 界面

3. **创建新的 Token**：
   - 点击页面右上角的 **"New Token"** 按钮
   - 或者如果是首次创建，点击 **"+ New Token"**

4. **配置 Token 设置**：
   ```
   Name: VS Code Extension Publishing
   Organization: [选择您刚创建的组织，如：9579249]
   Expiration (UTC): [建议选择 1 year 或自定义较长期限]
   Scopes: Custom defined
   ```

5. **设置权限范围**：
   - 展开 **"Marketplace"** 部分
   - 勾选以下权限：
     - ✅ **Acquire** (获取扩展)
     - ✅ **Manage** (管理扩展)  
     - ✅ **Publish** (发布扩展)
   - 其他权限可以不勾选

6. **创建并保存 Token**：
   - 点击 **"Create"** 按钮
   - **重要**: 立即复制生成的 Token 字符串
   - **妥善保存**: Token 只会显示一次，关闭页面后无法再次查看

**方式二：通过 Marketplace 管理页面**

1. **访问**: https://marketplace.visualstudio.com/manage
2. **点击右上角用户头像** → **"Personal access tokens"**
3. **按照上述步骤 3-6 创建 Token**

**Token 创建成功标志**：
- ✅ 在 "Manage tokens" 列表中看到新创建的 Token
- ✅ Token 状态显示为 "Active"（绿色圆点）
- ✅ 显示正确的组织名称和权限范围

**界面说明**：
- **User settings**: 左侧菜单，包含 Account 和 Security 部分
- **Personal access tokens**: 在 Security 部分下，用于管理所有 PAT
- **Access scope**: 右上角显示当前用户的组织 ID（如：9579249）
- **Token name**: 列表中的 Token 名称（如：Lyfe）
- **Organization**: 显示 Token 所属的组织 ID
- **Status**: Active 表示 Token 有效可用
- **Revoke**: 可以撤销不需要的 Token

#### 方法二：直接访问 Azure DevOps
如果方法一不可用，可以尝试：

1. **新开浏览器标签页**，直接在地址栏输入：`https://dev.azure.com/`
2. **不要点击任何重定向链接**，确保地址栏显示的是 `dev.azure.com`
3. 如果还是重定向到 portal.azure.com，请尝试方法三

#### 方法三：通过 Azure Portal 导航
1. 如果已经在 portal.azure.com，点击左上角的 **"Microsoft Azure"** 图标
2. 在搜索框中输入 **"Azure DevOps"**
3. 选择 "Azure DevOps Services" 或 "Azure DevOps Organizations"
4. 点击进入后会跳转到正确的 dev.azure.com

#### 确认您在正确的平台
- ✅ **VS Code Marketplace 管理页面**: 
  - 地址：`marketplace.visualstudio.com/manage`
  - 显示您的发布者和扩展列表
  - 右上角有用户头像和 PAT 创建选项

- ✅ **Azure DevOps**: 
  - 地址：`dev.azure.com`
  - 界面：蓝色主题，顶部有 "Boards"、"Repos"、"Pipelines" 等菜单
  - 右上角用户菜单有 "Personal access tokens" 选项

- ❌ **Azure Portal**:
  - 地址：`portal.azure.com`
  - 界面：深蓝色主题，主要是云服务资源管理
  - 左侧菜单主要是虚拟机、存储账户等云服务

### 3. 创建发布者账户
```bash
# 使用 PAT 登录
vsce login <your-publisher-name>
# 输入上面创建的 PAT

# 或者创建新的发布者
vsce create-publisher
```

## 🚀 发布流程

### 步骤1: 准备扩展包

#### 检查 package.json 配置
确保以下字段正确配置：
```json
{
  "name": "lyfes-prompt-hub",
  "displayName": "Lyfe's Prompt Hub",
  "description": "让AI对话更高效的智能提示词管理工具",
  "version": "1.0.0",
  "publisher": "lyfe2025",  // 你的发布者名称
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": ["Other"],
  "keywords": ["prompt", "template", "management", "productivity", "ai", "snippet"],
  "icon": "icons/icon.png",
  "galleryBanner": {
    "color": "#0078d4",
    "theme": "dark"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/lyfe2025/lyfes-prompt-hub.git"
  },
  "bugs": {
    "url": "https://github.com/lyfe2025/lyfes-prompt-hub/issues"
  },
  "homepage": "https://github.com/lyfe2025/lyfes-prompt-hub",
  "author": "Lyfe",
  "license": "MIT",
  "qna": "marketplace"
}
```

#### 构建扩展
```bash
# 安装依赖
npm install

# 构建项目
npm run compile

# 或使用预发布脚本
npm run vscode:prepublish
```

### 步骤2: 打包扩展

```bash
# 创建 .vsix 包
vsce package

# 指定版本（可选）
vsce package --version 1.0.1

# 输出：lyfes-prompt-hub-1.0.0.vsix
```

### 步骤3: 本地测试

```bash
# 安装到本地 VS Code 测试
code --install-extension lyfes-prompt-hub-1.0.0.vsix

# 测试功能是否正常
# 完成测试后可以卸载
code --uninstall-extension lyfe2025.lyfes-prompt-hub
```

### 步骤4: 发布到商店

#### 方式一：直接发布（推荐）
```bash
# 发布扩展
vsce publish

# 发布指定版本
vsce publish 1.0.1

# 发布补丁版本（自动增加版本号）
vsce publish patch

# 发布次要版本
vsce publish minor

# 发布主要版本
vsce publish major
```

#### 方式二：手动上传 VSIX 文件
如果你需要更多控制或遇到命令行发布问题，可以手动上传：

**1. 创建 VSIX 包**
```bash
vsce package
# 生成 lyfes-prompt-hub-1.0.0.vsix 文件
```

**2. 访问 VS Code Marketplace 管理页面**
1. 打开 https://marketplace.visualstudio.com/manage
2. 使用与 Azure DevOps 相同的 Microsoft 账户登录

**3. 上传扩展**
- **首次发布**：
  1. 点击 "Publish extension"
  2. 选择 "Upload"
  3. 拖拽或选择你的 `.vsix` 文件
  4. 填写发布者信息（如果还没有）
  5. 点击 "Upload"

- **更新现有扩展**：
  1. 在扩展列表中找到你的扩展
  2. 点击扩展名称进入详情页
  3. 点击 "Update" 按钮
  4. 选择新的 `.vsix` 文件
  5. 点击 "Upload"

**4. 填写扩展信息**
在网页界面中可以编辑：
- 扩展描述
- 发布说明
- 标签和分类
- 截图和图标
- Q&A 和支持信息

**5. 提交审核**
- 检查所有信息无误后点击 "Publish"
- 等待 Microsoft 审核（通常几分钟到几小时）

**手动发布的优势**：
- 可以预览扩展页面
- 可以添加详细的发布说明
- 可以上传多张截图
- 更好的错误信息提示
- 适合首次发布或重大版本更新

## 📊 发布后验证

### 1. 检查扩展页面
1. 访问 https://marketplace.visualstudio.com/
2. 搜索你的扩展名称
3. 验证信息显示正确：
   - 扩展名称和描述
   - 图标显示
   - 安装统计
   - 版本号

### 2. 测试安装

#### VS Code 安装测试
```bash
# 从商店安装测试
code --install-extension lyfe2025.lyfes-prompt-hub
```

#### Cursor 兼容性测试
**重要提醒**：新发布的扩展可能需要时间同步到 Cursor

1. **立即测试方法**：
   ```bash
   # 方法1：通过扩展ID安装
   # 在 Cursor 中按 Ctrl+Shift+P，输入：Extensions: Install Extension
   # 然后输入扩展ID：lyfe2025.lyfes-prompt-hub
   
   # 方法2：手动安装 VSIX 文件
   # 在 Cursor 中按 Ctrl+Shift+P，输入：Extensions: Install from VSIX
   # 选择你的 .vsix 文件
   ```

2. **等待同步**：
   - 通常需要几小时到24小时
   - Cursor 会自动同步 VS Code Marketplace 的扩展
   - 可以定期在 Cursor 扩展商店搜索验证

3. **验证安装成功**：
   - 检查活动栏是否出现扩展图标
   - 测试扩展功能是否正常工作
   - 确认在已安装扩展列表中显示

## 🔄 版本更新流程

### 更新版本并发布
```bash
# 1. 修改代码
# 2. 更新 CHANGELOG.md
# 3. 测试功能

# 4. 发布新版本（自动增加版本号）
vsce publish patch   # bug 修复
vsce publish minor   # 新功能
vsce publish major   # 重大变更

# 或手动指定版本
vsce publish 1.0.1
```

### Git 标签管理
```bash
# 发布后创建 git 标签
git tag v1.0.1
git push origin v1.0.1

# 或在发布前使用 npm version
npm version patch  # 自动创建 git tag
vsce publish       # 发布当前版本
```

## 🛠️ 常见问题解决

### 0. 无法找到 PAT 创建入口 ⚠️ 最常见问题
**问题**: 找不到创建 Personal Access Token (PAT) 的地方

**根本原因**: 需要先创建 Azure DevOps 组织和项目，才能看到 PAT 创建选项

**最佳解决方案** 🎯:

#### 推荐方法：通过 VS Code Marketplace 管理页面
1. **直接访问**: https://marketplace.visualstudio.com/manage
2. **选择登录方式**：
   - **Microsoft 账户登录**（推荐，与 Azure DevOps 完全集成）
   - **GitHub 账户登录**（如果您更习惯使用 GitHub，同样有效）
3. **手动触发组织创建**：
   - 登录后在 Marketplace 管理页面
   - **关键**：点击右上角用户头像或尝试访问需要权限的功能
   - 系统会提示需要创建 Azure DevOps 组织
   - 输入组织名称（如：your-name-org）
   - 选择地区
   - 点击 "Continue"
4. **创建项目**（如果系统要求）：
   - 项目名随意（如：my-extensions）
   - 选择可见性
   - 点击 "Create project"
5. **完成后手动返回 Marketplace 管理页面**
6. **手动点击右上角用户头像**，现在应该能看到 "Personal access tokens" 选项了

**具体操作指导** 🎯：
1. **登录后的第一步**：在 Marketplace 管理页面点击右上角用户头像
2. **如果看不到 PAT 选项**：说明还没有创建 Azure DevOps 组织
3. **触发组织创建**：尝试点击任何需要权限的功能或设置
4. **组织创建完成后**：重新点击用户头像，应该能看到 "Personal access tokens"

**快速访问提示**：
- 组织创建完成后，您可以直接访问：`https://dev.azure.com/您的组织ID/usersSettings/tokens`
- 例如：`https://dev.azure.com/9579249/usersSettings/tokens`
- 这会直接跳转到 PAT 管理页面，无需再次导航

#### 替代方法：如果上述方法不可用
1. **强制访问 Azure DevOps**: 新标签页输入 `https://dev.azure.com/`
2. **通过 Azure Portal 导航**: 
   - 在 portal.azure.com 搜索 "Azure DevOps"
   - 点击搜索结果进入
3. **无痕模式**: 使用浏览器无痕模式访问 `https://dev.azure.com/`

**关键要点**:
- ✅ **必须先创建组织和项目**，才能看到 PAT 创建选项
- ✅ **Marketplace 管理页面是最可靠的入口**
- ✅ **支持 Microsoft 账户和 GitHub 账户登录**
- ⚠️ **没有自动跳转**，需要手动点击关键位置来触发流程
- ✅ **完成组织创建后，用户头像菜单才会显示 PAT 选项**

**如何确认设置成功**:
- ✅ **Azure DevOps PAT 管理页面**: 
  - 地址：`dev.azure.com/您的组织ID/usersSettings/tokens`
  - 左侧菜单显示用户设置选项
  - Security 部分下有 "Personal access tokens" 选项
  - 主界面显示 "Personal Access Tokens" 和 "Manage tokens" 

- ✅ **Marketplace 管理页面**: 
  - 地址：`marketplace.visualstudio.com/manage`
  - 显示您的发布者信息和扩展列表
  - 右上角用户头像菜单有 "Personal access tokens"

- ✅ **Token 创建成功的标志**:
  - 在 tokens 列表中看到新创建的 Token
  - Token 名称：如 "Lyfe" 或您设置的名称
  - 状态显示为 "Active"（绿色圆点）
  - 显示正确的组织 ID（如：9579249）
  - 权限范围包含 Marketplace 相关权限

### 1. 发布权限错误
```bash
# 重新登录
vsce logout
vsce login <your-publisher-name>

# 检查 PAT 是否过期或权限不足
# 需要重新创建 PAT 并设置正确权限
```

**如果命令行一直有权限问题，建议使用手动上传方式**：
- 用 `vsce package` 创建 VSIX 文件
- 通过网页界面 https://marketplace.visualstudio.com/manage 上传

### 2. 包大小过大
```bash
# 检查包内容
vsce ls

# 添加 .vscodeignore 文件排除不必要文件
echo "src/" >> .vscodeignore
echo "*.ts" >> .vscodeignore
echo "tsconfig.json" >> .vscodeignore
echo ".git/" >> .vscodeignore
echo "node_modules/" >> .vscodeignore
```

### 3. 图标问题
- 确保图标文件存在且路径正确
- 图标建议尺寸：128x128 像素
- 支持格式：PNG, JPEG, SVG

### 4. 版本冲突
```bash
# 检查当前发布的版本
vsce show lyfe2025.lyfes-prompt-hub

# 手动指定更高版本号
vsce publish 1.0.2
```

### 5. Cursor 扩展商店找不到扩展 🔄
**问题**: 扩展已发布到 VS Code Marketplace，但在 Cursor 中搜索不到

**原因**: 
- Cursor 需要时间同步 VS Code Marketplace 的新扩展
- 通常需要几小时到24小时的同步时间
- 搜索索引可能还没有更新

**解决方案**:

#### 立即使用方法
1. **通过扩展ID直接安装**:
   - 在 Cursor 中按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (macOS)
   - 输入 `Extensions: Install Extension`
   - 输入你的扩展ID: `lyfe2025.lyfes-prompt-hub`
   - 按回车安装

2. **手动安装 VSIX 文件**:
   - 在 Cursor 中按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (macOS)
   - 输入 `Extensions: Install from VSIX`
   - 选择你的 `.vsix` 文件进行安装

#### 等待同步方法
- 等待24小时后在 Cursor 扩展商店重新搜索
- 定期检查扩展是否已出现在搜索结果中

#### 验证安装
- 检查活动栏是否出现扩展图标
- 在扩展面板的"已安装"列表中确认
- 测试扩展功能是否正常工作

## 📋 发布检查清单

### 发布前
- [ ] 代码已构建且无错误
- [ ] 功能测试通过
- [ ] package.json 信息正确
- [ ] 图标文件存在
- [ ] README.md 内容完整
- [ ] CHANGELOG.md 已更新
- [ ] 许可证文件存在

### 发布时（命令行发布）
- [ ] PAT 有效且权限正确
- [ ] 发布者账户正常
- [ ] 版本号正确递增
- [ ] 扩展包创建成功
- [ ] 本地测试通过

### 发布时（手动上传）
- [ ] VSIX 文件创建成功
- [ ] 能正常访问 Marketplace 管理页面
- [ ] 扩展信息填写完整
- [ ] 截图和图标上传正确
- [ ] 发布说明清晰

### 发布后
- [ ] 商店页面显示正常
- [ ] 可以正常安装
- [ ] 功能运行正常
- [ ] 创建 GitHub Release
- [ ] 推送 git 标签

## 🚀 一键发布脚本

创建 `publish.sh` 脚本：

```bash
#!/bin/bash

echo "🚀 开始发布 Lyfe's Prompt Hub..."

# 检查是否有未提交的更改
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ 有未提交的更改，请先提交"
    exit 1
fi

# 构建项目
echo "🏗️ 构建项目..."
npm run compile

# 询问版本类型
echo "📊 选择版本类型:"
echo "1) patch (1.0.0 -> 1.0.1)"
echo "2) minor (1.0.0 -> 1.1.0)" 
echo "3) major (1.0.0 -> 2.0.0)"
read -p "请选择 (1-3): " choice

case $choice in
    1) VERSION_TYPE="patch" ;;
    2) VERSION_TYPE="minor" ;;
    3) VERSION_TYPE="major" ;;
    *) echo "❌ 无效选择"; exit 1 ;;
esac

# 发布到商店
echo "📦 发布到 VS Code 商店..."
vsce publish $VERSION_TYPE

# 获取新版本号
NEW_VERSION=$(node -p "require('./package.json').version")

# 创建并推送 git 标签
echo "🏷️ 创建 git 标签..."
git tag "v$NEW_VERSION"
git push origin "v$NEW_VERSION"

echo "✅ 发布完成！版本: v$NEW_VERSION"
echo "🔗 查看扩展: https://marketplace.visualstudio.com/items?itemName=lyfe2025.lyfes-prompt-hub"
```

使用方法：
```bash
cd docs/release
chmod +x publish.sh
./publish.sh
```

### 手动发布脚本

如果你偏好手动上传方式，可以使用这个脚本只生成 VSIX 文件：

创建 `package-only.sh` 脚本：

```bash
#!/bin/bash

echo "📦 生成 VSIX 包用于手动上传..."

# 检查是否有未提交的更改
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ 有未提交的更改，请先提交"
    exit 1
fi

# 构建项目
echo "🏗️ 构建项目..."
npm run compile

# 询问版本号
echo "📝 当前版本: $(node -p "require('./package.json').version")"
read -p "请输入新版本号 (如 1.0.1): " new_version

if [[ -n "$new_version" ]]; then
    # 更新版本号
    npm version $new_version --no-git-tag-version
    echo "✅ 版本号已更新为: $new_version"
fi

# 生成 VSIX 包
echo "📦 生成 VSIX 包..."
vsce package

VSIX_FILE="lyfes-prompt-hub-$(node -p "require('./package.json').version").vsix"

echo "✅ VSIX 包已生成: $VSIX_FILE"
echo ""
echo "📋 下一步操作："
echo "1. 访问 https://marketplace.visualstudio.com/manage"
echo "2. 登录并找到你的扩展"
echo "3. 点击 'Update' 上传 $VSIX_FILE"
echo "4. 填写发布说明并点击 'Publish'"
echo ""
echo "🏷️ 别忘了创建 Git 标签："
echo "git tag v$(node -p "require('./package.json').version")"
echo "git push origin v$(node -p "require('./package.json').version")"
```

使用方法：
```bash
cd docs/release
chmod +x package-only.sh
./package-only.sh
```

## 📝 扩展信息优化建议

### 1. 完善扩展描述
- 清晰描述扩展功能
- 突出核心价值和特色
- 包含关键词便于搜索

### 2. 添加截图和 GIF
- 在 README.md 中添加功能截图
- 制作操作演示 GIF
- 展示主要使用场景

### 3. 优化关键词
```json
{
  "keywords": [
    "prompt", "template", "ai", "productivity", 
    "snippet", "management", "hub", "assistant"
  ]
}
```

### 4. 设置合适的分类
```json
{
  "categories": [
    "Other",
    "Snippets", 
    "Extension Packs"
  ]
}
```

---

**总结**: 这个指南提供了完整的VS Code扩展商店发布流程，从账户设置到自动化发布脚本，确保你能顺利将 Lyfe's Prompt Hub 发布到商店并进行后续维护。 