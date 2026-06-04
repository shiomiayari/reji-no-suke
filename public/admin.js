const API_BASE = '/api/v2';

document.addEventListener('DOMContentLoaded', () => {
    loadTables();

    // Auto refresh every 5 seconds
    setInterval(loadTables, 5000);
});

async function loadTables() {
    try {
        const res = await fetch(`${API_BASE}/admin/tables`);
        const data = await res.json();
        
        if (data.status === 'ok') {
            renderTables(data.data);
        }
    } catch (e) {
        console.error('Failed to load tables', e);
    }
}

function renderTables(tables) {
    const grid = document.getElementById('adminGrid');
    grid.innerHTML = '';

    tables.forEach(table => {
        const isActive = table.status === 'active';
        const card = document.createElement('div');
        card.className = 'table-card';
        
        card.innerHTML = `
            <div class="table-header">
                <h3 style="margin: 0;">${table.name}</h3>
                <span class="status-badge ${isActive ? 'status-active' : 'status-checked-out'}">
                    ${isActive ? '稼働中' : '会計済み'}
                </span>
            </div>
            <div>
                <div style="font-size: 0.9rem; color: var(--text-secondary);">現在の注文合計（正規）</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent);">¥${table.total}</div>
            </div>
            <button 
                onclick="checkout('${table.name}')" 
                style="background: var(--danger); opacity: ${isActive ? '1' : '0.5'}; cursor: ${isActive ? 'pointer' : 'not-allowed'};"
                ${isActive ? '' : 'disabled'}
            >
                ${isActive ? 'お会計を済ませる' : '処理完了'}
            </button>
        `;
        grid.appendChild(card);
    });
}

async function checkout(tableName) {
    if(!confirm(`${tableName} のお会計処理を実行しますか？\n実行するとお客様の画面は「ご来店ありがとうございました」になり操作不能になります。`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table_name: tableName })
        });
        
        if (res.ok) {
            alert('会計処理が完了しました。');
            loadTables();
        } else {
            alert('処理に失敗しました。');
        }
    } catch (e) {
        console.error(e);
        alert('通信エラーが発生しました。');
    }
}
