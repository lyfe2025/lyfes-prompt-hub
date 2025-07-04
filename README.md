<div align="center">

# Lyfe's Prompt Hub

[![VS Code Extension](https://img.shields.io/badge/VS%20Code%20%26%20Cursor-Extension-blue?style=flat-square&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=lyfe2025.lyfes-prompt-hub)
[![Version](https://img.shields.io/badge/version-1.0.0-green?style=flat-square)](https://github.com/lyfe2025/lyfes-prompt-hub/releases)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

**让AI对话更高效的智能提示词管理工具**

[快速开始](#快速开始) • [核心功能](#核心功能) • [安装使用](#安装) • [反馈建议](#支持与反馈)

</div>

---

## ✨ 为什么选择我？


- 📝 **集中管理** 所有常用的提示词模板，告别碎片化管理
- 🔍 **快速查找** 通过智能搜索和分类，秒找所需提示词
- 📋 **一键复制** 直接复制到剪贴板，无缝衔接AI对话
- ⭐ **收藏标记** 重要提示词快速访问，提升工作效率
- ☁️ **云端同步** 支持多种云端存储，随时随地使用
- 💾 **安全备份** 完善的备份机制，保护你的知识资产

## 🚀 快速开始

### 安装

**方法一：扩展市场安装（推荐）**
1. 打开 VS Code 或 Cursor
2. 按 `Cmd+Shift+X` (macOS) 或 `Ctrl+Shift+X` (Windows/Linux) 打开扩展面板
3. 搜索 "Lyfe's Prompt Hub"
4. 点击安装

**方法二：手动安装**
1. 下载最新的 `.vsix` 文件从 [Releases](https://github.com/lyfe2025/lyfes-prompt-hub/releases)
2. 在编辑器中按 `Cmd+Shift+P` (macOS) 或 `Ctrl+Shift+P` (Windows/Linux)
3. 输入 "Extensions: Install from VSIX"
4. 选择下载的文件

### 快捷键

- 按下 `Ctrl+Shift+H`（Windows、macOS、Linux 通用）可一键打开 Prompt Hub 主面板，无需鼠标点击。
- 如需自定义快捷键，可在 VS Code 设置中搜索"键盘快捷方式"并修改 `promptHub.openPanel` 命令。

### 基本使用

1. **打开扩展** - 点击活动栏中的 Prompt Hub 图标
2. **添加提示词** - 点击 "+" 按钮，填写标题、内容和分类
3. **使用提示词** - 搜索找到需要的提示词，点击"复制"按钮
4. **粘贴使用** - 在AI对话框中粘贴使用

## 🎯 核心功能

### 基础功能
- **提示词管理** - 创建、编辑、删除、分类整理
- **智能搜索** - 按标题、内容、标签快速查找
- **收藏功能** - 标记常用提示词，快速访问
- **标签系统** - 灵活的多标签组织管理

### 高级功能
- **云端同步** - 支持 GitHub、GitLab、Gitee、WebDAV
- **数据备份** - 本地备份管理，支持恢复和导出
- **全局存储** - 跨项目的统一提示词管理
- **预览功能** - 鼠标悬停即可预览内容

### 用户体验
- **🖱️ 悬浮操作** - 界面简洁，操作直观
- **👁️ 智能预览** - 内容预览，快速浏览
- **⚡ 即时反馈** - 操作立即生效，状态清晰
- **📱 响应式设计** - 适配不同尺寸面板

## 🔧 配置说明

### 云同步设置
支持多种云端存储方案，可在设置面板中配置：
- **GitHub Gist** - 使用 Personal Access Token
- **GitLab Snippet** - 支持自建实例
- **Gitee Gist** - 国内用户友好
- **WebDAV** - 支持自建存储

### 数据存储

扩展采用全局存储模式：
- 所有提示词保存在VS Code的全局存储中
- 跨项目、跨工作区通用，随时可用
- 数据安全可靠，自动持久化保存
- **初始安装**：首次安装扩展时会自动加载预设的提示词模板

### 备份管理

**创建备份**
- 手动创建：在设置面板点击"创建备份"按钮
- 自动备份：扩展会自动维护特殊备份文件
- 备份格式：JSON格式，包含所有提示词、分类和设置

**特殊备份文件**

扩展会自动创建并维护两个特殊的备份文件：

1. **默认数据.json**
   - 包含扩展预设的提示词模板（与初始安装时加载的数据相同）
   - 适用场景：想要恢复到扩展的初始状态，重新获得预设提示词
   - 自动更新：每次扩展启动时会自动同步最新的预设数据
   - 使用方法：在备份管理页面选择"默认数据.json"进行恢复

2. **清空数据.json**
   - 包含空白的数据结构（无提示词、无分类）
   - 适用场景：想要清空所有数据，从零开始
   - 保留设置：会保留基本设置结构，但重置所有云同步配置
   - 使用方法：在备份管理页面选择"清空数据.json"进行恢复

**备份操作**
- 恢复备份：在备份管理页面选择任意备份文件进行恢复
- 重命名备份：支持自定义备份文件名称，便于管理
- 删除备份：可删除不需要的备份文件
- 导入导出：支持备份文件的导入和导出功能

## 🛠️ 开发信息

### 技术栈
- **前端**: HTML、CSS、JavaScript
- **后端**: TypeScript、VS Code API
- **构建**: ESBuild
- **云同步**: 多平台 API 集成

### 环境要求
- Node.js >= 16
- VS Code >= 1.74.0 或 Cursor (基于 VS Code)
- TypeScript >= 4.9

### 本地开发
```bash
# 克隆项目
git clone https://github.com/lyfe2025/lyfes-prompt-hub.git
cd lyfes-prompt-hub

# 安装依赖
npm install

# 开发模式
npm run watch

# 构建项目
npm run compile

# 打包扩展
npm run package
```

## 📝 版本历史

### v1.0.0 (2024-12-25) 🎉 正式发布
- ✨ 完整的提示词管理功能
- 🎨 现代化的用户界面设计
- ☁️ 多平台云端同步支持
- 💾 完善的数据备份机制
- 🔍 智能搜索和预览功能
- 🏗️ 稳定的架构设计

更多版本信息请查看 [CHANGELOG.md](CHANGELOG.md)

## 🤝 贡献与支持

### 贡献方式
- 🐛 [报告问题](https://github.com/lyfe2025/lyfes-prompt-hub/issues)
- 💡 [功能建议](https://github.com/lyfe2025/lyfes-prompt-hub/issues)
- 🔧 [代码贡献](https://github.com/lyfe2025/lyfes-prompt-hub/pulls)

详细信息请参阅 [贡献指南](CONTRIBUTING.md)

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 💬 支持与反馈

- **GitHub Issues**: [报告问题](https://github.com/lyfe2025/lyfes-prompt-hub/issues)
- **GitHub Discussions**: [功能讨论](https://github.com/lyfe2025/lyfes-prompt-hub/discussions)
- **项目主页**: [GitHub 仓库](https://github.com/lyfe2025/lyfes-prompt-hub)

## 🙏 致谢

感谢所有为这个项目贡献的开发者和用户！

特别感谢：
- VS Code 团队提供优秀的扩展 API
- Cursor 团队基于 VS Code 的优秀改进
- 社区用户的宝贵反馈和建议
- 开源社区的支持和帮助

---

<div align="center">

**如果这个项目对你有帮助，请给它一个 ⭐ Star**

[⬆ 回到顶部](#lyfes-prompt-hub)

</div> 