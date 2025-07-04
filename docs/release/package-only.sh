#!/bin/bash

echo "📦 生成 VSIX 包用于手动上传..."

# 切换到项目根目录
cd "$(dirname "$0")/../.."

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