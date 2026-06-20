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
            ? `<span class="bg-[#10b981]/10 text-[#10b981] px-3 py-1 rounded-full font-label-sm font-bold text-[12px] flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>遞ｼ蜒堺ｸｭ</span>`
            : `<span class="bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full font-label-sm font-bold text-[12px] flex items-center gap-1">莨夊ｨ域ｸ医∩</span>`;

        card.innerHTML = `
            ${indicator}
            <div class="flex justify-between items-center pb-4 border-b border-outline-variant">
                <h3 class="font-headline-md text-[20px] font-bold text-on-surface m-0">${table.name}</h3>
                ${badgeHtml}
            </div>
            <div class="flex flex-col gap-1 my-2">
                <div class="font-label-md text-[13px] text-on-surface-variant">迴ｾ蝨ｨ縺ｮ豕ｨ譁�粋險�</div>
                <div class="font-headline-lg text-[32px] font-bold text-secondary">ﾂ･${table.total.toLocaleString()}</div>
            </div>
            <button 
                onclick="${isActive ? `checkout('${table.name}')` : `resetTable('${table.name}')`}" 
                class="mt-auto w-full py-3 rounded-xl font-label-lg font-bold text-[14px] transition-all flex items-center justify-center gap-2
                ${isActive ? 'bg-error hover:bg-[#93000a] text-on-error active:scale-95' : 'bg-secondary hover:bg-[#004493] text-on-secondary active:scale-95'}"
            >
                <span class="material-symbols-outlined text-[20px]">${isActive ? 'point_of_sale' : 'restart_alt'}</span>
                ${isActive ? '縺贋ｼ夊ｨ医ｒ貂医∪縺帙ｋ' : '繝ｪ繧ｻ繝�ヨ (谺｡縺ｮ縺雁ｮ｢讒�)'}
            </button>
            ${!isActive ? `
            <button onclick="downloadReceipt('${table.name}')" class="mt-2 w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-bold text-[14px] transition-all flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-[18px]">receipt_long</span>
                鬆伜庶譖ｸPDF繧貞�蜉�
            </button>
            ` : ''}
        `;
        grid.appendChild(card);
    });
}

async function resetTable(tableName) {
    if(!confirm(`${tableName} 縺ｮ豕ｨ譁�ｱ･豁ｴ繧偵け繝ｪ繧｢縺励∵眠縺励＞縺雁ｮ｢讒倥ｒ縺疲｡亥�縺ｧ縺阪ｋ迥ｶ諷九↓繝ｪ繧ｻ繝�ヨ縺励∪縺吶°�歃n窶ｻ縺薙�謫堺ｽ懊�蜿悶ｊ豸医○縺ｾ縺帙ｓ縲Ａ)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table_name: tableName })
        });
        
        if (res.ok) {
            alert('蜊薙ｒ繝ｪ繧ｻ繝�ヨ縺励∪縺励◆縲�');
            loadTables();
        } else {
            alert('蜃ｦ逅�↓螟ｱ謨励＠縺ｾ縺励◆縲�');
        }
    } catch (e) {
        console.error(e);
        alert('騾壻ｿ｡繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲�');
    }
}

async function checkout(tableName) {
    if(!confirm(`${tableName} 縺ｮ縺贋ｼ夊ｨ亥�逅�ｒ螳溯｡後＠縺ｾ縺吶°�歃n螳溯｡後☆繧九→縺雁ｮ｢讒倥�繧ｹ繝槭�逕ｻ髱｢縺ｯ縲御ｼ夊ｨ亥ｮ御ｺ�咲判髱｢縺ｫ蛻�ｊ譖ｿ繧上ｊ縲∬ｿｽ蜉�豕ｨ譁�〒縺阪↑縺上↑繧翫∪縺吶Ａ)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table_name: tableName })
        });
        
        if (res.ok) {
            alert('莨夊ｨ亥�逅�′螳御ｺ�＠縺ｾ縺励◆縲�');
            loadTables();
        } else {
            alert('蜃ｦ逅�↓螟ｱ謨励＠縺ｾ縺励◆縲�');
        }
    } catch (e) {
        console.error(e);
        alert('騾壻ｿ｡繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲�');
    }
}

async function downloadReceipt(tableName) {
    const filename = prompt('出力するPDFのファイル名を入力してください', 'receipt_' + tableName + '.pdf');
    if(!filename) return;

    try {
        const res = await fetch(`${API_BASE}/admin/receipt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
        const data = await res.json();
        alert(data.output || '出力しました');
    } catch(e) {
        alert('通信エラーが発生しました');
    }
}

// TODO: 管理者専用のメモAPI（現在はコンソールでのみ確認可能。後でUIを作る）
// fetch('/api/v2/admin/secret-flag').then(res => res.json()).then(console.log);

