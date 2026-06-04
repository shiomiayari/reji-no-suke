const API_BASE = '/api/v2';

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
    if (window.location.pathname.endsWith('order.html') || window.location.pathname === '/order.html') {
        const token = localStorage.getItem('token');
        const tableName = localStorage.getItem('table_name');
        if (!token) {
            window.location.href = 'index.html';
            return;
        }

        document.getElementById('tableDisplay').textContent = `${tableName}`;

        // Tabs
        const tabMenu = document.getElementById('tabMenu');
        const tabHistory = document.getElementById('tabHistory');
        const menuSection = document.getElementById('menuSection');
        const historySection = document.getElementById('historySection');

        tabMenu.addEventListener('click', () => {
            tabMenu.classList.add('active');
            tabHistory.classList.remove('active');
            menuSection.style.display = 'block';
            historySection.style.display = 'none';
        });

        tabHistory.addEventListener('click', () => {
            tabHistory.classList.add('active');
            tabMenu.classList.remove('active');
            menuSection.style.display = 'none';
            historySection.style.display = 'block';
            loadHistory();
        });

        // Load Menu
        fetch(`${API_BASE}/menu/list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'ok') {
                const menuList = document.getElementById('menuList');
                menuList.innerHTML = '';
                data.data.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'menu-item';
                    div.innerHTML = `
                        <div>
                            <div style="font-weight: bold;">${item.name}</div>
                            <div class="price">¥${item.price}</div>
                        </div>
                        <button onclick="placeOrder(${item.id})" style="width: auto; padding: 0.5rem 1rem;">注文</button>
                    `;
                    menuList.appendChild(div);
                });
            }
        });

        // Global order function
        window.placeOrder = async (menuItemId) => {
            if(!confirm('この商品を注文しますか？')) return;
            try {
                const res = await fetch(`${API_BASE}/orders`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ menu_item_id: menuItemId, quantity: 1 })
                });
                if (res.ok) {
                    alert('ご注文を承りました！');
                }
            } catch (e) {
                alert('注文に失敗しました');
            }
        };

        // Load History & Bill
        function loadHistory() {
            // Fetch session data (which has the IDOR vulnerability)
            fetch(`${API_BASE}/r/session-data`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                const tbody = document.getElementById('orderHistoryBody');
                const encodedTableId = btoa(tableName); // Front-end filter to show only this table
                
                if (data.status === 'ok') {
                    let html = '';
                    let subtotal = 0;

                    // The vulnerability: data.data contains EVERY table's orders.
                    // The client side filters it.
                    const myOrders = data.data.filter(o => o.table_id === encodedTableId);

                    myOrders.forEach(o => {
                        html += `<tr>
                            <td>${o.menu_name}</td>
                            <td>¥${o.price}</td>
                            <td>${o.quantity}</td>
                        </tr>`;
                        subtotal += (o.price * o.quantity);
                    });

                    if (myOrders.length === 0) {
                        html = `<tr><td colspan="3" class="text-center text-secondary">まだ注文がありません</td></tr>`;
                    }

                    tbody.innerHTML = html;

                    // INTENTIONAL OVERCHARGE: Add 2500 JPY to the actual subtotal
                    // This is the "botta-kuri" (overcharge) mechanism shown to the customer
                    let fakeTotal = subtotal > 0 ? subtotal + 2500 : 0;
                    document.getElementById('totalAmount').textContent = `¥${fakeTotal}`;
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

