# 发布管理文档

本目录包含 Lyfe's Prompt Hub 扩展的发布相关文档和脚本。

## 📁 文件说明

### 📖 文档
- **`VS Code扩展商店发布指南.md`** - 完整的扩展发布操作指南
  - 发布前准备（账户设置、工具安装）
  - 命令行发布流程
  - 手动上传发布流程
  - 常见问题解决
  - 发布检查清单

### 🚀 发布脚本
- **`publish.sh`** - 一键自动发布脚本
  - 自动构建和发布到 VS Code Marketplace
  - 交互式版本选择（patch/minor/major）
  - 自动创建 Git 标签

- **`package-only.sh`** - 手动发布辅助脚本
  - 只生成 VSIX 包，不自动发布
  - 适合需要手动上传的场景
  - 提供详细的后续操作指引

## 🎯 快速使用

### 自动发布（推荐）
```bash
cd docs/release
./publish.sh
```

### 手动发布
```bash
cd docs/release
./package-only.sh
# 然后访问 https://marketplace.visualstudio.com/manage 手动上传
```

## 📋 发布前检查

在使用脚本之前，请确保：
- [ ] 所有代码已提交到 Git
- [ ] 功能测试完成
- [ ] CHANGELOG.md 已更新
- [ ] package.json 信息正确

## 🔗 相关链接

- **VS Code Marketplace 管理**: https://marketplace.visualstudio.com/manage
- **Azure DevOps**: https://dev.azure.com/
- **扩展页面**: https://marketplace.visualstudio.com/items?itemName=lyfe2025.lyfes-prompt-hub

## 📝 注意事项

1. **首次使用**需要先配置 Azure DevOps 账户和 Personal Access Token
2. **脚本权限**：首次使用前需要给脚本执行权限 (`chmod +x *.sh`)
3. **网络要求**：发布需要稳定的网络连接
4. **版本管理**：遵循语义化版本规范 (MAJOR.MINOR.PATCH)

---

**更新日期**: 2024-12-25  
**适用版本**: Lyfe's Prompt Hub v1.0.0+ 