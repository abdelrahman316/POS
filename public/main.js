// Data Structures
const global = {
    productsArray: [],
    stock : [],
    cart: [],
    users: [],
    savedCart: [],
    currentUser: "null",
    nextStep: false,
    sid: null,
    // DOM elements
    loginBtn: document.getElementById('loginBtn'),
    loginScreen: document.getElementById('loginScreen'),
    notification: document.getElementById('notification'),
    notificationText: document.getElementById('notificationText'),
    // Will be initialized after login
    appContainer: null,
    productsGrid: null,
    currentUserEl: null,
    cartItems: null,
    emptyCartMessage: null,
    totalEl: null,
    checkoutBtn: null,
    searchInput: null,
    stockIndicator: null,
    refreshBtn: null
};

// actions that are triggered from the server-side
const actions_list = {
    "reload_products": ()=>{
        loadProducts();
    },
    "render_products": ()=>{
        renderProducts();
    },
    "reload_cart": ()=>{
        loadCart();
    },
    "render_cart": ()=>{
        updateCartDisplay();
    },
    // reload and render the stock view ..
    // i know this is not good i have to follow one std
    "render_transactions": ()=>{
        renderTransactionsView();
        setupTransactionFilters();
    },
    "reload_stock": ()=>{
        loadStock();
    },
    "render_stock": ()=>{
        renderStockView();
    },
    "reload_users": ()=>{
        loadUsers();
    },
    "render_users": ()=>{
        renderUsersView();
    },
    "reload_page": ()=>{
        window.location.reload();
    },
    "logout": ()=>{
        logout();
        window.location.reload();
    },
}

// Event system
const secondStepReady = new CustomEvent("secondStepReady");
let awayTimeout;

// UI Functions =============================================================

function updateSecStep() {
    global.nextStep = true;
    document.dispatchEvent(secondStepReady);
}

function reload() {
    window.location.reload();
}

function loginScreenDisplay(display) {
    if (global.loginScreen) {
        global.loginScreen.style.display = display;
    }
}

function appContainerDisplay(display) {
    if (global.appContainer) {
        if (display === "rm") {
            global.appContainer.style.display = "none";
            global.appContainer.remove();
        } else {
            global.appContainer.style.display = display;
        }
    }
}

function showNotification(message, type = 'success') {
    if (!global.notification || !global.notificationText) return;
    
    global.notificationText.textContent = message;
    global.notification.className = 'notification show';
    
    // Reset classes
    global.notification.classList.remove('error', 'warning', 'info');
    if (type === 'error') global.notification.classList.add('error');
    if (type === 'warning') global.notification.classList.add('warning');
    if (type === 'info') global.notification.classList.add('info');
    
    setTimeout(() => {
        global.notification.classList.remove('show');
    }, 3000);
}

function adjustColor(color, amount) {
    if (!color || color.length < 6) return color;
    
    // Remove # if present
    const hex = color.startsWith('#') ? color.slice(1) : color;
    if (hex.length !== 6) return color;
    
    // Parse RGB
    const r = Math.min(255, Math.max(0, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.min(255, Math.max(0, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.min(255, Math.max(0, parseInt(hex.substr(4, 2), 16) + amount));
    
    // Convert back to hex
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// AJAX and connections middleware  =============================================================

// this function sends requests to server, it is not only to make connection easier 
// it also follows and apply a protocol , every request must have some sort of a request one-time-use permission key
// if got a response this means that next time you send a request you must use the new key 
// also the server can trigger some functions here on the clien-side
// you could modify this and use a RSA module/lib integrated with web workers to make all connections and the data secure
// so this func is like a middleware 
function sendToServer(url, callback = console.log , data = {} , async = true) {
    if (!url || typeof url !== 'string') {
        callback({ success: false, message: "Invalid URL" });
        return;
    }

    let payload ;
    if( data instanceof Object ){
        if( global.sid ){
            // payload should have a session id
            data.sid = global.sid ;
        }
        payload = JSON.stringify(data);
    }else{
        throw new Error("@sendToServer: data must be an object");
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, async );
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onload = async function() {
        try {
            const res = JSON.parse(xhr.responseText);
            
            // update session id
            if (res.sid) {
                global.sid = res.sid;
                delete res.sid;
            }
            
            // run callback (sync or async)
            const callbackResult = callback(res);
            
            // wait ONLY if it's a "Promise"
            if (callbackResult instanceof Promise) {
                await callbackResult.catch(e => console.error("Callback error:", e));
            }
            
            // run "actions" triggered from the server-side AFTER callback completes
            if (Array.isArray(res.actions)) {
                res.actions.forEach(act => {
                    try {
                        const actionResult = actions_list[act](); // Safe optional chaining
                    } catch (err) {
                        console.error(`Action '${act}' failed:`, err);
                    }
                });
            }
        } catch (err) {
            console.error("Response processing failed:", err);
        }
    };
    
    xhr.onerror = function() {
        callback({ success: false, message: "Network request failed" });
    };

    // set timeout to prevent hanging requests
    xhr.timeout = 10 * 1000 ; // 10 seconds
    xhr.ontimeout = () => callback({success: false, message: "Request timeout"});

    xhr.send(payload);
}

// Auth Functions =============================================================

function showNormalLogin() {
    loginScreenDisplay("block");
    showNotification("Please sign in");
    setupLoginButton();
}

function setupLoginButton() {
    if (!global.loginBtn._listenerAttached) {
        global.loginBtn.addEventListener('click', handleManualLogin);
        global.loginBtn._listenerAttached = true;
    }
}

function handleManualLogin() {
    const username = document.getElementById('username').value.trim();
    const password = sha256(document.getElementById('password').value);
    
    if (!username || !password) {
        showNotification('Both username and password are required', 'error');
        return;
    }
    
    sendToServer("/login", handleLoginResponse, { username, password } );
}

function handleLoginResponse(response) {
    if (!response || !response.success) {
        showNotification(response?.message || 'Login failed', 'error');
        return false;
    }
    
    // Successful login
    initializeAppUI(response);
    showNotification(`Hi ${global.currentUser} 😊 `);
}

function attemptAutoLogin() {
    const sid = global.sid;
    if (!sid) {
        showNormalLogin();
        return false;
    }
    
    sendToServer("/login", (response) => {
        if (!response || !response.success) {
            global.sid = null;
            showNormalLogin();
        } else {
            initializeAppUI(response);
        }
    }, { sid: sid } );
}

// init ui after login
function initializeAppUI(response) {
    // parse and inject app HTML
    const parser = new DOMParser();
    const appDoc = parser.parseFromString(response.appContainerHTML, "text/html");
    const appContainer = appDoc.body.firstElementChild;
    document.body.appendChild(appContainer);
    
    // init global references
    global.appContainer = document.getElementById("appContainer");
    global.productsGrid = document.getElementById('productsGrid');
    global.currentUserEl = document.getElementById('currentUser');
    global.cartItems = document.getElementById('cartItems');
    global.emptyCartMessage = document.getElementById('emptyCartMessage');
    global.totalEl = document.getElementById('total');
    global.checkoutBtn = document.getElementById('checkoutBtn');
    global.searchInput = document.getElementById('searchInput');
    global.stockIndicator = document.getElementById('stockIndicator');
    global.refreshBtn = document.getElementById('refreshBtn');
    
    // set user info (just the name)
    global.currentUser = response.user.username;
    global.currentUserEl.textContent = global.currentUser;
    
    // update UI
    loginScreenDisplay("none");
    appContainerDisplay("block");
    
    // load products data and initialize app
    // ( if it is a page reload the cart is loaded if exists )
    loadProducts();
    renderProducts();
    updateSecStep();
}

// logging out 
function logout() {
    sendToServer("/logout", (response) => {
        if (response.success) {
            // Reset UI and state
            appContainerDisplay('rm');
            showNormalLogin();
            resetGlobalData();
            document.getElementById("appContainer").outerHTML = "";
            showNotification("Logged out successfully");
        } else {
            showNotification("Logout failed", "error");
        }
    });
}

function resetGlobalData() {
    global.nextStep = false;
    global.productsArray = [];
    global.cart = [];
    global.savedCart = [];
    global.currentUser = null;
    global.sid = null;
}

// Product/s Functions ===================================================

function loadProducts(){
    sendToServer("/products", (response) => {
        if (!response.success || !Array.isArray(response.products)) {
            showNotification(response?.message || "Failed to load products", "error");
            return false;
        }
        
        global.productsArray = response.products; 
    });
}

function renderNewProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const stockStatus = product.stock > 5 ? `In Stock: ${product.stock}` : `Low Stock: ${product.stock}`;
    const stockClass = product.stock > 5 ? 'product-stock' : 'product-stock out-of-stock';

    card.innerHTML = `
        <!--
        <div class="product-badge">Premium</div>
        -->
        <div class="product-tilt-effect">
            <div class="product-image" style="background: linear-gradient(45deg, ${product.color}, ${adjustColor(product.color, 20)});">
                <img src="${product.imgurl}">
            </div>
            
        </div>
        <div class="product-info">
            <div class="product-category text-muted small">${product.category}</div>
            <h2 class="product-title">${product.name}</h2>
            <div class="product-bottom">
                <div class="product-price">
                    <!--
                    <span class="price-was">$${product.price.toFixed(2)}</span>
                    -->
                    <span class="price-now">$${product.price.toFixed(2)}</span>
                </div>
                <button class="product-button" data-id="${product.id}">
                    <span class="button-text">Add</span>
                </button>
            </div>
            <div class="product-meta">
                <div class="${stockClass}">${stockStatus}</div>
                <div class="text-muted small">#${product.batch}</div> 
            </div>
        </div>
    `;
    
    return card;
}

function renderProducts() {
    if (!global.productsGrid){
        return false;
    }

    global.productsGrid.innerHTML = '';
    
    if (global.productsArray.length === 0) {
        global.productsGrid.innerHTML = '<div class="text-center py-5">No products available</div>';
        return;
    }
    
    const searchTerm = global.searchInput.value.toLowerCase();
    
    global.productsArray
        .filter(product => 
            product.stock > 0 &&
            (!searchTerm || 
             String(product.id).includes(searchTerm) ||
             product.name.toLowerCase().includes(searchTerm) ||
             product.category.toLowerCase().includes(searchTerm) ||
             product.batch.toLowerCase().includes(searchTerm))
        )
        .forEach(product => {
            global.productsGrid.appendChild(renderNewProductCard(product));
        });

    
    // Category tabs below the products search bar

    // the "all" products category tab btn first
    let category_tabs = document.querySelector(".category-tabs"); // tabs parent div
    category_tabs.innerHTML = ''; // empty old tabs if any
    let ctab = document.createElement("button");
    ctab.classList.add("category-tab");
    ctab.dataset.category = "all" ;
    ctab.textContent = "All Products" ;
    ctab.addEventListener('click', () => {
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        ctab.classList.add('active');
        global.searchInput.value = "";
        renderProducts();
    });
    category_tabs.appendChild(ctab);

    // the catgeories
    let cats = [...new Set( global.productsArray.map(prod=>prod.category) )];
    cats.forEach( cat =>{
        let ctab = document.createElement("button");
        ctab.classList.add("category-tab");
        ctab.dataset.category = cat ;
        ctab.textContent = cat ;

        ctab.addEventListener('click', () => {
            document.querySelectorAll('.category-tab').forEach(t => 
                t.classList.remove('active')
            );
            ctab.classList.add('active');
            global.searchInput.value = ctab.textContent;
            renderProducts();
        });
        category_tabs.appendChild(ctab);
    });
}

// Cart Functions ===================================================

function loadCart() {
    sendToServer("/load_cart", response=>{
        if( !response.success ){
            showNotification( response.message || "Could not load cart" , 'error');
            return false;
        }
        if( Object(response).hasOwnProperty("cart") ){
            global.cart = [...response.cart];
        }
    });
}

// add or remove a product
// update product quantity by -1 or +1 
function updateCart( product_id, action ){

    let valid_actions = ["add_product" , "reduce_quantity", "remove_product"] ;

    if( !valid_actions.includes(action) ){
        console.error("the \"action\" arg is not valid , must be one of " , valid_actions );
        return false;
    }

    // 'update_cart_item' can do it all
    sendToServer("/update_cart_item", 
        response=>{
            if( !response ){
                showNotification('Could not update product , Internal Error', 'error');
                return false;
            }
            if( !response.success ){
                showNotification( response.message , 'error');
                return false;
            }
            if( Object(response).hasOwnProperty("cart") ){
                global.cart = [...response.cart];
                showNotification("product cart updated")
            }
        }
    ,{ product_id : product_id, action : action });
}

function updateCartDisplay() {
    if (!global.cartItems ){
        return false;
    };
    
    let total = 0.0 ;
    global.cartItems.innerHTML = '';
    
    if (global.cart.length === 0) {
        global.emptyCartMessage.style.display = "block";
        global.totalEl.textContent = '$0.00';
        global.checkoutBtn.disabled = true;
        return;
    }

    global.emptyCartMessage.style.display = "none";
    
    global.cart.forEach(item => {
        total += item.price * item.quantity;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="item-img" >
                <img src="${item.imgurl}">
            </div>
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-price">$${item.price.toFixed(2)}</div>
            </div>
            <div class="item-actions">
                <div class="quantity-control">
                    <button class="quantity-btn minus" data-id="${item.id}">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn plus" data-id="${item.id}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="remove-btn" data-id="${item.id}">
                    <i class="fas fa-trash"></i>
                </div>
            </div>
        `;
        global.cartItems.appendChild(cartItem);
    });
    
    global.totalEl.textContent = `$${total.toFixed(2)}`;
    global.checkoutBtn.disabled = false;
    
    // Attach event listeners to new cart items
    global.cartItems.querySelectorAll('.quantity-btn.plus').forEach(btn => {
        btn.addEventListener('click', () => updateCart(parseInt(btn.dataset.id), "add_product" ));
    });
    
    global.cartItems.querySelectorAll('.quantity-btn.minus').forEach(btn => {
        btn.addEventListener('click', () => updateCart( parseInt(btn.dataset.id), "reduce_quantity" ));
    });
    
    global.cartItems.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => updateCart( parseInt(btn.dataset.id), "remove_product" ) );
    });
}

function checkout(){
    sendToServer("/checkout", (response) => {
        if (response.success){
            // Reset cart
            global.cart = [];
            showNotification('Purchase completed!');
        } else {
            global.cart = [];
            showNotification(response.message || 'Checkout failed', 'error');
        }
    });
}


// Sub Window Functions ======================================================


// to toggle tab views in the sub window modal
function showupView( dataTabContent ){
    for( let ele of document.querySelectorAll(".modal-body [data-tab-content]") ){
        if( ele.dataset.tabContent != dataTabContent ){
            ele.classList.replace("showup", "hide");
        }else{
            ele.classList.replace("hide" , "showup");
        }
    }
    document.querySelector(`.modal-body [data-tab-content=\"${dataTabContent}\"] .empty-state`).classList.remove("showup");
}
function hideView( dataTabContent ){
    for( let ele of document.querySelectorAll(".modal-body [data-tab-content]") ){
        if( ele.dataset.tabContent != dataTabContent ){
            ele.classList.replace("showup", "hide");
        }else{
            ele.classList.replace("hide" , "showup");
        }
    }
    document.querySelector(`.modal-body [data-tab-content=\"${dataTabContent}\"] .empty-state`).classList.add("showup");
}

// Transactions Handling Functions ======================================================

// non-admin users are allowed see their own transactions history
// load transactions from the server and then render the transactions view 
function loadTransactions() {
    sendToServer('/transactions', (response) => {
        console.log(response)
        if (response.success && Array.isArray(response.transactions)) {
            global.transactions = [...response.transactions];
        } else {
            showNotification(response.message||"could not load transactions", "error");
            global.transactions = [];
        }
        return false;
    });
}

// after loading transactions , render the view
function renderTransactionsView(transactionsToRender = null) {
    const transactions = transactionsToRender || global.transactions;
    
    if (!Array.isArray(transactions) || transactions.length < 1) {
        console.log("transactions not loaded or empty");
        hideView("transactions");
        return false;
    } else {
        showupView("transactions");
    }

    const tbody = document.getElementById("transactionsList");
    if (!tbody) {
        showNotification("no Element called \"transactionsList\" to load trans to !!", "error");
        return;
    }
    
    tbody.innerHTML = "";
    
    transactions.forEach(tx => {
        const row = document.createElement('tr');
        const txDate = new Date(tx.timestamp);
        
        row.innerHTML = `
            <td class="transaction-id">#${tx.id}</td>
            <td class="transaction-date">${txDate.toLocaleString()}</td>
            <td>
                <div class="transaction-user">
                    <span>${tx.username || 'Unknown'}</span>
                </div>
            </td>
            <td>
                <div class="transaction-items">
                    ${tx.items.map(item => `
                        <div class="transaction-item">
                            <span>${item.quantity} x ${item.name}</span>
                            <span>$${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </td>
            <td class="transaction-total">$${tx.total.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });

}

// add events listeners to the transactions filtering buttons
function setupTransactionFilters() {
    const dateFilter = document.getElementById('dateFilter');
    const sortFilter = document.getElementById('sortFilter');
    const userFilter = document.getElementById('userFilter');
    
    if (!dateFilter || !sortFilter || !userFilter) return;
    
    // only populate if we have transactions
    if (Array.isArray(global.transactions) ) {
        // Get unique usernames (excluding undefined/null)
        const users = [...new Set(global.transactions
            .map(tx => tx.username)
            .filter(name => !!name)
        )];
        
        // clear existing options (keep "All" option)
        while (userFilter.options.length > 1) {
            userFilter.remove(1);
        }
        
        // add user options (alphabetically sorted)
        users.sort().forEach(user => {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            userFilter.appendChild(option);
        });
    }
    
    // aeset event listeners to prevent duplicates ( causes errors )
    dateFilter.replaceWith(dateFilter.cloneNode(true));
    sortFilter.replaceWith(sortFilter.cloneNode(true));
    userFilter.replaceWith(userFilter.cloneNode(true));
    
    // Get fresh references after clone
    const newDateFilter = document.getElementById('dateFilter');
    const newSortFilter = document.getElementById('sortFilter');
    const newUserFilter = document.getElementById('userFilter');
    
    // add event listeners
    newDateFilter.addEventListener('change', filterTransactions);
    newSortFilter.addEventListener('change', filterTransactions);
    newUserFilter.addEventListener('change', filterTransactions);
}

// apply transactions filters
function filterTransactions() {
    const dateFilter = document.getElementById("dateFilter")?.value || 'all';
    const sortFilter = document.getElementById("sortFilter")?.value || 'recent';
    const userFilter = document.getElementById("userFilter")?.value || 'all';
    
    if (!Array.isArray(global.transactions)) return;
    
    let filtered = [...global.transactions];
    const now = new Date();
    
    // Date filtering with proper date comparison
    if (dateFilter === 'today') {
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        filtered = filtered.filter(tx => 
            new Date(tx.timestamp) >= todayStart
        );
    } else if (dateFilter === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        filtered = filtered.filter(tx => 
            new Date(tx.timestamp) >= startOfWeek
        );
    } else if (dateFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter(tx => 
            new Date(tx.timestamp) >= startOfMonth
        );
    }
    
    // User filtering
    if (userFilter !== 'all') {
        filtered = filtered.filter(tx => tx.username === userFilter);
    }
    
    // Sorting
    if (sortFilter === 'recent') {
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (sortFilter === 'oldest') {
        filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else if (sortFilter === 'high') {
        filtered.sort((a, b) => b.total - a.total);
    } else if (sortFilter === 'low') {
        filtered.sort((a, b) => a.total - b.total);
    }
    
    // Render filtered results
    renderTransactionsView(filtered);

    // Update empty state
    const emptyEl = document.getElementById("emptyTransactions");
    if (emptyEl) {
        emptyEl.style.display = filtered.length ? "none" : "block";
    }
}

// Stock Handling Functions =============================================================

// nothing allowed here for non-admin users
// load the stock products data and then render the view
function loadStock(){
    sendToServer('/stock', (response) => {
        if(response){
            global.stock = [];
            if(response.success){
                global.stock = [...response.products];
            }else{
                showNotification(response.message, "error")
            }
        }else{
            showNotification( "Internal error", "error")
            global.stock = [];
        }
    });
}

function renderStockView(){
    hideView("stock");
    if( !Array.isArray(global.stock) || global.stock.length < 1 ){
        showNotification("Stock is empty", "warning");
        return false;
    }else{
        showupView("stock")
    }
    
    // complete the existing table id="stockTable"
    let InvalidCharsRegx = (/[\$\#\@\!\%\^\&\*\(\)\+\=\'\"\\\;\:\,\/\`\~\<\>\?\[\]\{\}]/ig) ;
    let stockTab = document.querySelector("[data-tab-content=\"stock\"]");
    let stockTable = document.getElementById("stockTable");
    let stockProductsList = stockTable.children[1]; // id='stockProductsList'
    stockProductsList.innerHTML = ""; // remove the existing products

    let searchTerm = stockTab.querySelector("#stockSearch").value.trim().toLowerCase();
    document.querySelector("#stockSearch").addEventListener('input', renderStockView );
    
    let row;
    global.stock.reverse()
        .filter(prod => 
            (!searchTerm || 
             String(prod.id).includes(searchTerm) ||
             prod.name.toLowerCase().includes(searchTerm) ||
             prod.category.toLowerCase().includes(searchTerm) ||
             prod.batch.toLowerCase().includes(searchTerm))
        )
        .forEach(prod => {
        row = document.createElement('tr');        
        row.innerHTML = `
            <td data-editable=\"false\" class="stock-product-id">
                <span data-content-key=\"id\" data-content-value=\"${prod.id}\">#${prod.id}</span>
            </td>
            <td data-editable=\"true\" class="stock-product-name">
                <span data-content-key=\"name\" data-content-value=\"${prod.name}\">${prod.name}</span>
            </td>
            <td data-editable=\"true\" class="stock-product-batch">
                <span data-content-key=\"batch\" data-content-value=\"${prod.batch}\">${prod.batch}</span>
            </td>
            <td data-editable=\"true\" class="stock-product-category">
                <span data-content-key=\"category\" data-content-value=\"${prod.category}\">${prod.category}</span>
            </td>
            <td data-editable=\"true\" class="stock-product-price">
                <span data-content-key=\"price\" data-content-value=\"${prod.price}\">$${prod.price}</span>
            </td>
            <td data-editable=\"true\" class="stock-product-stock">
                <span data-content-key=\"stock\" data-content-value=\"${prod.stock}\">${prod.stock}</span>
            </td>
            <td data-editable=\"false\" class="stock-product-date">
                <span data-content-key=\"timestamp\" data-content-value=\"${prod.timestamp}\">${new Intl.DateTimeFormat('en-UK', {year : "numeric", month : "numeric", day : "numeric", hour:"numeric", minute:"numeric"}).format(new Date(prod.timestamp))}</span>
            </td>
            <td data-editable=\"true\" class="stock-product-img">
                <img data-content-key=\"imgurl\" data-content-value=\"${prod.imgurl}\" src="${prod.imgurl}" alt="product image">
            </td>
            <td data-editable=\"false\" class="remove-btn-td">
                <i data-removeProductBtn=\"true\" data-productId=\"${prod.id}\" class="fas fa-trash remove-btn">
            </td>
        `;
        
        // make rows magicaly editable
        let ele , tmpele, tmpval, oldSet, inputon = false;
        row.addEventListener( "dblclick", (e)=>{

            if(inputon === true){
                showNotification("Complete the current one first", "error")
                return false;
            }

            // on clicking the remove btn
            if( e.target.dataset.removeproductbtn == "true" ){
                console.log( e.target.parentElement.parentElement );
                tmpval = e.target.dataset.productid ;
                e.target.parentElement.parentElement.outerHTML = '';
                UpdateStock.RemoveOneProduct( tmpval );
                return true;
            }

            if( e.target.dataset.editable == "true"){
                ele = e.target ;
                inputon = true;
            }else if( e.target.parentElement.dataset ){
                if( e.target.parentElement.dataset.editable == 'true' ){
                    ele = e.target.parentElement ;
                    inputon = true;
                }
            }
            
            if( ele && inputon == true ){
                oldSet = ele.children[0].dataset ;
                let originalElement = ele.children[0];  // Save original element

                if(ele.className.includes("img")){
                    tmpval = `${originalElement.src}`;
                    tmpval = tmpval.trim();
                    tmpele = document.createElement("input");
                    tmpele.type = "url";
                    tmpele.className = "tmp-input";
                    tmpele.placeholder = "image url...";
                    tmpele.value = `${tmpval.trim()}`
                    originalElement.remove();
                    ele.appendChild(tmpele);
                }else{
                    tmpval = `${originalElement.innerText}`;
                    tmpval = tmpval.replaceAll(InvalidCharsRegx, '');
                    tmpele = document.createElement("input");
                    tmpele.type = "text";
                    tmpele.className = "tmp-input";
                    tmpele.placeholder = "new value...";
                    tmpele.value = `${tmpval.replaceAll(InvalidCharsRegx, "")}`;
                    originalElement.remove();
                    ele.appendChild(tmpele);
                }

                tmpele.focus();

                // Add blur handler to reset state
                tmpele.addEventListener('blur', function onBlur() {
                    if(inputon) {
                        tmpele.remove();
                        ele.appendChild(originalElement);
                        inputon = false;
                    }
                });

                ele.addEventListener("keypress", (e)=>{
                    if(e.key == "Enter" && inputon == true ){
                        if( !ele.children[0].value ){
                            showNotification("type a value plz !", "error")
                            return false;
                        }

                        if(ele.className.includes("img")){
                            tmpval = ele.children[0].value ;
                            tmpval = tmpval.trim();
                            tmpele = document.createElement("img");
                            tmpele.dataset.contentKey = oldSet.contentKey;
                            tmpele.dataset.contentValue = tmpval;
                            tmpele.src = tmpval;
                            tmpele.alt = "product image";
                            ele.children[0].remove();
                            ele.appendChild(tmpele);
                        }else{
                            tmpval = ele.children[0].value ;
                            tmpval = tmpval.replaceAll(InvalidCharsRegx, '');
                            tmpele = document.createElement("span");
                            tmpele.dataset.contentKey = oldSet.contentKey;
                            tmpele.dataset.contentValue = tmpval;
                            tmpele.innerText = tmpval;
                            ele.children[0].remove();
                            ele.appendChild(tmpele);
                        }

                        let idtr = [...ele.parentElement.children].find( ele => ele.children[0].dataset.contentKey == "id" );
                        let productId = idtr.children[0].dataset.contentValue ;
                        let newData = {
                            productId : productId ,
                            key : ele.children[0].dataset.contentKey,
                            value : tmpval ,
                        }
                        
                        // a function to update the real stock for both fronend & backend
                        // update this one product ( set the new key-value pair everywhere )
                        UpdateStock.UpdateOneProduct( newData );
                        inputon = false;
                    }
                })
            }
        });

        stockProductsList.appendChild(row);
    });
    
}

// handles the "add new product form" save btn
function addNewProduct(){
    let form = document.getElementById("addNewProductForm");
    if( !form.style.display ){
        return false;
    }

    let InvalidCharsRegx = (/[\$\#\@\!\%\^\&\*\(\)\+\=\'\"\\\;\:\,\/\`\~\<\>\?\[\]\{\}]/ig) ;
    let inputsGrid = form.querySelector(".inputsGrid");
    let inputs = inputsGrid.querySelectorAll("input") ;

    let productValue = {
        name : "" ,
        batch : "",
        category : "",
        price : "",
        stock : "",
        imgurl : ""
    }

    for(let input of inputs ){
        if( !input.value ){
            showNotification("Illigal Action", "error");
            return false ;
        }else{
            input.dataset.contentValue = input.value.replaceAll(InvalidCharsRegx, '');
            productValue[`${input.dataset.contentKey}`] = input.value.replaceAll(InvalidCharsRegx, '');
        }
    }

    // clear the values of the ui !!?
    for(let input of inputs ){
        input.dataset.contentValue = input.value = '';
    }
    
    UpdateStock.AddOneProduct( productValue );
    form.style.display = "none";
    return true;
}

const UpdateStock = {
    UpdateOneProduct : function( newData ){
        const action_name = "UpdateOneProduct" ; // bcz the backend use this too

        if( ! global.stock ){
            showNotification("Empty Stock WTF!!", "error" );
            return false;
        }

        if( newData.productId && newData.key && newData.value ){
            // get the backend to update the database and then refresh
            sendToServer("/update_stock", response=>{
                if(response.success){
                    showNotification("Updated");
                }else{
                    showNotification("Not Updated!", "error");
                }
            }, { action : action_name , data : newData });
        }else{
            showNotification("Bad arguments: @ UpdateOneProduct()", "error")
            return false;
        }

    },
    AddOneProduct : function( productData ){
        console.log(productData)
        const action_name = "AddOneProduct";

        if( ! global.stock ){
            showNotification("Empty Stock WTF!!", "error" );
            return false;
        }

        if( productData.hasOwnProperty("name") &&
            productData.hasOwnProperty("batch") &&
            productData.hasOwnProperty("category") &&
            productData.hasOwnProperty("price") &&
            productData.hasOwnProperty("stock") &&
            productData.hasOwnProperty("imgurl") ){
            // get the backend to update the database and then refresh
            sendToServer("/update_stock", response=>{
                if(response.success){
                    showNotification("Added");
                }else{
                    showNotification("Not Added !", "error");
                }
            }, { action : action_name , data : productData })
        }else{
            showNotification("Bad arguments: @ AddOneProduct()", "error")
            console.log( productData )
            return false;
        }

    },
    RemoveOneProduct : function( productId ){
        const action_name = "RemoveOneProduct";
        
        sendToServer("/update_stock" , response=>{
            console.log(response)
            if(response.success){
                showNotification("Removed Success");
            }else{
                showNotification("Did not removed!", "error");
            }
        }, { action : action_name , data : productId });
    }
};

// Users ==============================================================

function loadUsers(){
    global.users = [] ;
    sendToServer("/users", (response)=>{
        console.log( response )
        if( response && response.users ){
            global.users = [...response.users];
        }else{
            showNotification("Could not get users !", "error");
        }
    });
}

function renderUsersView(){
    hideView("users");
    if( !Array.isArray(global.users) ){
        showNotification("No users found", "warning")
        return false;
    }else{
        showupView("users")
    }

    let InvalidCharsRegx = (/[\$\#\@\!\%\^\&\*\(\)\+\=\'\"\\\;\:\,\/\`\~\<\>\?\[\]\{\}]/ig) ;
    let usersTab = document.querySelector("[data-tab-content=\"users\"]");
    let usersList = usersTab.querySelector("#usersList");
    
    // add new user & change password
    let usersControlsFormsWin = usersTab.querySelector("#usersControlsForms");
    let addNewUserBtn = usersTab.querySelector("[data-act=\"addNewUserBtn\"]");
    let changePasswordBtn = usersTab.querySelector("[data-act=\"changePass\"]");
    let addNewUserForm = usersTab.querySelector("#addNewUserForm");
    let changePasswordForm = usersTab.querySelector("#changePasswordForm");

    addNewUserBtn.addEventListener("click", ()=>{
        usersControlsFormsWin.classList.replace("hide", "showup");
        addNewUserForm.classList.replace("hide", "showup");
        addNewUserForm.querySelector(".save-btn").addEventListener("click", ()=>{
            addNewUser();
            usersControlsFormsWin.classList.replace("showup", "hide");
        });
        addNewUserForm.querySelector(".cancel-btn").addEventListener("click", ()=>{
            addNewUserForm.classList.replace("showup", "hide");
            usersControlsFormsWin.classList.replace("showup", "hide");
        });
    });
    
    changePasswordBtn.addEventListener("click", ()=>{
        usersControlsFormsWin.classList.replace("hide", "showup");
        changePasswordForm.classList.replace("hide", "showup");
        changePasswordForm.querySelector(".save-btn").addEventListener("click", ()=>{
            changePassword();
            usersControlsFormsWin.classList.replace("showup", "hide");
        });
        changePasswordForm.querySelector(".cancel-btn").addEventListener("click", ()=>{
            changePasswordForm.classList.replace("showup", "hide");
            usersControlsFormsWin.classList.replace("showup", "hide");
        });
    });
    
    usersControlsFormsWin.addEventListener("click", (e)=>{
        if(e.target == usersControlsFormsWin ){
            addNewUserForm.classList.replace("showup", "hide");
            changePasswordForm.classList.replace("showup", "hide");
            usersControlsFormsWin.classList.replace("showup", "hide");
        }
    })

    // table & rows functionalities 
    let row ;
    usersList.innerHTML = '';
    global.users.forEach( usr => {
        row = document.createElement("tr");

        row.innerHTML =`
            <td data-editable=\"false\" class="user-id">
                <strong data-content-key=\"id\" data-content-value=\"${usr.id}\">#${usr.id}</strong>
            </td>
            <td data-editable=\"false\" class="user-name">
                <strong data-content-key=\"username\" data-content-value=\"${usr.username}\">${usr.username}</strong>
            </td>
            <td data-editable=\"false\" class="user-role">
                <strong data-content-key=\"role\" data-content-value=\"${usr.role}\">${usr.role}</strong>
            </td>
            <td data-editable=\"false\" class="user-status ${usr.status == true ? "live" : "notlive" }">
                <strong data-content-key=\"status\" data-content-value=\"${usr.status}\">${usr.status}</strong>
            </td>
            </td>
            <td data-editable=\"false\">
                <i class="fa-solid fa-trash remove-btn"></i>
            </td>
        `

        usersList.appendChild( row )
    });

    // active the remove user btns

    let rmBtnsList = usersList.querySelectorAll(".remove-btn");

    let btn, userId ;
    for( btn of rmBtnsList ){
        btn.addEventListener("click", (e)=>{
            userId = e.target.parentElement.parentElement.querySelector("[data-content-key=\"id\"]").dataset.contentValue ;
            removeUser( userId );
        });
    }


}

function addNewUser(){
    let form = document.querySelector("#addNewUserForm");
    let InvalidCharsRegx = (/[\$\#\@\!\%\^\&\*\(\)\+\=\'\"\\\;\:\,\/\`\~\<\>\?\[\]\{\}]/ig) ;
    let inputsGrid = form.querySelector(".inputsGrid");
    let inputs = inputsGrid.querySelectorAll("input") ; // just tow inputs

    let userData = {
        username : "" ,
        role : "",
    }

    for(let input of inputs ){
        if( !input.value ){
            showNotification("Illigal Action", "error");
            return false ;
        }else{
            userData[`${input.dataset.contentKey}`] = input.value.replaceAll(InvalidCharsRegx, '');
        }
    }

    // clear the values of the ui !!?
    for(let input of inputs ){
        input.value = '';
    }
    
    UpdateUsers.AddNewUser( userData );
    form.style.display = "none";
    return true;
}

// the only function allowed for non-admin users along with it partener in the UpdateUsers{} 
function changePassword(){
    let form = document.querySelector("#changePasswordForm");
    let InvalidCharsRegx = (/[\$\#\@\!\%\^\&\*\(\)\+\=\'\"\\\;\:\,\/\`\~\<\>\?\[\]\{\}]/ig) ;
    let inputsGrid = form.querySelector(".inputsGrid");
    let inputs = inputsGrid.querySelectorAll("input") ; // just tow inputs

    let data = {
        oldPassword : "" ,
        newPassword : "",
    }

    for(let input of inputs ){
        if( !input.value ){
            showNotification("Illigal Action", "error");
            return false ;
        }else{
            data[`${input.dataset.contentKey}`] = input.value.replaceAll(InvalidCharsRegx, '');
        }
    }

    data.oldPassword = sha256(data.oldPassword);
    data.newPassword = sha256(data.newPassword);

    // clear the values of the ui !!?
    for(let input of inputs ){
        input.value = '';
    }
    
    UpdateUsers.ChangePassword( data );
    form.style.display = "none";
    return true;
}

function removeUser( userId ) {
    if( global.users.find( usr => usr.id == userId) ){
        UpdateUsers.RemoveUser(userId);
        return true;
    }else{
        showNotification("Could not remove user !!", "error");
        return false;
    }
}

const UpdateUsers = {
    AddNewUser : function( data ){
        const action_name = "AddNewUser" ; // bcz the backend use this too
        if( data.hasOwnProperty("username") && data.hasOwnProperty("role") ){
            // get the backend to update the database and then refresh
            sendToServer("/update_users" , response=>{
                if(response.success){
                    showNotification("New User Added");
                }else{
                    showNotification("Not Added!", "error");
                    console.log( response );
                }
            }, { action : action_name , data : data });
        }else{
            showNotification("Bad arguments: @ AddNewUser()", "error")
            return false;
        }

    },
    ChangePassword : function( data ){
        if( data.hasOwnProperty("oldPassword") && data.hasOwnProperty("newPassword")){
            sendToServer("/change_user_password" , response=>{
                if(response.success){
                    showNotification("Changed");
                }else{
                    showNotification("Did not change !", "error");
                    console.log( response );
                }
            }, { data : data })
        }else{
            showNotification("Bad arguments: @ ChangePassword()", "error")
            return false;
        }

    },
    RemoveUser : function( userId ){
        const action_name = "RemoveUser";
        sendToServer("/update_users" , response=>{
            if(response.success){
                showNotification("Removed Success");
            }else{
                showNotification("Did not removed!", "error");
                console.log( response );
            }
        }, { action : action_name , data : userId });
    }
};

// Global Event Handlers =============================================================
function setupSecondStepEvents() {
    // Add to cart delegation
    global.productsGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.product-button');
        if (btn) updateCart(parseInt(btn.dataset.id), "add_product");
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Checkout
    global.checkoutBtn.addEventListener('click', checkout);
    
    // Refresh products
    global.refreshBtn.addEventListener('click', () => {
        loadProducts();
        renderProducts();
        showNotification("Products refreshed");
    });
    
    // Search
    global.searchInput.addEventListener('input', renderProducts);

    // Settings/Transactions button
    document.getElementById("settingsBtn").addEventListener('click', runSubWindow );
    
    // Modal handlers
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById("subWindow")) {
            document.getElementById("subWindow").style.display = 'none';
            loadProducts();
        }
    });

    
    // Modal stock inputs handling
    if( document.querySelector("#stockSearch") ){
        document.querySelector("#stockSearch").addEventListener('input', renderStockView);

        let addNewProductBtn = document.querySelector("[data-act=\"addNewProductBtn\"]");
        addNewProductBtn.addEventListener("click", (e)=>{
            document.getElementById("addNewProductForm").style.display = 'block';  
        })
        
        document.querySelector('#addNewProductForm .saveOrClose .save-btn').addEventListener('click', () => {
            addNewProduct(); // it will take care of it all
        });

        document.querySelector('#addNewProductForm .saveOrClose .cancel-btn').addEventListener('click', () => {
            document.getElementById("addNewProductForm").style.display = 'none';
        });
    }

}

function runSubWindow() {
    const tables_names_actions = [
        // the transaction view is the default and the only view availble for non-admin users
        { name : "transactions" , action : ()=>{loadTransactions();} },
        { name : "stock" , action : ()=>{loadStock();} },
        { name : "users" , action : ()=>{loadUsers();} },
    ];

    // also here i need to apply users and admins
    const tabsBtns = document.getElementsByClassName("tab-btn");
    const subWindow = document.getElementById("subWindow");
    
    if (!subWindow ) return false;
    else subWindow.style.display = 'block';

    // add "click" event listners for the views btns ( trans view is the defualt )
    // more then one btn means user role is "admin" and can toggle diferent views
    // if only one input , means non-admin user and this btn is to change password
    if( tabsBtns.length > 1 ){
        for (let i = 0; i < tabsBtns.length; i++) {
            tabsBtns[i].addEventListener("click", (e)=>{
                // deactivate all tabs btns
                for (let x = 0; x < tabsBtns.length; x++){
                    tabsBtns[x].classList.remove("active");
                }

                // activate this btn
                e.target.classList.add("active");

                // toggle different tables views
                let action = tables_names_actions.find( tx => tx.name == [e.target.dataset.tab] );
                action ? action.action() : console.log("undefined action") ;
            });
        }
        tables_names_actions[0].action(); // as a defualt view
        for (let x = 0; x < tabsBtns.length; x++) tabsBtns[x].classList.remove("active");
        tabsBtns[0].classList.add("active")
    }else{
        tables_names_actions[0].action(); // as a defualt view and only one
        // a non-admin user has a btn to change they password
        tabsBtns[0].addEventListener("click", (e)=>{
            // change password
            let usersControlsFormsWin = document.querySelector("#usersControlsForms");
            let changePasswordForm = document.querySelector("#changePasswordForm");

            if( e.target.dataset.act == "changePass" ){
                // toggle floating view with inputs
                usersControlsFormsWin.classList.replace("hide", "showup");
                changePasswordForm.classList.replace("hide", "showup");

                // save changes
                changePasswordForm.querySelector(".save-btn").addEventListener("click", ()=>{
                    changePassword();
                    usersControlsFormsWin.classList.replace("showup", "hide");
                });
                // cancel
                changePasswordForm.querySelector(".cancel-btn").addEventListener("click", ()=>{
                    changePasswordForm.classList.replace("showup", "hide");
                    usersControlsFormsWin.classList.replace("showup", "hide");
                });
            }else{
                changePasswordForm.classList.replace("showup", "hide");
                usersControlsFormsWin.classList.replace("showup", "hide");
            }
        });
    }   
}

// Initialization =============================================================

function initApp() {
    // sessionning , logging and so...
    if( sessionStorage.getItem("sid") ){
        global.sid = sessionStorage.getItem("sid");
        sessionStorage.removeItem("sid")
        attemptAutoLogin();
    }else{
        showNormalLogin();
    }

    // Only view sizes for now 
    window.addEventListener("resize", ()=>{
        if( window.screen.width < 1024 ){
            window.screen.width = 1024;
        };
    });

    // Auto-logout when tab is hidden for a while
    let isTabHidden = false ; 
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            isTabHidden = true;
            awayTimeout = setTimeout(logout, 600000); // 10 minutes
        } else {
            isTabHidden = false;
            clearTimeout(awayTimeout);
        }
    });

    // Setup second step event listeners
    document.addEventListener("secondStepReady", setupSecondStepEvents);
    
}

window.addEventListener("load", initApp);
window.addEventListener("beforeunload", e=>{
    sessionStorage.setItem("sid", global.sid )
    fetch("/page_reloading", {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            sid : global.sid
        }),
        keepalive: true,
    });
});
