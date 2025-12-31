// おかいものサポート アプリ

// データの初期化
let wallet = {
    10000: 0,
    5000: 0,
    1000: 0,
    500: 0,
    100: 0,
    50: 0,
    10: 0,
    5: 0,
    1: 0
};

let products = [];
let productIdCounter = 0;

// よく買うもの機能のデータ
let stores = [];  // { id, name, items: [{ id, name, price }] }
let storeIdCounter = 0;
let itemIdCounter = 0;
let currentStoreId = null;  // 現在選択中のお店

// 金種の順序（大きい順）
const moneyTypes = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];

// DOM要素の取得
const walletBtn = document.getElementById('wallet-btn');
const walletModal = document.getElementById('wallet-modal');
const walletModalClose = document.getElementById('wallet-modal-close');
const walletSaveBtn = document.getElementById('wallet-save-btn');
const walletTotalDisplay = document.getElementById('wallet-total-display');
const walletModalTotal = document.getElementById('wallet-modal-total');

const addProductBtn = document.getElementById('add-product-btn');
const productModal = document.getElementById('product-modal');
const productModalClose = document.getElementById('product-modal-close');
const productAddBtn = document.getElementById('product-add-btn');
const priceInput = document.getElementById('price-input');
const taxToggle = document.getElementById('tax-toggle');
const taxResult = document.getElementById('tax-result');

const productList = document.getElementById('product-list');
const productTotalDisplay = document.getElementById('product-total-display');
const statusDisplay = document.getElementById('status-display');
const statusIcon = document.getElementById('status-icon');
const statusText = document.getElementById('status-text');
const remainingAmount = document.getElementById('remaining-amount');

const paymentSection = document.getElementById('payment-section');
const paymentList = document.getElementById('payment-list');
const changeDisplay = document.getElementById('change-display');
const payBtn = document.getElementById('pay-btn');

// よく買うもの機能のDOM要素
const favoritesBtn = document.getElementById('favorites-btn');
const storeModal = document.getElementById('store-modal');
const storeModalClose = document.getElementById('store-modal-close');
const storeList = document.getElementById('store-list');
const storeEmpty = document.getElementById('store-empty');
const addStoreBtn = document.getElementById('add-store-btn');

const favoriteItemsModal = document.getElementById('favorite-items-modal');
const favoriteItemsModalClose = document.getElementById('favorite-items-modal-close');
const favoriteItemsTitle = document.getElementById('favorite-items-title');
const favoriteItemsList = document.getElementById('favorite-items-list');
const itemsEmpty = document.getElementById('items-empty');
const addFavoriteItemBtn = document.getElementById('add-favorite-item-btn');

const registerStoreModal = document.getElementById('register-store-modal');
const registerStoreModalClose = document.getElementById('register-store-modal-close');
const storeNameInput = document.getElementById('store-name-input');
const registerStoreBtn = document.getElementById('register-store-btn');

const registerItemModal = document.getElementById('register-item-modal');
const registerItemModalClose = document.getElementById('register-item-modal-close');
const itemNameInput = document.getElementById('item-name-input');
const itemPriceInput = document.getElementById('item-price-input');
const itemTaxToggle = document.getElementById('item-tax-toggle');
const itemTaxResult = document.getElementById('item-tax-result');
const registerItemBtn = document.getElementById('register-item-btn');

// ユーティリティ関数
function formatMoney(amount) {
    return amount.toLocaleString() + '円';
}

function calculateWalletTotal(walletData = wallet) {
    let total = 0;
    for (const [value, count] of Object.entries(walletData)) {
        total += parseInt(value) * count;
    }
    return total;
}

function calculateProductTotal() {
    return products.reduce((sum, product) => sum + product.price, 0);
}

// ローカルストレージ
function saveWalletToStorage() {
    localStorage.setItem('wallet', JSON.stringify(wallet));
}

function loadWalletFromStorage() {
    const saved = localStorage.getItem('wallet');
    if (saved) {
        wallet = JSON.parse(saved);
    }
}

// 財布の表示更新
function updateWalletDisplay() {
    const total = calculateWalletTotal();
    walletTotalDisplay.textContent = formatMoney(total);
}

function updateWalletModalDisplay() {
    // 各金種の入力フィールドを更新
    for (const value of moneyTypes) {
        const input = document.getElementById(`money-${value}`);
        if (input) {
            input.value = wallet[value];
        }
    }
    // 合計を更新
    const total = calculateWalletTotal();
    walletModalTotal.textContent = formatMoney(total);
}

// 商品リストの表示更新
function updateProductListDisplay() {
    productList.innerHTML = '';

    if (products.length === 0) {
        productList.innerHTML = '<li class="empty-message">まだ何もありません</li>';
    } else {
        products.forEach(product => {
            const li = document.createElement('li');
            li.className = 'product-item';
            li.innerHTML = `
                <span class="product-price">${formatMoney(product.price)}</span>
                <button class="delete-btn" data-id="${product.id}">
                    🗑️ けす
                </button>
            `;
            productList.appendChild(li);
        });
    }

    const total = calculateProductTotal();
    productTotalDisplay.textContent = formatMoney(total);

    updateStatusDisplay();
}

// ステータス表示の更新
function updateStatusDisplay() {
    const walletTotal = calculateWalletTotal();
    const productTotal = calculateProductTotal();
    const remaining = walletTotal - productTotal;

    statusDisplay.classList.remove('can-buy', 'cannot-buy', 'neutral');

    if (products.length === 0) {
        statusDisplay.classList.add('neutral');
        statusIcon.src = 'images/cart.png';
        statusText.textContent = '商品をついかしてね';
        remainingAmount.textContent = '';
        paymentSection.style.display = 'none';
    } else if (remaining >= 0) {
        statusDisplay.classList.add('can-buy');
        statusIcon.src = 'images/ok.png';
        statusText.textContent = '買えるよ！';
        remainingAmount.textContent = `あと ${formatMoney(remaining)} つかえます`;
        updatePaymentDisplay(productTotal);
        paymentSection.style.display = 'block';
    } else {
        statusDisplay.classList.add('cannot-buy');
        statusIcon.src = 'images/ng.png';
        statusText.textContent = 'たりないよ';
        remainingAmount.textContent = `${formatMoney(Math.abs(remaining))} たりません`;
        paymentSection.style.display = 'none';
    }
}

// 支払い方法の計算
function calculatePayment(amount) {
    const payment = {};
    const tempWallet = { ...wallet };
    let remaining = amount;

    // まず、ぴったり払えるか試す
    const exactPayment = tryExactPayment(amount, { ...wallet });
    if (exactPayment) {
        return { payment: exactPayment, change: 0 };
    }

    // ぴったり払えない場合、大きいお金から使って最小限のお釣りで払う
    for (const value of moneyTypes) {
        if (remaining <= 0) break;

        const count = tempWallet[value];
        if (count > 0) {
            const needed = Math.ceil(remaining / value);
            const use = Math.min(needed, count);
            if (use > 0) {
                payment[value] = use;
                remaining -= value * use;
                tempWallet[value] -= use;
            }
        }
    }

    // まだ足りない場合（理論上はここには来ないはず）
    if (remaining > 0) {
        return null;
    }

    const change = -remaining; // remainingが負なので、その絶対値がお釣り
    return { payment, change };
}

// ぴったり払えるかを再帰的に試す
function tryExactPayment(amount, availableWallet, currentPayment = {}, index = 0) {
    if (amount === 0) {
        return currentPayment;
    }
    if (amount < 0 || index >= moneyTypes.length) {
        return null;
    }

    const value = moneyTypes[index];
    const maxCount = Math.min(availableWallet[value], Math.floor(amount / value));

    // 大きい枚数から試す
    for (let count = maxCount; count >= 0; count--) {
        const newPayment = { ...currentPayment };
        if (count > 0) {
            newPayment[value] = count;
        }
        const newAvailable = { ...availableWallet };
        newAvailable[value] -= count;

        const result = tryExactPayment(
            amount - (value * count),
            newAvailable,
            newPayment,
            index + 1
        );

        if (result) {
            return result;
        }
    }

    return null;
}

// 支払い方法の表示
function updatePaymentDisplay(amount) {
    const result = calculatePayment(amount);

    if (!result) {
        paymentList.innerHTML = '<p>支払い方法を計算できません</p>';
        changeDisplay.textContent = '';
        return;
    }

    paymentList.innerHTML = '';

    for (const value of moneyTypes) {
        if (result.payment[value] && result.payment[value] > 0) {
            const div = document.createElement('div');
            div.className = 'payment-item';
            div.innerHTML = `
                <div class="money-type">${formatMoney(value)}</div>
                <div class="money-count">${result.payment[value]}まい</div>
            `;
            paymentList.appendChild(div);
        }
    }

    if (result.change > 0) {
        changeDisplay.textContent = `おつり: ${formatMoney(result.change)}`;
        changeDisplay.style.display = 'block';
    } else {
        changeDisplay.textContent = 'ぴったり！おつりなし';
        changeDisplay.style.display = 'block';
    }
}

// お釣りを財布に反映
function calculateChangeCoins(changeAmount) {
    const coins = {};
    let remaining = changeAmount;

    for (const value of moneyTypes) {
        const count = Math.floor(remaining / value);
        if (count > 0) {
            coins[value] = count;
            remaining -= value * count;
        }
    }

    return coins;
}

// 支払い処理
function processPayment() {
    const productTotal = calculateProductTotal();
    const result = calculatePayment(productTotal);

    if (!result) {
        alert('支払いできません');
        return;
    }

    // 財布からお金を引く
    for (const [value, count] of Object.entries(result.payment)) {
        wallet[value] -= count;
    }

    // お釣りを財布に追加
    if (result.change > 0) {
        const changeCoins = calculateChangeCoins(result.change);
        for (const [value, count] of Object.entries(changeCoins)) {
            wallet[value] += count;
        }
    }

    // 保存
    saveWalletToStorage();

    // 商品リストをクリア
    products = [];

    // 表示を更新
    updateWalletDisplay();
    updateProductListDisplay();

    // 完了メッセージ
    statusDisplay.classList.remove('can-buy', 'cannot-buy');
    statusDisplay.classList.add('neutral');
    statusIcon.src = 'images/yatta.png';
    statusText.textContent = 'おかいものできた！';
    remainingAmount.textContent = '';

    setTimeout(() => {
        updateStatusDisplay();
    }, 10000);
}

// モーダル制御
function openModal(modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
}

// イベントリスナー

// 財布モーダル
walletBtn.addEventListener('click', () => {
    updateWalletModalDisplay();
    openModal(walletModal);
});

walletModalClose.addEventListener('click', () => {
    closeModal(walletModal);
});

walletModal.addEventListener('click', (e) => {
    if (e.target === walletModal) {
        closeModal(walletModal);
    }
});

// カウンターボタン
document.querySelectorAll('.counter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const money = parseInt(btn.dataset.money);
        const action = btn.dataset.action;
        const input = document.getElementById(`money-${money}`);

        if (action === 'plus') {
            wallet[money]++;
        } else if (action === 'minus' && wallet[money] > 0) {
            wallet[money]--;
        }

        input.value = wallet[money];
        const total = calculateWalletTotal();
        walletModalTotal.textContent = formatMoney(total);
    });
});

walletSaveBtn.addEventListener('click', () => {
    saveWalletToStorage();
    updateWalletDisplay();
    updateStatusDisplay();
    closeModal(walletModal);
});

// 商品追加モーダル
addProductBtn.addEventListener('click', () => {
    priceInput.value = '';
    taxToggle.checked = true;  // 初期状態で税抜きチェックON
    taxResult.textContent = '';
    openModal(productModal);
    setTimeout(() => priceInput.focus(), 100);
});

productModalClose.addEventListener('click', () => {
    closeModal(productModal);
});

productModal.addEventListener('click', (e) => {
    if (e.target === productModal) {
        closeModal(productModal);
    }
});

// 税込み計算
taxToggle.addEventListener('change', () => {
    const price = parseInt(priceInput.value) || 0;
    if (taxToggle.checked && price > 0) {
        const taxIncluded = Math.ceil(price * 1.1);
        taxResult.textContent = `→ ${formatMoney(taxIncluded)}（税こみ）`;
    } else {
        taxResult.textContent = '';
    }
});

priceInput.addEventListener('input', () => {
    if (taxToggle.checked) {
        const price = parseInt(priceInput.value) || 0;
        if (price > 0) {
            const taxIncluded = Math.ceil(price * 1.1);
            taxResult.textContent = `→ ${formatMoney(taxIncluded)}（税こみ）`;
        } else {
            taxResult.textContent = '';
        }
    }
});

productAddBtn.addEventListener('click', () => {
    let price = parseInt(priceInput.value) || 0;

    if (price <= 0) {
        alert('きんがくを入力してください');
        return;
    }

    // 税込み計算
    if (taxToggle.checked) {
        price = Math.ceil(price * 1.1);
    }

    products.push({
        id: ++productIdCounter,
        price: price
    });

    updateProductListDisplay();
    closeModal(productModal);
});

// 商品削除
productList.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        const id = parseInt(deleteBtn.dataset.id);
        products = products.filter(p => p.id !== id);
        updateProductListDisplay();
    }
});

// 支払いボタン
payBtn.addEventListener('click', () => {
    if (confirm('おかねをはらいますか？')) {
        processPayment();
    }
});

// ========== よく買うもの機能 ==========

// ローカルストレージ（お店データ）
function saveStoresToStorage() {
    localStorage.setItem('stores', JSON.stringify(stores));
    localStorage.setItem('storeIdCounter', storeIdCounter.toString());
    localStorage.setItem('itemIdCounter', itemIdCounter.toString());
}

function loadStoresFromStorage() {
    const saved = localStorage.getItem('stores');
    if (saved) {
        stores = JSON.parse(saved);
    }
    const savedStoreId = localStorage.getItem('storeIdCounter');
    if (savedStoreId) {
        storeIdCounter = parseInt(savedStoreId);
    }
    const savedItemId = localStorage.getItem('itemIdCounter');
    if (savedItemId) {
        itemIdCounter = parseInt(savedItemId);
    }
}

// お店リストの表示更新
function updateStoreListDisplay() {
    storeList.innerHTML = '';

    if (stores.length === 0) {
        storeEmpty.style.display = 'block';
    } else {
        storeEmpty.style.display = 'none';
        stores.forEach(store => {
            const div = document.createElement('div');
            div.className = 'store-item';
            div.innerHTML = `
                <span class="store-item-name" data-id="${store.id}">${store.name}</span>
                <div>
                    <span class="store-item-arrow" data-id="${store.id}">→</span>
                    <button class="store-item-delete" data-id="${store.id}">けす</button>
                </div>
            `;
            storeList.appendChild(div);
        });
    }
}

// 商品リストの表示更新（よく買うもの）
function updateFavoriteItemsListDisplay(storeId) {
    const store = stores.find(s => s.id === storeId);
    if (!store) return;

    favoriteItemsTitle.textContent = store.name;
    favoriteItemsList.innerHTML = '';

    if (!store.items || store.items.length === 0) {
        itemsEmpty.style.display = 'block';
    } else {
        itemsEmpty.style.display = 'none';
        store.items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'favorite-item';
            div.innerHTML = `
                <div class="favorite-item-info" data-id="${item.id}">
                    <span class="favorite-item-name">${item.name}</span>
                    <span class="favorite-item-price">${formatMoney(item.price)}</span>
                </div>
                <div>
                    <span class="favorite-item-add" data-id="${item.id}">＋</span>
                    <button class="favorite-item-delete" data-id="${item.id}">けす</button>
                </div>
            `;
            favoriteItemsList.appendChild(div);
        });
    }
}

// よく買うものボタン
favoritesBtn.addEventListener('click', () => {
    updateStoreListDisplay();
    openModal(storeModal);
});

storeModalClose.addEventListener('click', () => {
    closeModal(storeModal);
});

storeModal.addEventListener('click', (e) => {
    if (e.target === storeModal) {
        closeModal(storeModal);
    }
});

// お店をクリック → 商品リストを表示
storeList.addEventListener('click', (e) => {
    const nameEl = e.target.closest('.store-item-name');
    const arrowEl = e.target.closest('.store-item-arrow');
    const deleteBtn = e.target.closest('.store-item-delete');

    if (deleteBtn) {
        const id = parseInt(deleteBtn.dataset.id);
        if (confirm('このおみせをけしますか？')) {
            stores = stores.filter(s => s.id !== id);
            saveStoresToStorage();
            updateStoreListDisplay();
        }
    } else if (nameEl || arrowEl) {
        const id = parseInt((nameEl || arrowEl).dataset.id);
        currentStoreId = id;
        updateFavoriteItemsListDisplay(id);
        closeModal(storeModal);
        openModal(favoriteItemsModal);
    }
});

// お店追加ボタン
addStoreBtn.addEventListener('click', () => {
    storeNameInput.value = '';
    closeModal(storeModal);
    openModal(registerStoreModal);
});

registerStoreModalClose.addEventListener('click', () => {
    closeModal(registerStoreModal);
    openModal(storeModal);
});

registerStoreModal.addEventListener('click', (e) => {
    if (e.target === registerStoreModal) {
        closeModal(registerStoreModal);
        openModal(storeModal);
    }
});

// お店登録
registerStoreBtn.addEventListener('click', () => {
    const name = storeNameInput.value.trim();
    if (!name) {
        alert('おみせのなまえを入力してください');
        return;
    }

    stores.push({
        id: ++storeIdCounter,
        name: name,
        items: []
    });

    saveStoresToStorage();
    closeModal(registerStoreModal);
    updateStoreListDisplay();
    openModal(storeModal);
});

// 商品選択モーダル
favoriteItemsModalClose.addEventListener('click', () => {
    closeModal(favoriteItemsModal);
    openModal(storeModal);
});

favoriteItemsModal.addEventListener('click', (e) => {
    if (e.target === favoriteItemsModal) {
        closeModal(favoriteItemsModal);
        openModal(storeModal);
    }
});

// 商品をクリック → 買い物リストに追加
favoriteItemsList.addEventListener('click', (e) => {
    const infoEl = e.target.closest('.favorite-item-info');
    const addEl = e.target.closest('.favorite-item-add');
    const deleteBtn = e.target.closest('.favorite-item-delete');

    if (deleteBtn) {
        const id = parseInt(deleteBtn.dataset.id);
        if (confirm('このしょうひんをけしますか？')) {
            const store = stores.find(s => s.id === currentStoreId);
            if (store) {
                store.items = store.items.filter(item => item.id !== id);
                saveStoresToStorage();
                updateFavoriteItemsListDisplay(currentStoreId);
            }
        }
    } else if (infoEl || addEl) {
        const id = parseInt((infoEl || addEl).dataset.id);
        const store = stores.find(s => s.id === currentStoreId);
        if (store) {
            const item = store.items.find(i => i.id === id);
            if (item) {
                products.push({
                    id: ++productIdCounter,
                    price: item.price,
                    name: item.name
                });
                updateProductListDisplay();
                closeModal(favoriteItemsModal);
            }
        }
    }
});

// 商品追加ボタン
addFavoriteItemBtn.addEventListener('click', () => {
    itemNameInput.value = '';
    itemPriceInput.value = '';
    itemTaxToggle.checked = true;
    itemTaxResult.textContent = '';
    closeModal(favoriteItemsModal);
    openModal(registerItemModal);
});

// 商品登録の税込み計算
itemTaxToggle.addEventListener('change', () => {
    const price = parseInt(itemPriceInput.value) || 0;
    if (itemTaxToggle.checked && price > 0) {
        const taxIncluded = Math.ceil(price * 1.1);
        itemTaxResult.textContent = `→ ${formatMoney(taxIncluded)}（税こみ）`;
    } else {
        itemTaxResult.textContent = '';
    }
});

itemPriceInput.addEventListener('input', () => {
    if (itemTaxToggle.checked) {
        const price = parseInt(itemPriceInput.value) || 0;
        if (price > 0) {
            const taxIncluded = Math.ceil(price * 1.1);
            itemTaxResult.textContent = `→ ${formatMoney(taxIncluded)}（税こみ）`;
        } else {
            itemTaxResult.textContent = '';
        }
    }
});

registerItemModalClose.addEventListener('click', () => {
    closeModal(registerItemModal);
    openModal(favoriteItemsModal);
});

registerItemModal.addEventListener('click', (e) => {
    if (e.target === registerItemModal) {
        closeModal(registerItemModal);
        openModal(favoriteItemsModal);
    }
});

// 商品登録
registerItemBtn.addEventListener('click', () => {
    const name = itemNameInput.value.trim();
    let price = parseInt(itemPriceInput.value) || 0;

    if (!name) {
        alert('しょうひんのなまえを入力してください');
        return;
    }
    if (price <= 0) {
        alert('ねだんを入力してください');
        return;
    }

    // 税込み計算
    if (itemTaxToggle.checked) {
        price = Math.ceil(price * 1.1);
    }

    const store = stores.find(s => s.id === currentStoreId);
    if (store) {
        store.items.push({
            id: ++itemIdCounter,
            name: name,
            price: price
        });
        saveStoresToStorage();
    }

    closeModal(registerItemModal);
    updateFavoriteItemsListDisplay(currentStoreId);
    openModal(favoriteItemsModal);
});

// 初期化
function init() {
    loadWalletFromStorage();
    loadStoresFromStorage();
    updateWalletDisplay();
    updateProductListDisplay();
}

init();
