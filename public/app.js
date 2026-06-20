const API_BASE = '/api/v2';

// TODO: メニュー検索機能は現在WAFの誤検知バグ調査中のため、UI上からは一時的に無効化しています。
// 復旧までは直接APIを叩いてテストしてください。
// async function searchMenu(query) {
//     const res = await fetch(`${API_BASE}/menu/search?q=${query}`);
//     const data = await res.json();
//     console.log(data);
// }

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const qrForm = document.getElementById('qrForm');
    const logoutBtn = document.getElementById('logoutBtn');

    // Login Logic (QR Simulation)
    if (qrForm) {
        qrForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const qrData = document.getElementById('qrData').value;
            const errorDiv = document.getElementById('loginError');

            try {
                const res = await fetch(`${API_BASE}/auth/signin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ qr_data: qrData })
                });

                const data = await res.json();

                if (res.ok && data.token) {
                    // Note: table_2 はシナリオ上お会計済みになりますが、table_1 や table_3 などはテスト用に稼働させています。
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('table_name', data.table_name);
                    window.location.href = 'order.html';
                } else {
                    errorDiv.textContent = data.message || 'QRコードが無効です';
                    errorDiv.style.display = 'block';
                }
            } catch (err) {
                console.error(err);
                errorDiv.textContent = '通信エラーが発生しました';
                errorDiv.style.display = 'block';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('table_name');
            window.location.href = 'index.html';
        });
    }

    // Order App Logic
    const path = window.location.pathname;
    if (path.endsWith('order.html') || path === '/order.html' || path.endsWith('/order') || path === '/order') {
        const token = localStorage.getItem('token');
        const tableName = localStorage.getItem('table_name');
        if (!token) {
            window.location.href = 'index.html';
            return;
        }

        document.getElementById('tableDisplay').textContent = `${tableName}`;

        let cart = [];
        let allMenuItems = [];

        // Check if already checked out on load
        fetch(`${API_BASE}/table/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'ok' && data.data.status === 'checked_out') {
                window.location.href = 'thankyou.html';
            }
        })
        .catch(err => console.error('Initial Status check failed:', err));

        // Tabs
        const tabMenu = document.getElementById('tabMenu');
        const tabHistory = document.getElementById('tabHistory');
        const menuSection = document.getElementById('menuSection');
        const historySection = document.getElementById('historySection');

        tabMenu.addEventListener('click', (e) => {
            e.preventDefault();
            tabMenu.classList.remove('text-on-surface-variant', 'hover:text-secondary');
            tabMenu.classList.add('bg-secondary-container', 'text-on-secondary-container');
            tabHistory.classList.remove('bg-secondary-container', 'text-on-secondary-container');
            tabHistory.classList.add('text-on-surface-variant', 'hover:text-secondary');
            menuSection.classList.remove('hidden');
            historySection.classList.add('hidden');
        });

        tabHistory.addEventListener('click', (e) => {
            e.preventDefault();
            tabHistory.classList.remove('text-on-surface-variant', 'hover:text-secondary');
            tabHistory.classList.add('bg-secondary-container', 'text-on-secondary-container');
            tabMenu.classList.remove('bg-secondary-container', 'text-on-secondary-container');
            tabMenu.classList.add('text-on-surface-variant', 'hover:text-secondary');
            menuSection.classList.add('hidden');
            historySection.classList.remove('hidden');
            loadHistory();
        });

        // Load Menu
        fetch(`${API_BASE}/menu/list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'ok') {
                allMenuItems = data.data;
                const menuList = document.getElementById('menuList');
                menuList.innerHTML = '';
                data.data.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'bg-surface-container-lowest rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.04)] overflow-hidden border border-outline-variant flex flex-col group active:scale-[0.98] transition-transform';
                    div.innerHTML = `
                        <div class="p-4 flex flex-col flex-grow">
                            <h3 class="font-headline-md text-[18px] text-on-surface font-bold mb-1">${item.name}</h3>
                            <p class="font-body-md text-secondary font-bold mb-4">¥${item.price}</p>
                            <button onclick="addToCart(${item.id})" class="mt-auto w-full py-2.5 bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary transition-all rounded-lg font-label-lg font-bold text-[14px] flex items-center justify-center gap-2 active:opacity-70">
                                <span class="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                                カートへ追加
                            </button>
                        </div>
                    `;
                    menuList.appendChild(div);
                });
            }
        });

        // Cart Logic
        const cartFab = document.getElementById('cartFab');
        const cartCountBadge = document.getElementById('cartCountBadge');
        const cartModal = document.getElementById('cartModal');
        const closeCartBtn = document.getElementById('closeCartBtn');
        const cartItemsList = document.getElementById('cartItemsList');
        const cartTotal = document.getElementById('cartTotal');
        const checkoutCartBtn = document.getElementById('checkoutCartBtn');

        const orderCompleteOverlay = document.getElementById('orderCompleteOverlay');
        const closeOrderCompleteBtn = document.getElementById('closeOrderCompleteBtn');
        const orderCompleteCard = document.getElementById('orderCompleteCard');

        window.addToCart = (menuItemId) => {
            const item = allMenuItems.find(i => i.id === menuItemId);
            if (!item) return;
            
            const existing = cart.find(c => c.id === menuItemId);
            if (existing) {
                existing.quantity += 1;
            } else {
                cart.push({ ...item, quantity: 1 });
            }
            updateCartUI();
        };

        window.updateCartQuantity = (menuItemId, change) => {
            const index = cart.findIndex(c => c.id === menuItemId);
            if (index > -1) {
                cart[index].quantity += change;
                if (cart[index].quantity <= 0) {
                    cart.splice(index, 1);
                }
                updateCartUI();
            }
        };

        function updateCartUI() {
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCountBadge.textContent = totalItems;
            
            if (totalItems > 0) {
                cartFab.classList.remove('hidden');
            } else {
                cartFab.classList.add('hidden');
            }

            cartItemsList.innerHTML = '';
            let totalAmount = 0;
            cart.forEach(item => {
                totalAmount += item.price * item.quantity;
                const div = document.createElement('div');
                div.className = 'flex justify-between items-center bg-surface-container-low p-3 rounded-xl border border-outline-variant';
                div.innerHTML = `
                    <div class="flex flex-col">
                        <span class="font-bold text-on-surface text-[14px]">${item.name}</span>
                        <span class="text-secondary font-bold text-[14px]">¥${item.price}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="updateCartQuantity(${item.id}, -1)" class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors">
                            <span class="material-symbols-outlined text-[18px]">remove</span>
                        </button>
                        <span class="font-bold w-4 text-center">${item.quantity}</span>
                        <button onclick="updateCartQuantity(${item.id}, 1)" class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors">
                            <span class="material-symbols-outlined text-[18px]">add</span>
                        </button>
                    </div>
                `;
                cartItemsList.appendChild(div);
            });
            
            if (cart.length === 0) {
                cartItemsList.innerHTML = '<p class="text-center text-on-surface-variant py-4 font-body-md">カートは空です</p>';
                checkoutCartBtn.disabled = true;
                checkoutCartBtn.classList.add('opacity-50');
            } else {
                checkoutCartBtn.disabled = false;
                checkoutCartBtn.classList.remove('opacity-50');
            }
            
            cartTotal.textContent = `¥${totalAmount}`;
        }

        cartFab.addEventListener('click', () => {
            cartModal.classList.remove('hidden');
            cartModal.classList.add('flex');
        });

        closeCartBtn.addEventListener('click', () => {
            cartModal.classList.add('hidden');
            cartModal.classList.remove('flex');
        });

        checkoutCartBtn.addEventListener('click', async () => {
            if (cart.length === 0) return;
            
            checkoutCartBtn.disabled = true;
            checkoutCartBtn.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size: 18px;">sync</span> 送信中...';

            try {
                const promises = cart.map(item => {
                    return fetch(`${API_BASE}/orders`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ menu_item_id: item.id, quantity: item.quantity })
                    });
                });

                const results = await Promise.all(promises);
                const hasError = results.some(r => !r.ok);

                if (hasError) {
                    alert('一部の注文が失敗しました。お会計済みの可能性があります。');
                } else {
                    cart = [];
                    updateCartUI();
                    cartModal.classList.add('hidden');
                    cartModal.classList.remove('flex');
                    
                    orderCompleteOverlay.classList.remove('hidden');
                    orderCompleteOverlay.classList.add('flex');
                    setTimeout(() => {
                        orderCompleteCard.classList.remove('scale-95', 'opacity-0');
                        orderCompleteCard.classList.add('scale-100', 'opacity-100');
                    }, 10);
                }
            } catch (e) {
                console.error(e);
                alert('注文に失敗しました。通信エラー。');
            } finally {
                checkoutCartBtn.disabled = false;
                checkoutCartBtn.innerHTML = '注文を確定する';
            }
        });

        closeOrderCompleteBtn.addEventListener('click', () => {
            orderCompleteCard.classList.remove('scale-100', 'opacity-100');
            orderCompleteCard.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                orderCompleteOverlay.classList.add('hidden');
                orderCompleteOverlay.classList.remove('flex');
                
                if (tabHistory.classList.contains('bg-secondary-container')) {
                    loadHistory();
                }
            }, 300);
        });


        // Load History
        function loadHistory() {
            fetch(`${API_BASE}/r/session-data`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                const tbody = document.getElementById('orderHistoryBody');
                
                if (data.status === 'ok') {
                    let html = '';

                    const myOrders = data.data;

                    myOrders.forEach(o => {
                        html += `<tr class="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors">
                            <td class="p-4 font-body-md text-on-surface">${o.menu_name}</td>
                            <td class="p-4 font-body-md text-on-surface">¥${o.price}</td>
                            <td class="p-4 font-body-md text-on-surface text-center">${o.quantity}</td>
                        </tr>`;
                    });

                    if (myOrders.length === 0) {
                        html = `<tr><td colspan="3" class="p-8 text-center text-on-surface-variant font-body-md">まだ注文がありません</td></tr>`;
                    }

                    tbody.innerHTML = html;
                }
            });
        }

        // Poll table status to check for checkout
        setInterval(() => {
            fetch(`${API_BASE}/table/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'ok' && data.data.status === 'checked_out') {
                    window.location.href = 'thankyou.html';
                }
            })
            .catch(err => console.error('Status check failed:', err));
        }, 5000);
    }
});

