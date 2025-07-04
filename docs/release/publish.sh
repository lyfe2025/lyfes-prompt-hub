#!/bin/bash

echo "🚀 开始发布 Lyfe's Prompt Hub..."

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