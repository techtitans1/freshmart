// script.js

// --- Utility Functions ---

function showFlashMessage(message, type = 'info') {
    const container = document.getElementById('flashMessageContainer');
    if (!container) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-2 alert-fixed`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    container.appendChild(alertDiv);

    // Auto-remove after 5 seconds (matched with CSS animation)
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function isLoggedIn() {
    return sessionStorage.getItem('loggedInUserEmail') !== null;
}

function getLoggedInUser() {
    const email = sessionStorage.getItem('loggedInUserEmail');
    if (!email) return null;
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    return users[email];
}

// --- Navigation and Auth State Management ---

function updateNavbar() {
    const navAuthItems = document.getElementById('navAuthItems');
    if (!navAuthItems) return;

    if (isLoggedIn()) {
        const user = getLoggedInUser();
        navAuthItems.innerHTML = `
            <li class="nav-item">
                <span class="nav-link text-white-50">Welcome, ${user ? user.name : 'User'}!</span>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="dashboard_overview.html">Dashboard</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#" id="logoutBtn">Logout</a>
            </li>
        `;
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    } else {
        navAuthItems.innerHTML = `
            <li class="nav-item">
                <a class="nav-link" href="login.html">Login</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="signup.html">Sign Up</a>
            </li>
        `;
    }
}

function logout() {
    sessionStorage.removeItem('loggedInUserEmail');
    showFlashMessage('You have been logged out.', 'info');
    setTimeout(() => { // Give time for flash message to appear
        window.location.href = 'login.html';
    }, 500);
}

// --- Authentication Logic (Client-side simulation - NOT SECURE) ---

// Initialize default users if none exist
function initializeUsers() {
    if (!localStorage.getItem('users')) {
        const defaultUsers = {
            'admin@example.com': { name: 'Admin User', password: 'password123' }, // For demo, plain text is used
            'john@doe.com': { name: 'John Doe', password: 'johnpass' }
        };
        localStorage.setItem('users', JSON.stringify(defaultUsers));
    }
}

// Attach common event listeners and update navbar on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initializeUsers();
    updateNavbar();

    // Check auth for protected pages
    const protectedPages = ['dashboard_overview.html', 'dashboard_product_type.html'];
    const currentPage = window.location.pathname.split('/').pop();

    if (protectedPages.includes(currentPage) && !isLoggedIn()) {
        showFlashMessage('You need to be logged in to access this page.', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 500);
    }
});