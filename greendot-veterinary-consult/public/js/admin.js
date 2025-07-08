// Admin specific JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin JavaScript loaded.');

    const productForm = document.getElementById('productForm');
    const existingProductsTableContainer = document.getElementById('existingProductsTableContainer');
    const clearProductFormButton = document.getElementById('clearProductForm');
    const productIdField = document.getElementById('productId');

    let allAdminProductsData = []; // Store fetched products for admin use (e.g., editing)

    // --- Helper: Display messages on admin forms ---
    // (Similar to main.js but scoped here or could be global utility)
    function displayAdminFormMessage(formElement, message, type = 'info') {
        let messageDiv = formElement.querySelector('.form-message');
        if (!messageDiv && formElement.parentElement.querySelector('.form-message')) { // Check parent if not direct child
            messageDiv = formElement.parentElement.querySelector('.form-message');
        }
        if (!messageDiv) { // Still not found, create it
            messageDiv = document.createElement('div');
            messageDiv.classList.add('form-message');
            const submitButton = formElement.querySelector('button[type="submit"]');
            if (submitButton) formElement.insertBefore(messageDiv, submitButton.nextSibling);
            else formElement.appendChild(messageDiv);
        }

        messageDiv.textContent = message;
        messageDiv.className = 'form-message'; // Reset
        messageDiv.classList.add(type === 'success' ? 'success-message' : type === 'error' ? 'error-message' : 'info-message');
        messageDiv.style.display = message ? 'block' : 'none';
    }


    // --- Fetch and Display Products ---
    async function fetchAndRenderProducts() {
        if (!existingProductsTableContainer) return; // Only run if on admin-products.html

        existingProductsTableContainer.innerHTML = '<p class="loading-message">Loading products...</p>';
        const token = localStorage.getItem('authToken');
        // Although /api/products is public, for admin consistency we might secure it or use an admin specific one
        // For now, using the public one.

        try {
            const response = await fetch('/api/products', {
                headers: { 'Authorization': `Bearer ${token}` } // Good practice even for public GETs if part of an admin flow
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || `HTTP error! status: ${response.status}`);
            }
            allAdminProductsData = await response.json(); // Store for later use
            renderProductTable(allAdminProductsData);
        } catch (error) {
            console.error('Error fetching products for admin:', error);
            existingProductsTableContainer.innerHTML = `<p class="error-message">Failed to load products: ${error.message}</p>`;
        }
    }

    function renderProductTable(products) {
        if (!existingProductsTableContainer) return;

        if (products.length === 0) {
            existingProductsTableContainer.innerHTML = '<p>No products found. Add some using the form above!</p>';
            return;
        }

        let tableHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        products.forEach(product => {
            tableHTML += `
                <tr data-product-id="${product.id}">
                    <td><img src="${product.imageUrl || '/images/products/default-product.jpg'}" alt="${product.name}" class="product-image-thumbnail"></td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>${product.price}</td>
                    <td>${product.stock}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm edit-product-btn">Edit</button>
                        <button class="btn btn-danger btn-sm delete-product-btn">Delete</button>
                    </td>
                </tr>
            `;
        });
        tableHTML += '</tbody></table>';
        existingProductsTableContainer.innerHTML = tableHTML;

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-product-btn').forEach(button => {
            button.addEventListener('click', handleEditProductSetup);
        });
        document.querySelectorAll('.delete-product-btn').forEach(button => {
            button.addEventListener('click', handleDeleteProduct);
        });
    }

    // --- Add / Edit Product Form Handling ---
    if (productForm) {
        productForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            displayAdminFormMessage(productForm, 'Processing...', 'info');
            const token = localStorage.getItem('authToken');
            if (!token) {
                displayAdminFormMessage(productForm, 'Authentication error. Please login.', 'error');
                return;
            }

            const formData = new FormData(productForm);
            const productData = Object.fromEntries(formData.entries());

            // Ensure stock is a number
            productData.stock = parseInt(productData.stock);
            if (isNaN(productData.stock) || productData.stock < 0) {
                displayAdminFormMessage(productForm, 'Stock must be a valid non-negative number.', 'error');
                return;
            }
            if (!productData.imageUrl) { // Use default if empty
                productData.imageUrl = '/images/products/default-product.jpg';
            }


            let url = '/api/admin/products';
            let method = 'POST';

            if (productData.productId) { // If productId exists, it's an update
                url += `/${productData.productId}`;
                method = 'PUT';
            }

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(productData)
                });

                const result = await response.json();

                if (response.ok) {
                    displayAdminFormMessage(productForm, result.message || `Product ${method === 'POST' ? 'added' : 'updated'} successfully!`, 'success');
                    productForm.reset();
                    productIdField.value = ''; // Clear hidden ID field
                    if(clearProductFormButton) clearProductFormButton.style.display = 'none';
                    fetchAndRenderProducts(); // Refresh the table
                } else {
                    displayAdminFormMessage(productForm, result.message || `Failed to ${method === 'POST' ? 'add' : 'update'} product.`, 'error');
                }
            } catch (error) {
                console.error('Error saving product:', error);
                displayAdminFormMessage(productForm, `An error occurred: ${error.message}`, 'error');
            }
        });
    }

    if(clearProductFormButton && productForm) {
        clearProductFormButton.addEventListener('click', () => {
            productForm.reset();
            productIdField.value = '';
            clearProductFormButton.style.display = 'none';
            productForm.querySelector('button[type="submit"]').textContent = 'Save Product';
            displayAdminFormMessage(productForm, '', 'info'); // Clear message
        });
    }


    // --- Handle Edit Product Button Click (Setup form for editing) ---
    async function handleEditProductSetup(event) {
        const button = event.target;
        const row = button.closest('tr');
        const productId = row.dataset.productId;

        displayAdminFormMessage(productForm, 'Loading product data for editing...', 'info');

        // Fetch the full product details (as table might not have all, like description)
        // Or, if products array is already fetched and stored globally in admin.js, use that.
        // For simplicity, let's assume we refetch or have it. Here, we'll try to get from already fetched products.
        // This requires `allProductsData` to be accessible or refetch.
        // Let's modify fetchAndRenderProducts to store fetched products.

        try {
            const productToEdit = allAdminProductsData.find(p => p.id === productId);

            if (productToEdit && productForm) {
                productIdField.value = productToEdit.id;
                productForm.querySelector('#productName').value = productToEdit.name;
                productForm.querySelector('#productCategory').value = productToEdit.category;
                productForm.querySelector('#productPrice').value = productToEdit.price;
                productForm.querySelector('#productStock').value = productToEdit.stock;
                productForm.querySelector('#productImageUrl').value = productToEdit.imageUrl === '/images/products/default-product.jpg' ? '' : productToEdit.imageUrl;
                productForm.querySelector('#productDescription').value = productToEdit.description || '';

                productForm.querySelector('button[type="submit"]').textContent = 'Update Product';
                if(clearProductFormButton) clearProductFormButton.style.display = 'inline-block';
                displayAdminFormMessage(productForm, `Editing product: ${productToEdit.name}`, 'info');
                productForm.scrollIntoView({ behavior: 'smooth' });
            } else {
                 displayAdminFormMessage(productForm, 'Could not find product details for editing.', 'error');
            }
        } catch (error) {
            console.error("Error setting up edit form:", error);
            displayAdminFormMessage(productForm, `Error: ${error.message}`, 'error');
        }
    }

    // --- Handle Delete Product Button Click ---
    async function handleDeleteProduct(event) {
        const button = event.target;
        const row = button.closest('tr');
        const productId = row.dataset.productId;
        const productName = row.cells[1].textContent; // Get name from table cell

        if (!confirm(`Are you sure you want to delete the product: "${productName}"?`)) {
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            alert('Authentication error. Please login.'); // Or use a modal
            return;
        }

        try {
            const response = await fetch(`/api/admin/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await response.json();

            if (response.ok) {
                alert(result.message || 'Product deleted successfully!'); // Or use a modal
                fetchAndRenderProducts(); // Refresh the table
            } else {
                alert(result.message || 'Failed to delete product.'); // Or use a modal
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert(`An error occurred: ${error.message}`); // Or use a modal
        }
    }


    // Initial Load for admin-products page
    if (document.getElementById('admin-products-page-identifier')) { // Add an ID to admin-products.html body or main
         // This check is not robust. Better to check for specific elements like productForm.
    }
    // More robust check:
    if (productForm && existingProductsTableContainer) {
        fetchAndRenderProducts();
    }

});
