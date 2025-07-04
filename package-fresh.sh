#!/bin/bash

# Lyfe's Prompt Hub - 无缓存打包脚本
# 确保每次打包都是干净的构建

set -e  # 遇到错误立即退出

echo "🚀 开始无缓存打包 Lyfe's Prompt Hub..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. 清理所有构建缓存
print_message "清理构建缓存..."
rm -rf ./dist
rm -rf ./out
rm -rf ./node_modules/.cache
rm -rf ./.esbuild

# 2. 清理 npm 缓存
print_message "清理 npm 缓存..."
npm cache clean --force

# 3. 删除并重新安装依赖（可选，更彻底）
read -p "是否重新安装依赖包？这会更彻底但耗时更长 (y/N): " reinstall_deps
if [[ $reinstall_deps =~ ^[Yy]$ ]]; then
    print_message "删除 node_modules..."
    rm -rf ./node_modules
    rm -f ./package-lock.json
    
    print_message "重新安装依赖..."
    npm install
else
    print_warning "跳过依赖重装，使用现有依赖"
fi

# 4. 清理旧的 .vsix 文件
print_message "清理旧的 .vsix 文件..."
rm -f ./*.vsix

# 5. 编译 TypeScript 代码
print_message "编译 TypeScript 代码..."
npm run compile

# 6. 运行代码检查（可选）
read -p "是否运行 ESLint 检查？(y/N): " run_lint
if [[ $run_lint =~ ^[Yy]$ ]]; then
    print_message "运行 ESLint 检查..."
    npm run lint
else
    print_warning "跳过代码检查"
fi

# 7. 打包扩展
print_message "打包 VS Code 扩展..."
npm run package

# 8. 查找生成的 .vsix 文件
VSIX_FILE=$(find . -name "*.vsix" -type f | head -1)

if [ -n "$VSIX_FILE" ]; then
    # 获取文件大小
    FILE_SIZE=$(ls -lh "$VSIX_FILE" | awk '{print $5}')
    
    print_success "打包完成！"
    echo ""
    echo "📦 生成的扩展包："
    echo "   文件名: $(basename "$VSIX_FILE")"
    echo "   大小: $FILE_SIZE"
    echo "   路径: $(realpath "$VSIX_FILE")"
    echo ""
    
    # 9. 验证打包内容（可选）
    read -p "是否查看打包内容概览？(y/N): " show_content
    if [[ $show_content =~ ^[Yy]$ ]]; then
        print_message "打包内容概览："
        unzip -l "$VSIX_FILE" | head -20
        echo "..."
        echo "（显示前20行，完整内容请用 unzip -l 查看）"
    fi
    
    print_success "🎉 无缓存打包完成！扩展包已生成。"
else
    print_error "❌ 打包失败！未找到生成的 .vsix 文件。"
    exit 1
fi