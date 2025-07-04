function renderBackupList(backups) {
    const backupList = document.getElementById('backup-list');
    if (!backupList) return;

    // 确保 backups 是数组
    if (!Array.isArray(backups)) {
        console.error('renderBackupList: backups is not an array:', backups);
        backups = [];
    }

    if (backups.length === 0) {
        backupList.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" class="empty-state-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3.5 2A1.5 1.5 0 002 3.5v13A1.5 1.5 0 003.5 18h13a1.5 1.5 0 001.5-1.5V6.828a1.5 1.5 0 00-.44-1.06l-3.328-3.328A1.5 1.5 0 0013.172 2H3.5zM10 12a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                    <path d="M10 8a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V8.75a.75.75 0 00-.75-.75h-.01z" />
                </svg>
                <h3>没有找到备份文件</h3>
                <p>在"数据管理"页面中可以创建新的备份。</p>
            </div>
        `;
        return;
    }

    backupList.innerHTML = backups.map(backup => {
        // 展示时去除 .json/.json.bak 后缀，用户不可见
        const displayName = backup.name.replace(/^backup-/, '').replace(/\.json$|\.json\.bak$/i, '');
        const date = new Date(backup.timestamp);
        // 检查日期是否有效，无效则不显示
        const formattedDate = !isNaN(date.getTime()) 
            ? `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
            : null;
        const formattedSize = backup.size > 0 ? `${(backup.size / 1024).toFixed(2)} KB` : '0 KB';
        const metaInfo = formattedDate ? `${formattedDate} &bull; ${formattedSize}` : formattedSize;

        return `
            <li class="backup-item-card" data-filename="${encodeURIComponent(backup.name)}">
                <div class="backup-info">
                    <div class="backup-name-display">
                        <span class="backup-name">${displayName}</span>
                        <span class="backup-meta">${metaInfo}</span>
                    </div>
                    <div class="backup-name-edit hidden">
                        <!-- 输入框只显示纯文件名，不带 .json 后缀 -->
                        <input type="text" class="backup-name-input input-field" value="${displayName}" />
                    </div>
                </div>
                <div class="backup-actions">
                    <div class="backup-actions-display">
                        <button class="btn-icon rename-backup-btn" title="重命名">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg>
                        </button>
                        <button class="btn-icon restore-backup-btn" title="恢复">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a.75.75 0 01.75.75v3.593l2.22-2.22a.75.75 0 011.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.22 2.22V2.75A.75.75 0 0110 2zM5.055 9.45A6.5 6.5 0 1114.945 9.45a.75.75 0 11-1.414-.53A5 5 0 106.47 9.98a.75.75 0 01-1.414-.53z" clip-rule="evenodd" /></svg>
                        </button>
                        <button class="btn-icon btn-danger delete-backup-btn" title="删除">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 10.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg>
                        </button>
                    </div>
                    <div class="backup-actions-edit hidden">
                        <button class="btn-icon save-rename-btn" title="保存">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clip-rule="evenodd" /></svg>
                        </button>
                        <button class="btn-icon cancel-rename-btn" title="取消">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                        </button>
                    </div>
                </div>
            </li>
        `;
    }).join('');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderBackupList };
} 