document.addEventListener('DOMContentLoaded', function() {

    // --- Hamburger Menu Toggle ---
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when a link is clicked (optional, good for SPAs or if menu takes full height)
        document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
            if (hamburger.classList.contains('active')) { // Only if mobile menu is open
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        }));
    }

    // --- Dynamic Year in Footer ---
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // --- Active Navigation Link Highlighting ---
    // This is a simple version. For more complex routing, a more robust solution is needed.
    const currentLocation = window.location.pathname.split('/').pop(); // Gets the current file name e.g., 'about.html'
    const navLinks = document.querySelectorAll('.nav-menu .nav-link');

    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        // Reset active class from HTML in case of multiple
        link.classList.remove('active');
        if (linkPage === currentLocation || (currentLocation === '' && linkPage === 'index.html')) {
            link.classList.add('active');
        }
    });
    // Ensure the one set in HTML (if any) is preferred if no JS match or if on index.
     const activeHTML = document.querySelector('.nav-menu .nav-link.active');
     if (activeHTML && currentLocation !== activeHTML.getAttribute('href').split('/').pop() && !(currentLocation === '' && activeHTML.getAttribute('href').split('/').pop() === 'index.html')) {
        // if HTML active class is not the current page, remove it (JS logic above should handle it)
        // but if JS didn't set one, and HTML has one, keep it.
        // This logic is a bit tricky. The goal is: HTML active is fallback, JS active is preferred.
        let jsHasSetAnActiveLink = false;
        navLinks.forEach(link => {
            if(link.classList.contains('active')) jsHasSetAnActiveLink = true;
        });
        if(jsHasSetAnActiveLink && activeHTML.classList.contains('active') && !navLinks[Array.from(navLinks).indexOf(activeHTML)].classList.contains('active')) {
             // If JS set an active link, and it's different from the HTML one, remove HTML's active
        } else if (!jsHasSetAnActiveLink && activeHTML) {
            // If JS set no active link, but HTML has one, ensure it is active
            activeHTML.classList.add('active');
        }
     }


    // --- Contact Form AJAX Submission ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            displayFormMessage(contactForm, '', 'info'); // Clear previous messages

            const fullNameInput = contactForm.querySelector('#fullName');
            const emailInput = contactForm.querySelector('#email');
            const phoneInput = contactForm.querySelector('#phone');
            const subjectInput = contactForm.querySelector('#subject');
            const messageInput = contactForm.querySelector('#message');

            // Client-side validation (can be enhanced)
            if (!fullNameInput.value.trim()) {
                displayFormMessage(contactForm, 'Please enter your full name.', 'error');
                fullNameInput.focus(); return;
            }
            if (!emailInput.value.trim() || !validateEmail(emailInput.value.trim())) {
                displayFormMessage(contactForm, 'Please enter a valid email address.', 'error');
                emailInput.focus(); return;
            }
            if (!subjectInput.value.trim()) {
                displayFormMessage(contactForm, 'Please enter a subject.', 'error');
                subjectInput.focus(); return;
            }
            if (!messageInput.value.trim()) {
                displayFormMessage(contactForm, 'Please enter your message.', 'error');
                messageInput.focus(); return;
            }

            const formData = {
                fullName: fullNameInput.value.trim(),
                email: emailInput.value.trim(),
                phone: phoneInput.value.trim(),
                subject: subjectInput.value.trim(),
                message: messageInput.value.trim()
            };

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                const result = await response.json();

                if (response.ok && result.success) {
                    displayFormMessage(contactForm, result.message || 'Message sent successfully!', 'success');
                    contactForm.reset(); // Clear the form
                } else {
                    displayFormMessage(contactForm, result.message || 'Failed to send message. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Contact form fetch error:', error);
                displayFormMessage(contactForm, 'An error occurred while sending your message. Please try again later.', 'error');
            }
        });
    }

    // --- Basic Signup Form Client-Side Validation (Password Match) ---
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Prevent default form submission in all cases for AJAX

            const usernameInput = signupForm.querySelector('#username');
            const emailInput = signupForm.querySelector('#email');
            const passwordInput = signupForm.querySelector('#password');
            const confirmPasswordInput = signupForm.querySelector('#confirmPassword');

            // Clear previous messages
            displayFormMessage(signupForm, '', 'info');


            if (!emailInput.value.trim() || !validateEmail(emailInput.value.trim())) {
                displayFormMessage(signupForm, 'Please enter a valid email address.', 'error');
                emailInput.focus();
                return;
            }

            if (passwordInput.value !== confirmPasswordInput.value) {
                displayFormMessage(signupForm, 'Passwords do not match. Please re-enter.', 'error');
                passwordInput.focus();
                return;
            }
            if (passwordInput.value.length < 6) {
                displayFormMessage(signupForm, 'Password must be at least 6 characters long.', 'error');
                passwordInput.focus();
                return;
            }

            const formData = {
                username: usernameInput.value.trim(),
                email: emailInput.value.trim(),
                password: passwordInput.value
            };

            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    displayFormMessage(signupForm, result.message || 'Signup successful! You can now login.', 'success');
                    signupForm.reset(); // Clear the form
                    // Optionally redirect to login page after a delay
                    setTimeout(() => {
                         if (document.querySelector('.nav-link[href="login.html"]')) { // Check if login link exists
                            window.location.href = 'login.html';
                         }
                    }, 2000);
                } else {
                    displayFormMessage(signupForm, result.message || 'Signup failed. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Signup fetch error:', error);
                displayFormMessage(signupForm, 'An unexpected error occurred. Please try again later.', 'error');
            }
        });
    }

    // --- Email Validation Helper Function ---
    // Moved validateEmail and displayFormMessage to be accessible by login form logic too
    // (They are already defined above or will be if this block is placed correctly)

    // --- Login Form AJAX Submission ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            displayFormMessage(loginForm, '', 'info'); // Clear previous messages

            const emailInput = loginForm.querySelector('#email');
            const passwordInput = loginForm.querySelector('#password');

            if (!emailInput.value.trim() || !validateEmail(emailInput.value.trim())) {
                displayFormMessage(loginForm, 'Please enter a valid email address.', 'error');
                emailInput.focus();
                return;
            }
            if (!passwordInput.value) {
                displayFormMessage(loginForm, 'Please enter your password.', 'error');
                passwordInput.focus();
                return;
            }

            const formData = {
                email: emailInput.value.trim(),
                password: passwordInput.value
            };

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok && result.token) {
                    displayFormMessage(loginForm, result.message || 'Login successful! Redirecting...', 'success');
                    localStorage.setItem('authToken', result.token);
                    localStorage.setItem('greendotUser', JSON.stringify(result.user));
                    updateAuthUI(true, result.user); // Update nav immediately

                    // Redirect to homepage or dashboard after a short delay
                    setTimeout(() => {
                        window.location.href = 'index.html'; // Or a dashboard page
                    }, 1500);
                } else {
                    displayFormMessage(loginForm, result.message || 'Login failed. Please check your credentials.', 'error');
                }
            } catch (error) {
                console.error('Login fetch error:', error);
                displayFormMessage(loginForm, 'An unexpected error occurred. Please try again later.', 'error');
            }
        });
    }


    // --- Update UI based on Auth State & Logout ---
    const authLinks = document.querySelectorAll('.nav-menu .auth-links'); // These are LIs
    const navMenuUl = document.querySelector('.nav-menu'); // The UL

    function updateAuthUI(isLoggedIn, userData = null) {
        if (isLoggedIn && userData) {
            authLinks.forEach(link => link.style.display = 'none'); // Hide Login/Signup LIs

            // Remove existing user info/logout if present, to prevent duplication
            const existingUserInfo = navMenuUl.querySelector('.user-info-nav');
            if (existingUserInfo) existingUserInfo.remove();
            const existingLogoutLink = navMenuUl.querySelector('.logout-link-nav');
            if (existingLogoutLink) existingLogoutLink.remove();


            const userInfoLi = document.createElement('li');
            userInfoLi.classList.add('nav-item', 'user-info-nav');
            userInfoLi.innerHTML = `<span class="nav-link">Hi, ${userData.username}!</span>`;
            navMenuUl.appendChild(userInfoLi);

            const logoutLi = document.createElement('li');
            logoutLi.classList.add('nav-item', 'logout-link-nav');
            logoutLi.innerHTML = '<a href="#" id="logoutButton" class="nav-link">Logout</a>';
            navMenuUl.appendChild(logoutLi);

            const logoutButton = document.getElementById('logoutButton');
            if (logoutButton) {
                logoutButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('greendotUser');
                    updateAuthUI(false); // This will also remove admin link

                    const globalMessageArea = document.getElementById('global-message-area');
                    if (globalMessageArea) {
                        globalMessageArea.innerHTML = `<div class="form-message success-message">You have been logged out.</div>`;
                        setTimeout(() => { globalMessageArea.innerHTML = ''; }, 3000);
                    } else {
                        alert('You have been logged out.');
                    }
                    window.location.href = 'index.html';
                });
            }

            // Add Admin Dashboard link if user is admin
            if (userData.role === 'admin') {
                const adminLinkLi = document.createElement('li');
                adminLinkLi.classList.add('nav-item', 'admin-link-nav');
                adminLinkLi.innerHTML = '<a href="admin.html" class="nav-link">Admin Dashboard</a>';
                // Insert it before logout, or at a specific position
                if (logoutLi && navMenuUl) {
                    navMenuUl.insertBefore(adminLinkLi, logoutLi);
                } else if (navMenuUl) {
                    navMenuUl.appendChild(adminLinkLi);
                }
            }

        } else { // Logged out state
            authLinks.forEach(link => link.style.display = 'list-item');

            const userInfoNav = navMenuUl.querySelector('.user-info-nav');
            if (userInfoNav) userInfoNav.remove();
            const logoutLinkNav = navMenuUl.querySelector('.logout-link-nav');
            if (logoutLinkNav) logoutLinkNav.remove();
            const adminLinkNav = navMenuUl.querySelector('.admin-link-nav'); // Also remove admin link on logout
            if (adminLinkNav) adminLinkNav.remove();
        }
    }

    // Initial check for auth state on page load
    const storedToken = localStorage.getItem('authToken');
    const storedUser = JSON.parse(localStorage.getItem('greendotUser'));
    if (storedToken && storedUser) {
        // You might want to verify token validity with the server here in a real app
        updateAuthUI(true, storedUser);
    } else {
        updateAuthUI(false);
    }


    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

});

// Placeholder for image slider (e.g., for hero banner) - if needed later
// function initSlider() { ... }
// if (document.querySelector('.hero-slider')) { initSlider(); }


// Placeholder for handling auth state UI changes (e.g. show/hide login/logout links)
// function updateAuthUI(isLoggedIn) {
//     const authLinks = document.querySelectorAll('.auth-links'); // li elements
//     const loggedInUserDisplay = document.getElementById('loggedInUserDisplay'); // Placeholder for user info
//     if (isLoggedIn) {
//         authLinks.forEach(link => link.style.display = 'none');
//         if (loggedInUserDisplay) loggedInUserDisplay.style.display = 'block'; // Or some other element
//         // Potentially add a logout button dynamically or show a hidden one
//     } else {
//         authLinks.forEach(link => link.style.display = 'list-item'); // Or 'block' or 'inline-block' based on CSS
//         if (loggedInUserDisplay) loggedInUserDisplay.style.display = 'none';
//     }
// }
// Example: updateAuthUI(false); // Initially not logged in
// After login: updateAuthUI(true);
// After logout: updateAuthUI(false);
// This would typically be called after checking a token in localStorage.


    // --- Dynamic Product Loading for Shop Page ---
    if (document.getElementById('product-grid-all')) { // Check if we are on the shop page
        fetchProductsAndRender();
    }

    // --- Category Link Filtering/Display (Basic) ---
    const categoryLinks = document.querySelectorAll('.category-link');
    const productSections = {
        all: document.getElementById('all-products-section'),
        food: document.getElementById('food-section'),
        accessories: document.getElementById('accessories-section'),
        grooming: document.getElementById('grooming-section'),
        treats: document.getElementById('treats-section')
    };
    const productGrids = {
        all: document.getElementById('product-grid-all'),
        food: document.getElementById('product-grid-food'),
        accessories: document.getElementById('product-grid-accessories'),
        grooming: document.getElementById('product-grid-grooming'),
        treats: document.getElementById('product-grid-treats')
    };

    let allProductsData = []; // Store all fetched products

    async function fetchProductsAndRender() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allProductsData = await response.json();
            renderProducts(allProductsData, productGrids.all); // Render all products initially

            // Optionally pre-render categories if sections are separate
            // renderProducts(filterProductsByCategory(allProductsData, 'Food'), productGrids.food);
            // renderProducts(filterProductsByCategory(allProductsData, 'Accessories'), productGrids.accessories);
            // renderProducts(filterProductsByCategory(allProductsData, 'Grooming'), productGrids.grooming);
            // renderProducts(filterProductsByCategory(allProductsData, 'Treats'), productGrids.treats);


        } catch (error) {
            console.error('Error fetching products:', error);
            if (productGrids.all) {
                productGrids.all.innerHTML = '<p class="error-message">Could not load products. Please try again later.</p>';
            }
        }
    }

    function filterProductsByCategory(products, category) {
        return products.filter(product => product.category === category);
    }

    function renderProducts(productsToRender, targetGridElement) {
        if (!targetGridElement) {
            console.warn("Target grid element not found for rendering products.");
            return;
        }
        targetGridElement.innerHTML = ''; // Clear previous content (e.g., "Loading..." message)

        if (productsToRender.length === 0) {
            targetGridElement.innerHTML = '<p>No products found in this category.</p>';
            return;
        }

        productsToRender.forEach(product => {
            const productCard = document.createElement('div');
            productCard.classList.add('product-item');
            productCard.innerHTML = `
                <img src="${product.imageUrl || '/images/products/default-product.jpg'}" alt="${product.name}" class="product-image-placeholder">
                <h3>${product.name}</h3>
                <p class="product-price">${product.price}</p>
                <p class="product-description" style="display:none;">${product.description || ''}</p>
                <button class="btn btn-primary add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
            `;
            // Note: product.description is hidden by default, can be shown on click/hover if desired
            targetGridElement.appendChild(productCard);
        });
    }

    categoryLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const category = this.dataset.category;

            // Hide all sections, then show the relevant one(s)
            Object.values(productSections).forEach(section => {
                if (section) section.style.display = 'none';
            });

            if (category) { // A specific category was clicked
                const categoryKey = category.toLowerCase();
                if (productSections[categoryKey]) {
                    productSections[categoryKey].style.display = 'block';
                     // If sections are separate, make sure products are rendered for it
                    if(productGrids[categoryKey].innerHTML.trim() === '') { // Render only if not already rendered
                        renderProducts(filterProductsByCategory(allProductsData, category), productGrids[categoryKey]);
                    }
                } else if (productSections.all) { // Fallback to all if specific category section not found
                    productSections.all.style.display = 'block';
                    renderProducts(filterProductsByCategory(allProductsData, category), productGrids.all); // Filter 'all' grid
                }
            } else if (productSections.all) { // "View All" or similar, or if data-category is missing
                 productSections.all.style.display = 'block';
                 renderProducts(allProductsData, productGrids.all); // Render all products in the 'all' grid
            }

            // Scroll to the product listing area
            const targetSectionId = this.getAttribute('href'); // e.g., #food-section
            const targetElement = document.querySelector(targetSectionId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Add to cart functionality (placeholder)
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('add-to-cart-btn')) {
            const productId = event.target.dataset.productId;
            alert(`Product ID ${productId} added to cart (placeholder functionality).`);
            // Here you would typically:
            // 1. Add item to a client-side cart array/object
            // 2. Update cart UI (e.g., item count in header)
            // 3. Optionally, sync with backend cart if user is logged in
        }
    });

    // --- Helper function to display messages on forms ---
    function displayFormMessage(formElement, message, type = 'info') {
        let messageDiv = formElement.querySelector('.form-message');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.classList.add('form-message');
            // Insert message div before the first form child, or before the submit button
            const submitButton = formElement.querySelector('button[type="submit"]');
            if (submitButton) {
                formElement.insertBefore(messageDiv, submitButton);
            } else {
                formElement.prepend(messageDiv); // Fallback if no submit button
            }
        }

        messageDiv.textContent = message;
        messageDiv.className = 'form-message'; // Reset classes
        if (type === 'success') {
            messageDiv.classList.add('success-message');
        } else if (type === 'error') {
            messageDiv.classList.add('error-message');
        } else {
            messageDiv.classList.add('info-message');
        }

        // Ensure message is noticeable
        if (!message) {
            messageDiv.style.display = 'none';
        } else {
            messageDiv.style.display = 'block';
        }
    }

});
