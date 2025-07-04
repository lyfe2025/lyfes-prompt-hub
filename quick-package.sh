#!/bin/bash

# Lyfe's Prompt Hub - 快速无缓存打包脚本
# 简化版本，适合快速迭代开发

set -e  # 遇到错误立即退出

echo "🚀 快速无缓存打包中..."

# 1. 清理构建产物
echo "🧹 清理构建缓存..."
rm -rf ./dist
rm -rf ./out
rm -rf ./*.vsix

# 2. 编译代码
echo "⚙️  编译代码..."
npm run compile

# 3. 打包扩展
echo "📦 打包扩展..."
npm run package

# 4. 显示结果
VSIX_FILE=$(find . -name "*.vsix" -type f | head -1)
if [ -n "$VSIX_FILE" ]; then
    FILE_SIZE=$(ls -lh "$VSIX_FILE" | awk '{print $5}')
    echo ""
    echo "✅ 打包完成！"
    echo "📁 文件: $(basename "$VSIX_FILE")"
    echo "📏 大小: $FILE_SIZE"
    echo ""
else
    echo "❌ 打包失败！"
    exit 1
fi