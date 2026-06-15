const API_BASE = '/api/v2';

document.addEventListener('DOMContentLoaded', () => {
    loadTables();

    // Auto refresh every 5 seconds
    setInterval(loadTables, 5000);
});

async function loadTables() {
    try {
        const res = await fetch(`${API_BASE}/admin/tables?t=${Date.now()}`);
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
        
        card.className = `bg-surface-container-lowest rounded-2xl shadow-[0px_4px_12px_rgba(0,0,0,0.04)] border border-outline-variant p-6 flex flex-col gap-4 relative overflow-hidden transition-all ${isActive ? 'hover:shadow-[0px_8px_24px_rgba(0,0,0,0.08)]' : 'bg-surface-container-low grayscale-[20%]'}`;
        
        // Active indicator bar
        const indicator = isActive 
            ? `<div class="absolute top-0 left-0 w-full h-1 bg-[#10b981]"></div>`
            : `<div class="absolute top-0 left-0 w-full h-1 bg-outline-variant"></div>`;

        const badgeHtml = isActive 
            ? `<span class="bg-[#10b981]/10 text-[#10b981] px-3 py-1 rounded-full font-label-sm font-bold text-[12px] flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>稼働中</span>`
            : `<span class="bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full font-label-sm font-bold text-[12px] flex items-center gap-1">会計済み</span>`;

        card.innerHTML = `
            ${indicator}
            <div class="flex justify-between items-center pb-4 border-b border-outline-variant">
                <h3 class="font-headline-md text-[20px] font-bold text-on-surface m-0">${table.name}</h3>
                ${badgeHtml}
            </div>
            <div class="flex flex-col gap-1 my-2">
                <div class="font-label-md text-[13px] text-on-surface-variant">現在の注文合計</div>
                <div class="font-headline-lg text-[32px] font-bold text-secondary">¥${table.total.toLocaleString()}</div>
            </div>
            <button 
                onclick="${isActive ? `checkout('${table.name}')` : `resetTable('${table.name}')`}" 
                class="mt-auto w-full py-3 rounded-xl font-label-lg font-bold text-[14px] transition-all flex items-center justify-center gap-2
                ${isActive ? 'bg-error hover:bg-[#93000a] text-on-error active:scale-95' : 'bg-secondary hover:bg-[#004493] text-on-secondary active:scale-95'}"
            >
                <span class="material-symbols-outlined text-[20px]">${isActive ? 'point_of_sale' : 'restart_alt'}</span>
                ${isActive ? 'お会計を済ませる' : 'リセット (次のお客様)'}
            </button>
        `;
        grid.appendChild(card);
    });
}

async function resetTable(tableName) {
    if(!confirm(`${tableName} の注文履歴をクリアし、新しいお客様をご案内できる状態にリセットしますか？\n※この操作は取り消せません。`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table_name: tableName })
        });
        
        if (res.ok) {
            alert('卓をリセットしました。');
            loadTables();
        } else {
            alert('処理に失敗しました。');
        }
    } catch (e) {
        console.error(e);
        alert('通信エラーが発生しました。');
    }
}

async function checkout(tableName) {
    if(!confirm(`${tableName} のお会計処理を実行しますか？\n実行するとお客様のスマホ画面は「会計完了」画面に切り替わり、追加注文できなくなります。`)) {
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
