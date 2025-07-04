import * as api from '../../api.js';

/**
 * 存储信息模块 - 负责处理存储信息查看
 * 
 * 职责：
 * - 显示存储信息和状态
 * - 提供存储信息查看的UI交互
 */

let isInitialized = false;

/**
 * 显示存储信息
 */
function handleShowStorageInfo() {
    api.postMessageWithResponse('getStorageInfo')
        .then(info => {
            // 这里可以显示存储信息的详细对话框或toast
            api.showToast('存储信息已获取', 'info');
        })
        .catch(err => api.showToast(`获取存储信息失败: ${err.message}`, 'error'));
}

/**
 * 获取存储信息相关的DOM元素
 * @returns {Object} DOM元素对象
 */
function getElements() {
    return {
        showStorageInfoButton: document.getElementById('show-storage-info-btn')
    };
}

/**
 * 初始化存储信息模块
 * - 绑定事件监听器
 * - 设置UI交互逻辑
 */
export function init() {
    if (isInitialized) return;
    
    // show-storage-info-btn 事件绑定已在 eventHandlers.js 中全局处理
    // 移除重复绑定以避免冲突
    
    isInitialized = true;
    console.log('存储信息模块已初始化');
}

/**
 * 更新存储信息视图
 * @param {Object} settings - 设置对象
 */
export function updateView(settings) {
    // 存储信息模块不需要更新显示状态
}

/**
 * 重置模块状态（用于测试或重新初始化）
 */
export function reset() {
    isInitialized = false;
}

// 导出供外部使用的函数
export {
    handleShowStorageInfo
}; 