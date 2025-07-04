import { dom, state } from './state.js';

// 预览功能管理器
class PromptPreviewManager {
    constructor() {
        this.currentPromptId = null;
        this.isPreviewVisible = false;
        // 预览按钮状态跟踪
        this.previewButtons = new Map(); // promptId -> buttonElement
    }

    /**
     * 显示提示词预览
     * @param {Object} prompt - 提示词对象
     * @param {HTMLElement} targetElement - 触发预览的元素
     */
    showPreview(prompt, targetElement) {
        if (!prompt || !targetElement) {
            console.error('showPreview: prompt 或 targetElement 参数无效');
            return;
        }

        console.log('🎬 开始显示预览:', { promptId: prompt.id, title: prompt.title });

        // 如果当前已有预览显示，先隐藏它（自动切换）
        if (this.isPreviewVisible && this.currentPromptId && this.currentPromptId !== prompt.id) {
            console.log('🔄 切换预览: 从', this.currentPromptId, '到', prompt.id);
            // 恢复之前预览按钮的状态
            this.updatePreviewButtonState(this.currentPromptId, 'default');
            
            // 立即隐藏当前预览（不需要动画延迟）
            dom.previewCard.classList.remove('visible');
            dom.previewCard.classList.add('hidden');
        }

        // 立即设置状态，避免状态延迟导致的问题
        this.isPreviewVisible = true;
        this.currentPromptId = prompt.id;

        // 更新预览按钮状态为"取消预览"
        this.updatePreviewButtonState(prompt.id, 'canceling');

        // 更新预览内容
        this.updatePreviewContent(prompt);
        
        // 确保预览卡片可见但透明，以便准确计算尺寸（避免测量偏差）
        dom.previewCard.classList.remove('hidden');
        dom.previewCard.style.visibility = 'visible';
        dom.previewCard.style.opacity = '0'; // 透明但可见，确保测量准确
        
        // 强制触发重排，确保内容完全渲染后再定位
        dom.previewCard.offsetHeight;
        
        // 定位预览卡片
        this.positionPreview(targetElement);

        // 显示预览 - 优化显示流程避免闪烁
        // 使用更短的延迟确保样式应用后再显示动画
        requestAnimationFrame(() => {
            dom.previewCard.style.opacity = '1';
            dom.previewCard.classList.add('visible');
            console.log('✅ 预览显示完成:', prompt.id);
        });
    }

    /**
     * 隐藏预览
     */
    hidePreview() {
        if (!this.isPreviewVisible) return;

        // 恢复预览按钮状态为"预览"
        if (this.currentPromptId) {
            this.updatePreviewButtonState(this.currentPromptId, 'default');
        }

        dom.previewCard.classList.remove('visible');
        dom.previewCard.style.opacity = '0';
        setTimeout(() => {
            dom.previewCard.classList.add('hidden');
            this.isPreviewVisible = false;
            this.currentPromptId = null;
        }, 200); // 等待动画完成
    }

    /**
     * 立即隐藏预览
     */
    immediateHidePreview() {
        if (!this.isPreviewVisible) {
            console.log('⚠️ 尝试隐藏预览，但预览未显示');
            return;
        }

        console.log('🚫 立即隐藏预览:', this.currentPromptId);

        // 恢复预览按钮状态为"预览"
        if (this.currentPromptId) {
            this.updatePreviewButtonState(this.currentPromptId, 'default');
        }

        // 立即隐藏，不使用动画延迟
        dom.previewCard.classList.remove('visible');
        dom.previewCard.classList.add('hidden');
        dom.previewCard.style.opacity = '0';
        
        // 立即重置状态
        this.isPreviewVisible = false;
        this.currentPromptId = null;
        
        console.log('✅ 预览隐藏完成，状态已重置');
    }

    /**
     * 更新预览按钮状态
     * @param {string} promptId - 提示词ID
     * @param {string} state - 状态: 'default' | 'canceling'
     */
    updatePreviewButtonState(promptId, state) {
        const previewBtn = this.previewButtons.get(promptId);
        if (!previewBtn) {
            console.warn('⚠️ 找不到预览按钮:', promptId);
            return;
        }

        const icon = previewBtn.querySelector('i');
        const span = previewBtn.querySelector('span');
        if (!icon || !span) {
            console.warn('⚠️ 预览按钮元素不完整:', promptId);
            return;
        }

        // 移除所有状态类
        previewBtn.classList.remove('canceling', 'unfavoriting');

        switch (state) {
            case 'canceling':
                span.textContent = '取消预览';
                previewBtn.title = '取消预览';
                previewBtn.classList.add('unfavoriting'); // 使用与取消收藏一致的样式类
                console.log('🔄 按钮状态更新为"取消预览":', promptId);
                break;
            case 'default':
            default:
                span.textContent = '预览';
                previewBtn.title = '预览';
                console.log('🔄 按钮状态更新为"预览":', promptId);
                break;
        }
    }

    /**
     * 注册预览按钮元素
     * @param {string} promptId - 提示词ID
     * @param {HTMLElement} buttonElement - 按钮元素
     */
    registerPreviewButton(promptId, buttonElement) {
        if (!buttonElement) {
            console.error('❌ 尝试注册空的按钮元素:', promptId);
            return;
        }
        this.previewButtons.set(promptId, buttonElement);
        console.log('📝 注册预览按钮:', promptId, buttonElement);
    }

    /**
     * 清理已注册的预览按钮
     */
    clearPreviewButtons() {
        this.previewButtons.clear();
    }

    /**
     * 更新预览内容
     * @param {Object} prompt - 提示词对象
     */
    updatePreviewContent(prompt) {
        // 设置标题
        dom.previewTitle.textContent = prompt.title || '无标题';

        // 设置完整内容，保留换行格式
        const content = prompt.content || '无内容';
        
        // 处理可能的换行符格式问题
        let processedContent = content;
        // 将各种换行符统一为 \n
        processedContent = processedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // 清空内容区域
        dom.previewContent.innerHTML = '';
        
        // 创建文本节点并保持换行格式
        const textNode = document.createTextNode(processedContent);
        dom.previewContent.appendChild(textNode);
        
        // 确保CSS样式正确应用
        dom.previewContent.style.whiteSpace = 'pre-wrap';
        dom.previewContent.style.wordWrap = 'break-word';
        
        // 强制设置overflow属性，确保滚动条显示
        dom.previewContent.style.overflowY = 'auto';
        dom.previewContent.style.overflowX = 'hidden';

        // 设置分类
        if (prompt.category) {
            dom.previewCategory.textContent = prompt.category;
            dom.previewCategory.style.display = 'inline-block';
        } else {
            dom.previewCategory.style.display = 'none';
        }

        // 设置标签
        if (prompt.tags && prompt.tags.length > 0) {
            dom.previewTags.innerHTML = prompt.tags
                .map(tag => `<span class="tag">${tag}</span>`)
                .join('');
            dom.previewTags.style.display = 'flex';
        } else {
            dom.previewTags.style.display = 'none';
        }
    }

    /**
     * 定位预览卡片 - 对称间距设计，预览窗口显示在按钮左侧，并保持左右间距一致
     * @param {HTMLElement} targetElement - 参考元素（预览按钮）
     */
    positionPreview(targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        const previewCard = dom.previewCard;
        
        // 获取扩展容器的实际宽度进行自适应
        const extensionContainer = document.body || document.documentElement;
        const containerWidth = extensionContainer.clientWidth;
        const windowHeight = window.innerHeight;
        
        // 重置样式以获取准确的尺寸，但保持可见性
        previewCard.style.left = '0px';
        previewCard.style.top = '0px';
        previewCard.style.width = '';
        previewCard.style.height = '';
        previewCard.style.maxWidth = '';
        previewCard.style.maxHeight = '';
        previewCard.style.minWidth = '';
        previewCard.style.minHeight = '';
        
        // 确保在测量时元素仍保持可见状态
        const currentVisibility = previewCard.style.visibility;
        const currentOpacity = previewCard.style.opacity;
        if (currentVisibility === 'hidden') {
            previewCard.style.visibility = 'visible';
        }
        
        // 对称间距设计：统一间距变量，根据容器宽度自适应
        const UNIFORM_GAP = Math.max(16, Math.min(24, containerWidth * 0.03));
        
        // 计算预览窗口宽度：按钮左侧可用空间 - 两倍统一间距
        // 布局：[统一间距] + [预览窗口] + [统一间距] + [预览按钮]
        const availableWidthForPreview = targetRect.left - (UNIFORM_GAP * 2);
        
        // 宽度限制
        const MIN_PREVIEW_WIDTH = 320;
        const MAX_PREVIEW_WIDTH = 500;
        
        let previewWidth;
        if (availableWidthForPreview >= MAX_PREVIEW_WIDTH) {
            // 空间充足，使用最大宽度
            previewWidth = MAX_PREVIEW_WIDTH;
        } else if (availableWidthForPreview >= MIN_PREVIEW_WIDTH) {
            // 空间适中，使用可用空间（保持间距对称）
            previewWidth = availableWidthForPreview;
        } else {
            // 空间不足，使用最小宽度
            previewWidth = MIN_PREVIEW_WIDTH;
        }
        
        // 强制设置具体宽度，确保CSS不会覆盖JavaScript设置
        previewCard.style.width = previewWidth + 'px';
        previewCard.style.minWidth = previewWidth + 'px';
        previewCard.style.maxWidth = previewWidth + 'px';
        
        // 强制布局重计算
        previewCard.offsetHeight;
        
        // 获取实际尺寸
        const realCardRect = previewCard.getBoundingClientRect();
        const cardWidth = realCardRect.width;
        
        // 对称间距水平定位计算
        let left;
        if (cardWidth <= availableWidthForPreview) {
            // 预览窗口可以完美放置，实现对称间距
            // 左边缘位置 = 统一间距
            left = UNIFORM_GAP;
            
            // 验证间距对称性
            const rightGap = targetRect.left - (left + cardWidth);
            const leftGap = left;
            
            // 如果右侧间距与统一间距不符（允许2px误差），微调位置实现完美对称
            if (Math.abs(rightGap - UNIFORM_GAP) > 2) {
                left = targetRect.left - cardWidth - UNIFORM_GAP;
                left = Math.max(UNIFORM_GAP, left); // 确保不超出左边界
            }
        } else {
            // 空间不足时的降级处理：居中放置，保持最小间距
            const centerLeft = (targetRect.left - cardWidth) / 2;
            left = Math.max(8, centerLeft); // 最小8px间距
        }
        
        // 确保不超出右边界
        const maxLeft = containerWidth - cardWidth - 8;
        if (left > maxLeft) {
            left = Math.max(8, maxLeft);
        }
        
        // 垂直定位：智能高度调整 - 内容多时最大化，内容少时自适应
        const topMargin = 8;
        const bottomMargin = 8;
        
        // 计算可用的垂直空间
        const availableHeight = windowHeight - topMargin - bottomMargin;
        
        // 设置预览窗口的最大高度：95%屏幕高度
        const maxPreviewHeight = Math.min(availableHeight, windowHeight * 0.95);
        previewCard.style.maxHeight = maxPreviewHeight + 'px';
        
        // 移除强制高度设置，让内容自然撑开
        previewCard.style.height = '';
        previewCard.style.minHeight = '';
        
        // 设置合理的最小高度，确保小内容时不会太小
        const minPreviewHeight = Math.min(300, windowHeight * 0.3);
        previewCard.style.minHeight = minPreviewHeight + 'px';
        
        // 重新获取设置高度后的实际尺寸
        previewCard.offsetHeight; // 再次触发reflow
        const finalCardRect = previewCard.getBoundingClientRect();
        const finalCardHeight = finalCardRect.height;
        
        // 计算垂直位置 - 优先与按钮居中对齐
        const buttonCenter = targetRect.top + targetRect.height / 2;
        let top = buttonCenter - finalCardHeight / 2;
        
        // 确保不超出上边界
        if (top < topMargin) {
            top = topMargin;
        }
        
        // 确保不超出下边界
        if (top + finalCardHeight > windowHeight - bottomMargin) {
            top = Math.max(topMargin, windowHeight - finalCardHeight - bottomMargin);
        }
        
        // 间距验证和调试信息
        const finalLeftGap = left;
        const finalRightGap = targetRect.left - (left + cardWidth);
        const isSymmetrical = Math.abs(finalLeftGap - finalRightGap) <= 2;
        
        console.log('⚖️ 预览窗口对称间距定位结果:', {
            '📐 容器信息': {
                容器宽度: containerWidth + 'px',
                容器高度: windowHeight + 'px',
                统一间距: UNIFORM_GAP + 'px',
                按钮左边缘位置: targetRect.left + 'px'
            },
            '📏 尺寸计算': {
                预览窗口宽度: cardWidth + 'px',
                预览窗口高度: finalCardHeight + 'px',
                可用预览宽度: availableWidthForPreview + 'px',
                最大预览高度: maxPreviewHeight + 'px'
            },
            '📍 位置信息': {
                预览窗口左边缘: left + 'px',
                预览窗口顶部: top + 'px',
                最终位置: `(${left}, ${top})`
            },
            '⚖️ 间距对称性': {
                左侧间距: finalLeftGap + 'px',
                右侧间距: finalRightGap + 'px',
                间距差异: Math.abs(finalLeftGap - finalRightGap) + 'px',
                是否对称: isSymmetrical ? '✅ 是' : '❌ 否'
            },
                         '📱 智能高度调整': {
                 窗口高度: windowHeight + 'px',
                 可用高度: availableHeight + 'px',
                 最大预览高度: maxPreviewHeight + 'px',
                 最小预览高度: minPreviewHeight + 'px',
                 实际使用高度: finalCardHeight + 'px',
                 顶部间距: top + 'px',
                 底部间距: (windowHeight - (top + finalCardHeight)) + 'px',
                 垂直利用率: Math.round(finalCardHeight / windowHeight * 100) + '%',
                 高度状态: finalCardHeight >= maxPreviewHeight - 10 ? '📈 内容充足(最大化)' : 
                          finalCardHeight <= minPreviewHeight + 10 ? '📉 内容较少(最小化)' : '📊 内容适中(自适应)'
             }
        });

        // 应用最终位置
        previewCard.style.left = left + 'px';
        previewCard.style.top = top + 'px';

        // 移除箭头，因为现在使用侧边显示
        previewCard.classList.remove('arrow-bottom');
    }
}

// 创建全局预览管理器实例
export const previewManager = new PromptPreviewManager();

/**
 * 初始化预览功能
 */
export function initPreview() {
    const promptListContainer = dom.mainViewElements.promptListContainer;
    if (!promptListContainer) return;

    // 预览框内的复制按钮事件
    if (dom.previewCopyBtn) {
        dom.previewCopyBtn.addEventListener('click', handlePreviewCopyClick);
    }

    // 点击其他地方时隐藏预览（但现在这个逻辑主要在各组件的点击处理中实现）
    document.addEventListener('click', (e) => {
        // 只有在点击的是非交互元素时才隐藏预览
        // 具体的预览切换逻辑现在由各个组件自己处理
        if (!dom.previewCard.contains(e.target) && 
            !e.target.closest('.preview-prompt-btn') &&
            !e.target.closest('.prompt-item') &&
            !e.target.closest('.btn') &&
            !e.target.closest('input') &&
            !e.target.closest('select') &&
            !e.target.closest('[role="button"]')) {
            previewManager.immediateHidePreview();
        }
    });

    // 滚动时隐藏预览
    document.addEventListener('scroll', () => {
        previewManager.immediateHidePreview();
    });

    // 窗口尺寸变化时重新定位预览窗口（适应侧边栏宽度变化）
    let resizeTimeout;
    const handleResize = () => {
        // 使用防抖避免频繁重新定位
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (previewManager.isPreviewVisible && previewManager.currentPromptId) {
                // 找到当前预览对应的按钮元素
                const currentPreviewBtn = previewManager.previewButtons.get(previewManager.currentPromptId);
                if (currentPreviewBtn) {
                    // 重新定位预览窗口
                    previewManager.positionPreview(currentPreviewBtn);
                }
            }
        }, 150); // 150ms防抖延迟
    };

    // 监听窗口尺寸变化
    window.addEventListener('resize', handleResize);

    // 监听容器尺寸变化（用于检测VS Code侧边栏宽度调整）
    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(document.body);
        
        // 清理函数（如果需要的话可以导出用于清理）
        previewManager._resizeObserver = resizeObserver;
    }
}

/**
 * 处理预览框内复制按钮点击
 * @param {Event} event 
 */
function handlePreviewCopyClick(event) {
    event.stopPropagation();
    
    const promptId = previewManager.currentPromptId;
    if (!promptId) return;
    
    const copyBtn = event.target.closest('.preview-copy-btn');
    if (!copyBtn) return;
    
    // 防止重复点击
    if (copyBtn.disabled || copyBtn.classList.contains('copying')) {
        return;
    }

    // 导入API模块进行复制
    import('./api.js').then(api => {
        // 立即标记为正在复制状态并显示已复制
        copyBtn.disabled = true;
        copyBtn.classList.add('copying');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '已复制';
        
        // 发送复制请求
        api.copyPrompt(promptId);
        
        // 1.5秒后恢复原始状态
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove('copying');
            copyBtn.disabled = false;
        }, 1500);
    });
}

/**
 * 清理预览功能
 */
export function cleanupPreview() {
    previewManager.immediateHidePreview();
} 