/**
 * 自定义右键菜单管理模块
 * 提供文本选择、复制、粘贴等功能
 */

let contextMenu = null;
let currentTarget = null;

/**
 * 初始化右键菜单
 */
export function initContextMenu() {
    console.log('[ContextMenu] Initializing context menu...');
    
    contextMenu = document.getElementById('context-menu');
    if (!contextMenu) {
        console.error('[ContextMenu] Context menu element not found!');
        return;
    }
    
    console.log('[ContextMenu] Context menu element found:', contextMenu);

    // 监听全局右键点击事件
    document.addEventListener('contextmenu', handleContextMenu);
    console.log('[ContextMenu] Added contextmenu event listener');
    
    // 监听点击事件来隐藏菜单
    document.addEventListener('click', hideContextMenu);
    
    // 监听菜单项点击
    contextMenu.addEventListener('click', handleMenuItemClick);
    
    // 监听键盘事件
    document.addEventListener('keydown', handleKeyDown);
    
    console.log('[ContextMenu] Context menu initialization completed');
}

/**
 * 处理右键菜单显示
 */
function handleContextMenu(event) {
    console.log('[ContextMenu] Context menu event triggered', event);
    
    // 检查是否在可编辑元素上
    const target = event.target;
    console.log('[ContextMenu] Target element:', target, 'Tag:', target.tagName);
    
    // 改进的可编辑元素检测逻辑
    const isDirectlyEditable = target.tagName === 'INPUT' || 
                              target.tagName === 'TEXTAREA' || 
                              target.contentEditable === 'true';
    
    // 检查是否在包含可编辑元素的容器内（比如表单）
    const editableChild = target.querySelector('input, textarea, [contenteditable="true"]');
    const editableParent = target.closest('input, textarea, [contenteditable="true"]');
    
    const isEditableElement = isDirectlyEditable || editableChild || editableParent;

    console.log('[ContextMenu] Is editable element:', isEditableElement);
    console.log('[ContextMenu] Direct editable:', isDirectlyEditable);
    console.log('[ContextMenu] Editable child:', editableChild);
    console.log('[ContextMenu] Editable parent:', editableParent);

    if (!isEditableElement) {
        console.log('[ContextMenu] Not an editable element, allowing default menu');
        return; // 允许默认右键菜单
    }

    console.log('[ContextMenu] Preventing default and showing custom menu');
    event.preventDefault();
    
    // 如果点击的不是直接的可编辑元素，尝试找到最近的可编辑元素
    currentTarget = isDirectlyEditable ? target : 
                   (editableParent || editableChild || target.querySelector('input, textarea'));
    
    console.log('[ContextMenu] Current target set to:', currentTarget);
    
    // 更新菜单项状态
    updateMenuItemStates();
    
    // 显示菜单
    showContextMenu(event.clientX, event.clientY);
}

/**
 * 更新菜单项的启用/禁用状态
 */
function updateMenuItemStates() {
    if (!contextMenu || !currentTarget) return;

    const hasSelection = getSelectedText().length > 0;
    const canPaste = true; // 我们总是显示粘贴选项，让浏览器处理实际的粘贴权限

    // 更新菜单项状态
    const menuItems = contextMenu.querySelectorAll('.context-menu-item');
    menuItems.forEach(item => {
        const action = item.dataset.action;
        item.classList.remove('disabled');
        
        switch (action) {
            case 'cut':
            case 'copy':
                if (!hasSelection) {
                    item.classList.add('disabled');
                }
                break;
            case 'selectAll':
                // 全选总是可用
                break;
            case 'paste':
                // 粘贴总是显示，由浏览器处理权限
                break;
        }
    });
}

/**
 * 显示右键菜单
 */
function showContextMenu(x, y) {
    if (!contextMenu) return;

    contextMenu.classList.remove('hidden');
    
    // 获取菜单尺寸
    const menuRect = contextMenu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 调整位置避免超出视窗
    let adjustedX = x;
    let adjustedY = y;
    
    if (x + menuRect.width > viewportWidth) {
        adjustedX = viewportWidth - menuRect.width - 5;
    }
    
    if (y + menuRect.height > viewportHeight) {
        adjustedY = viewportHeight - menuRect.height - 5;
    }
    
    contextMenu.style.left = `${adjustedX}px`;
    contextMenu.style.top = `${adjustedY}px`;
}

/**
 * 隐藏右键菜单
 */
function hideContextMenu() {
    if (contextMenu) {
        contextMenu.classList.add('hidden');
    }
    currentTarget = null;
}

/**
 * 处理菜单项点击
 */
function handleMenuItemClick(event) {
    const menuItem = event.target.closest('.context-menu-item');
    if (!menuItem || menuItem.classList.contains('disabled')) return;

    const action = menuItem.dataset.action;
    executeAction(action);
    hideContextMenu();
}

/**
 * 执行菜单动作
 */
function executeAction(action) {
    if (!currentTarget) return;

    try {
        switch (action) {
            case 'selectAll':
                selectAllText();
                break;
            case 'cut':
                cutText();
                break;
            case 'copy':
                copyText();
                break;
            case 'paste':
                pasteText();
                break;
        }
    } catch (error) {
        console.error('执行右键菜单动作失败:', error);
    }
}

/**
 * 全选文本
 */
function selectAllText() {
    if (!currentTarget) return;

    if (currentTarget.tagName === 'INPUT' || currentTarget.tagName === 'TEXTAREA') {
        currentTarget.select();
    } else if (currentTarget.contentEditable === 'true') {
        const range = document.createRange();
        range.selectNodeContents(currentTarget);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

/**
 * 剪切文本
 */
function cutText() {
    if (!currentTarget) return;

    const selectedText = getSelectedText();
    if (!selectedText) return;

    // 复制到剪贴板
    navigator.clipboard.writeText(selectedText).then(() => {
        // 删除选中的文本
        if (currentTarget.tagName === 'INPUT' || currentTarget.tagName === 'TEXTAREA') {
            const start = currentTarget.selectionStart;
            const end = currentTarget.selectionEnd;
            const value = currentTarget.value;
            currentTarget.value = value.slice(0, start) + value.slice(end);
            currentTarget.setSelectionRange(start, start);
        } else if (currentTarget.contentEditable === 'true') {
            document.execCommand('delete');
        }
        
        // 触发input事件以通知其他组件
        currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
    }).catch(err => {
        console.error('剪切失败:', err);
        // 降级到使用execCommand
        document.execCommand('cut');
    });
}

/**
 * 复制文本
 */
function copyText() {
    const selectedText = getSelectedText();
    if (!selectedText) return;

    navigator.clipboard.writeText(selectedText).then(() => {
        console.log('文本已复制到剪贴板');
    }).catch(err => {
        console.error('复制失败:', err);
        // 降级到使用execCommand
        document.execCommand('copy');
    });
}

/**
 * 粘贴文本
 */
function pasteText() {
    if (!currentTarget) return;

    navigator.clipboard.readText().then(text => {
        if (currentTarget.tagName === 'INPUT' || currentTarget.tagName === 'TEXTAREA') {
            const start = currentTarget.selectionStart;
            const end = currentTarget.selectionEnd;
            const value = currentTarget.value;
            currentTarget.value = value.slice(0, start) + text + value.slice(end);
            currentTarget.setSelectionRange(start + text.length, start + text.length);
        } else if (currentTarget.contentEditable === 'true') {
            document.execCommand('insertText', false, text);
        }
        
        // 触发input事件以通知其他组件
        currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
    }).catch(err => {
        console.error('粘贴失败:', err);
        // 不再使用降级方案，避免重复粘贴
        // 如果clipboard API失败，说明可能是权限问题或浏览器兼容性问题
        // 此时显示用户友好的错误提示
        console.warn('无法访问剪贴板，请使用浏览器原生粘贴快捷键');
    });
}

/**
 * 获取当前选中的文本
 */
function getSelectedText() {
    if (!currentTarget) return '';

    if (currentTarget.tagName === 'INPUT' || currentTarget.tagName === 'TEXTAREA') {
        return currentTarget.value.slice(currentTarget.selectionStart, currentTarget.selectionEnd);
    } else if (currentTarget.contentEditable === 'true') {
        return window.getSelection().toString();
    }
    
    return '';
}

/**
 * 处理键盘快捷键
 */
function handleKeyDown(event) {
    // 隐藏菜单当按下Escape键
    if (event.key === 'Escape') {
        hideContextMenu();
        return;
    }

    // 处理标准快捷键
    if (event.metaKey || event.ctrlKey) {
        const target = event.target;
        const isEditableElement = target.tagName === 'INPUT' || 
                                 target.tagName === 'TEXTAREA' || 
                                 target.contentEditable === 'true' ||
                                 target.closest('[contenteditable="true"]');

        if (!isEditableElement) return;

        currentTarget = target;

        switch (event.key.toLowerCase()) {
            case 'a':
                event.preventDefault();
                selectAllText();
                break;
            case 'x':
                event.preventDefault();
                cutText();
                break;
            case 'c':
                event.preventDefault();
                copyText();
                break;
            case 'v':
                // 不拦截粘贴快捷键，让浏览器自己处理
                // 只在右键菜单中提供粘贴功能
                break;
        }
    }
} 