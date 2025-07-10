
// Helper function for string comparison
const compareStrings = (str1, str2) => 
  str1.length > 0 && str1.length === str2.length && str1 === str2;

// Component-based UI generator
const UIComponents = {
  // Reusable filter controls
  filterControls: () => `
    <div class="filter-controls">
        <div class="filter-group">
            <label class="filter-label">Date Range</label>
            <select class="filter-select date-filter" id="dateFilter">
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
            </select>
        </div>
        <div class="filter-group">
            <label class="filter-label">Sort By</label>
            <select class="filter-select sort-filter" id="sortFilter">
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="high">Highest Amount</option>
                <option value="low">Lowest Amount</option>
            </select>
        </div>
        <div class="filter-group">
            <label class="filter-label">User </label>
            <select class="filter-select user-filter" id="userFilter">
                <option value="all">All Users</option>
                <!-- add users with js -->
            </select>
        </div>
    </div>
  `,

  // Search bar component
  searchBar: (placeholder = "Search...", id = "searchInput") => `
    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input type="text" id="${id}" placeholder="${placeholder}">
    </div>
  `,

  // Empty state component
  emptyState: (imgurl, title, message) => `
    <div class="empty-state">
      <i class="fas fa-${imgurl}"></i>
      <h3>${title}</h3>
      <p>${message}</p>
    </div>
  `,

  // Transaction table
  transactionTable: () => `
    <table class="data-table transactions-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Date & Time</th>
          <th>User</th>
          <th>Items</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody id="transactionsList"></tbody>
    </table>
  `,

  // Stock table
  stockTable: () => `
    <!-- hidden form to add new products -->
    <div id="addNewProductForm" >
      <h2>Add A New Product</h2>
      <div class="inputsGrid">
        <input class="add-product-input" type="text" data-content-key="name" data-content-value="value" placeholder="name..">
        <input class="add-product-input" type="number" data-content-key="batch" data-content-value="value" placeholder="batch..">
        <input class="add-product-input" type="text" data-content-key="category" data-content-value="value" placeholder="category..">
        <input class="add-product-input" type="number" data-content-key="price" data-content-value="value" placeholder="price..">
        <input class="add-product-input" type="number" data-content-key="stock" data-content-value="value" placeholder="stock..">
        <input class="add-product-input" type="url" data-content-key="imgurl" data-content-value="value" placeholder="imgurl..">
      </div>
      <div class="saveOrClose" >
        <input type="button" class="save-btn" value="save">
        <input type="button" class="cancel-btn" value="cancel">
      </div>
    </div>

    <div class="stockViewControllers">
      <div class="stock-search">
        <input type="text" placeholder="search in stock" class="stock-filter-input" id="stockSearch">
      </div>
      <div class="acts-btns-group">
        <input type="button" class="act-btn" data-act="addNewProductBtn" value="add new product" >
      </div>
    </div>

    <table class="data-table stock-table" id="stockTable">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Batch</th>
          <th>Category</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Add Date & time</th>
          <th>Image</th>
          <th>
            <i class="fas fa-trash"></i>
          </th>
        </tr>
      </thead>
      <tbody id="stockProductsList"></tbody>
    </table>

  `,

  usersControls: ( isAdmin = false )=>{

    if( !isAdmin ){
      return `
      <div id="usersControlsForms" class="hide">
        <div id="changePasswordForm" class="hide">
          <h2>change your password</h2>
          <span >
            once you set the new password , it is done
          </span>
          <div class="inputsGrid">
            <input class="add-user-input" type="text" data-content-key="oldPassword" placeholder="the old one ..">
            <input class="add-user-input" type="text" data-content-key="newPassword" placeholder="the new one ..">
          </div>
          <div class="saveOrClose" >
            <input type="button" class="save-btn" value="submit">
            <input type="button" class="cancel-btn" value="cancel">
          </div>
        </div>
      </div>`
    }

    return `
    <div id="usersControlsForms" class="hide">
      <div id="addNewUserForm" class="hide" >
        <h2>Add A New User</h2>
        <span >
          the password for new users is 0-9, until they change it
        </span>
        <div class="inputsGrid">
          <input class="add-user-input" type="username" data-content-key="username" placeholder="username..">
          <input class="add-user-input" type="username" data-content-key="role" placeholder="role..">
        </div>
        <div class="saveOrClose" >
          <input type="button" class="save-btn" value="save">
          <input type="button" class="cancel-btn" value="cancel">
        </div>
      </div>
      
      <div id="changePasswordForm" class="hide">
        <h2>change your password</h2>
        <span >
          once you set the new password , it is done
        </span>
        <div class="inputsGrid">
          <input class="add-user-input" type="text" data-content-key="oldPassword" placeholder="the old one ..">
          <input class="add-user-input" type="text" data-content-key="newPassword" placeholder="the new one ..">
        </div>
        <div class="saveOrClose" >
          <input type="button" class="save-btn" value="submit">
          <input type="button" class="cancel-btn" value="cancel">
        </div>
      </div>
    </div>`
  },

  usersTable: ()=>{
    return `
    <div class="acts-btns-group">
      <input type="button" class="act-btn" data-act="addNewUserBtn" value="add" >
      <input type="button" class="act-btn" data-act="changePass" value="change pass" >
    </div>
    <table class="data-table users-table" id="usersTable">
      <thead>
        <tr>
          <th>ID</th>
          <th>Username</th>
          <th>Role</th>
          <th>Live</th>
          <th>
            <i class="fas fa-trash"></i>
          </th>
        </tr>
      </thead>
      <tbody id="usersList"></tbody>
    </table>`
  },

  // Modal header with tabs
  modalHeader: (isAdmin = false) => {
    if (!isAdmin) {
      return `
      <div class="modal-header">
        <h2 class="modal-title">Settings</h2>
        <div class="modal-tabs">
          <button class="tab-btn" data-tab="users" data-act="changePass" >Settings</button>
        </div>
      </div>
      `;
    }
    
    return `
      <div class="modal-header">
        <h2 class="modal-title">Stock Management</h2>
        <div class="modal-tabs">
          <button class="tab-btn active" data-tab="transactions">Transactions</button>
          <button class="tab-btn" data-tab="stock">Stock</button>
          <button class="tab-btn" data-tab="users">Users</button>
        </div>
      </div>
    `;
  }
};

const appContainerFor = (userRole) => {
  const isAdmin = compareStrings(userRole, "admin");
  
  // Settings button based on role
  const settingsBtn = isAdmin 
    ? `<i class="fas fa-cog" title="Settings"></i>` 
    : `<i class="fas fa-history" title="Transaction History"></i>`;
  
  // Build modal content based on role
  const buildModalContent = () => {
    if (!isAdmin) {
      return `
        <div class="modal-content">
          ${UIComponents.modalHeader(false)}
          <div class="modal-body">
            <div class="tab-content showup" data-tab-content="transactions">
              ${UIComponents.transactionTable()}
              ${UIComponents.emptyState("file-invoice", "No Transactions Found", "Your transaction history will appear here once you make sales")}
            </div>
            ${UIComponents.usersControls()}
          </div>
        </div>
      `;
    }
    
    return `
      <div class="modal-content">
        ${UIComponents.modalHeader(true)}
        <div class="modal-body">
          <!-- Transactions Tab -->
          <div class="tab-content showup" data-tab-content="transactions">
            ${UIComponents.filterControls()}
            ${UIComponents.transactionTable()}
            ${UIComponents.emptyState("file-invoice", "No Transactions Found", "Your transaction history will appear here once you make sales")}
          </div>
          
          <!-- Stock Tab -->
          <div class="tab-content hide" data-tab-content="stock">
            ${UIComponents.stockTable()}
            ${UIComponents.emptyState("boxes", "No Products in Stock", "Add products to see them listed here")}
          </div>
          
          <!-- Users Tab -->
          <div class="tab-content hide" data-tab-content="users">
            ${UIComponents.usersControls( true )}
            ${UIComponents.usersTable()}
            ${UIComponents.emptyState("user", "No users found", "bye")}
          </div>


        </div>
      </div>
    `;
  };

  return `
    <!-- Main App Container -->
    <div class="app-container" id="appContainer">
      <!-- Modal Window -->
      <div id="subWindow">${buildModalContent()}</div>
      
      <!-- Top Navigation -->
      <header class="app-header">
        <div class="brand">
          <i class="fas fa-cash-register"></i>
          <h1>Super POS System</h1>
        </div>
        
        <div class="user-controls">
          <div class="user-info">
            <span class="user-badge">Cashier:</span>
            <span id="currentUser" class="user-name">Loading...</span>
          </div>
          
          <div class="action-icons">
            <button id="refreshBtn" class="icon-btn" title="Refresh Products">
              <i class="fas fa-sync-alt"></i>
            </button>
            <button id="settingsBtn" class="icon-btn" title="${isAdmin?"Setting & Transactions History":"Transactions History"}">
              <i class="fas fa-cog" title="Settings"></i>
            </button>
            <button id="logoutBtn" class="icon-btn" title="Logout">
              <i class="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>
      
      <!-- Main Content Area -->
      <main class="app-main">
        <!-- Products Section -->
        <section class="products-section">
          <div class="section-header">
            <h3>Available Products</h3>
            <div class="controls">
              ${UIComponents.searchBar("Search products...", "searchInput")}
            </div>
          </div>
          
          <!-- categories tabs -->
          <div class="category-tabs">
          </div>
          
          <!-- Products Cards will be loaded here -->
          <div class="products-grid" id="productsGrid">
          </div>
        </section>
        
        <!-- Cart Section -->
        <section class="cart-section">
          <div class="section-header">
            <h3>
              <i class="fas fa-shopping-cart"></i>
              Cart 
            </h3>
           <!-- <span class="badge" id="cartCount">0</span> -->
          </div>
          
          <div class="real-time-indicator">
            <i class="fas fa-bolt"></i>
            Real-time inventory tracking
          </div>
          
          <div class="cart-items" id="cartItems">
            <div class="empty-cart" id="emptyCartMessage">
              <i class="fas fa-shopping-cart"></i>
              <h3>Your cart is empty</h3>
              <p>Add products to get started</p>
            </div>
          </div>
          
          <div class="cart-summary">
            <div class="summary-row total">
              <span>Total:</span>
              <span id="total">$0.00</span>
            </div>
            
            <button class="checkout-btn" id="checkoutBtn" disabled>
              Complete Purchase
            </button>
          </div>
        </section>
      </main>
    </div>
  `;
};

module.exports = { appContainerFor };
