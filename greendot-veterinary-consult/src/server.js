const express = require('express');
const path = require('path');
const fs = require('fs'); // Added File System module
const { v4: uuidv4 } = require('uuid'); // Added for unique IDs
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs'); // Using bcryptjs
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// !!! IMPORTANT SECURITY NOTE !!!
// The JWT_SECRET should always be stored securely in an environment variable in a production environment.
// It should be a long, complex, random string.
// For demonstration purposes, it's hardcoded here, but DO NOT do this in production.
const JWT_SECRET = 'yourSuperSecretKey123!@#DoNotUseThisInProductionChangeIt';

// In-memory store for users (replace with a database in a real application)
const users = []; // Stores { id, username, email, password (hashed), role }

// Middleware
app.use(bodyParser.json()); // To parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // To parse URL-encoded bodies

// Define paths for Express config
const publicDirectoryPath = path.join(__dirname, '../public');
const viewsPath = path.join(__dirname, '../views');
const productsFilePath = path.join(__dirname, 'products.json'); // Path to products.json

// Setup static directory to serve
app.use(express.static(publicDirectoryPath));

// --- API Routes ---

// Middleware to verify JWT and check for admin role
const isAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7, authHeader.length); // Extract token after "Bearer "
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error("JWT verification error:", err.message);
                return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
            }

            // Token is valid, check role
            if (decoded && decoded.role === 'admin') {
                req.user = decoded; // Attach decoded user info (including role) to request object
                next(); // User is admin, proceed
            } else {
                console.log("Access denied: User is not an admin. Role:", decoded ? decoded.role : 'undefined');
                res.status(403).json({ message: 'Forbidden: Access denied. Admin role required.' });
            }
        });
    } else {
        console.log("Access denied: No authorization header or not Bearer type.");
        res.status(401).json({ message: 'Unauthorized: No token provided or invalid format.' });
    }
};


// GET /api/products - Retrieve all products
app.get('/api/products', (req, res) => {
    fs.readFile(productsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading products file:', err);
            return res.status(500).json({ message: 'Failed to retrieve products.' });
        }
        try {
            const products = JSON.parse(data);
            res.status(200).json(products);
        } catch (parseError) {
            console.error('Error parsing products JSON:', parseError);
            res.status(500).json({ message: 'Failed to parse product data.' });
        }
    });
});


// --- API Routes for Authentication ---

// --- Admin Product CRUD Endpoints ---

// POST /api/admin/products - Add a new product (Admin only)
app.post('/api/admin/products', isAdmin, (req, res) => {
    try {
        const { name, category, price, description, imageUrl, stock } = req.body;

        // Basic validation
        if (!name || !category || !price || !stock) {
            return res.status(400).json({ message: 'Name, category, price, and stock are required.' });
        }
        if (isNaN(parseFloat(stock)) || !isFinite(stock) || parseInt(stock) < 0) {
            return res.status(400).json({ message: 'Stock must be a non-negative number.' });
        }

        fs.readFile(productsFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading products file for add:', err);
                return res.status(500).json({ message: 'Failed to access product data.' });
            }
            try {
                const products = JSON.parse(data);
                const newProduct = {
                    id: uuidv4(), // Generate unique ID
                    name,
                    category,
                    price, // Assuming price is a string like "₦15,500" as per existing JSON
                    description: description || '',
                    imageUrl: imageUrl || '/images/products/default-product.jpg',
                    stock: parseInt(stock)
                };
                products.push(newProduct);

                fs.writeFile(productsFilePath, JSON.stringify(products, null, 4), 'utf8', (writeErr) => {
                    if (writeErr) {
                        console.error('Error writing products file for add:', writeErr);
                        return res.status(500).json({ message: 'Failed to save new product.' });
                    }
                    res.status(201).json({ message: 'Product added successfully!', product: newProduct });
                });
            } catch (parseError) {
                console.error('Error parsing products JSON for add:', parseError);
                res.status(500).json({ message: 'Failed to parse product data.' });
            }
        });
    } catch (error) {
        console.error('Error in POST /api/admin/products:', error);
        res.status(500).json({ message: 'Server error while adding product.' });
    }
});

// DELETE /api/admin/products/:productId - Delete a product (Admin only)
app.delete('/api/admin/products/:productId', isAdmin, (req, res) => {
    try {
        const { productId } = req.params;

        fs.readFile(productsFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading products file for delete:', err);
                return res.status(500).json({ message: 'Failed to access product data.' });
            }
            try {
                let products = JSON.parse(data);
                const initialLength = products.length;
                products = products.filter(p => p.id !== productId);

                if (products.length === initialLength) {
                    return res.status(404).json({ message: 'Product not found for deletion.' });
                }

                fs.writeFile(productsFilePath, JSON.stringify(products, null, 4), 'utf8', (writeErr) => {
                    if (writeErr) {
                        console.error('Error writing products file for delete:', writeErr);
                        return res.status(500).json({ message: 'Failed to delete product.' });
                    }
                    res.status(200).json({ message: 'Product deleted successfully!' });
                });
            } catch (parseError) {
                console.error('Error parsing products JSON for delete:', parseError);
                res.status(500).json({ message: 'Failed to parse product data.' });
            }
        });
    } catch (error) {
        console.error('Error in DELETE /api/admin/products/:productId:', error);
        res.status(500).json({ message: 'Server error while deleting product.' });
    }
});

// PUT /api/admin/products/:productId - Update an existing product (Admin only)
app.put('/api/admin/products/:productId', isAdmin, (req, res) => {
    try {
        const { productId } = req.params;
        const { name, category, price, description, imageUrl, stock } = req.body;

        // Basic validation (at least one field to update should be present, or specific checks)
        if (!name && !category && !price && !description && !imageUrl && stock === undefined) {
            return res.status(400).json({ message: 'No update data provided.' });
        }
        if (stock !== undefined && (isNaN(parseFloat(stock)) || !isFinite(stock) || parseInt(stock) < 0)) {
            return res.status(400).json({ message: 'Stock must be a non-negative number.' });
        }

        fs.readFile(productsFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading products file for update:', err);
                return res.status(500).json({ message: 'Failed to access product data.' });
            }
            try {
                let products = JSON.parse(data);
                const productIndex = products.findIndex(p => p.id === productId);

                if (productIndex === -1) {
                    return res.status(404).json({ message: 'Product not found.' });
                }

                // Update fields if they are provided in the request body
                const updatedProduct = { ...products[productIndex] };
                if (name) updatedProduct.name = name;
                if (category) updatedProduct.category = category;
                if (price) updatedProduct.price = price;
                if (description) updatedProduct.description = description;
                if (imageUrl) updatedProduct.imageUrl = imageUrl;
                if (stock !== undefined) updatedProduct.stock = parseInt(stock);

                products[productIndex] = updatedProduct;

                fs.writeFile(productsFilePath, JSON.stringify(products, null, 4), 'utf8', (writeErr) => {
                    if (writeErr) {
                        console.error('Error writing products file for update:', writeErr);
                        return res.status(500).json({ message: 'Failed to update product.' });
                    }
                    res.status(200).json({ message: 'Product updated successfully!', product: updatedProduct });
                });
            } catch (parseError) {
                console.error('Error parsing products JSON for update:', parseError);
                res.status(500).json({ message: 'Failed to parse product data.' });
            }
        });
    } catch (error) {
        console.error('Error in PUT /api/admin/products/:productId:', error);
        res.status(500).json({ message: 'Server error while updating product.' });
    }
});


// POST /api/contact - Handle contact form submissions
app.post('/api/contact', (req, res) => {
    try {
        const { fullName, email, phone, subject, message } = req.body;

        // Basic validation
        if (!fullName || !email || !subject || !message) {
            return res.status(400).json({ message: 'Full name, email, subject, and message are required.' });
        }

        // For now, just log the data to the console
        // In a real application, you would:
        // 1. Send an email
        // 2. Save to a database
        // 3. Integrate with a CRM, etc.
        console.log('Contact Form Submission Received:');
        console.log('Full Name:', fullName);
        console.log('Email:', email);
        console.log('Phone:', phone || 'Not provided');
        console.log('Subject:', subject);
        console.log('Message:', message);

        res.status(200).json({ success: true, message: 'Your message has been received! We will get back to you shortly.' });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});


// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password }
 = req.body;

        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        // Check if user already exists
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10); // 10 is salt rounds

        // Create new user
        const newUser = {
            id: users.length + 1, // simple ID generation
            username,
            email,
            password: hashedPassword,
            role: users.length === 0 ? 'admin' : 'user' // First user is admin
        };
        users.push(newUser);

        console.log('User registered:', newUser.email, 'Role:', newUser.role); // Server log
        res.status(201).json({ message: 'User registered successfully!', userId: newUser.id });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Find user by email
        const user = users.find(user => user.email === email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials (email not found).' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials (password incorrect).' });
        }

        // User matched, create JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email, username: user.username, role: user.role }, // Added role to JWT
            JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        console.log('User logged in:', user.email, 'Role:', user.role); // Server log
        res.status(200).json({
            message: 'Login successful!',
            token,
            user: { id: user.id, email: user.email, username: user.username, role: user.role } // Added role to user object in response
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// Example of a protected route (you'd implement middleware for this)
// app.get('/api/profile', (req, res) => { ... });

// --- HTML Serving Routes ---
app.get('', (req, res) => {
    res.sendFile(path.join(viewsPath, 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'index.html'));
});

app.get('/about.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'about.html'));
});

app.get('/services.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'services.html'));
});

app.get('/shop.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'shop.html'));
});

app.get('/testimonials.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'testimonials.html'));
});

app.get('/contact.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'contact.html'));
});

app.get('/blog.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'blog.html'));
});

app.get('/blog-single-placeholder.html', (req, res) => {
    const blogPostPath = path.join(viewsPath, 'blog-single-placeholder.html');
    res.sendFile(blogPostPath, (err) => {
        if (err) {
            console.log("Error sending blog-single-placeholder.html:", err);
            res.status(404).send("Blog post not found (placeholder).");
        }
    });
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'login.html'));
});

app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'signup.html'));
});

app.get('/admin.html', (req, res) => {
    // Access to this page is indirectly controlled by whether the 'Admin Dashboard' link
    // is shown in the nav, which depends on client-side role check from JWT.
    // Actual admin *API endpoints* are protected by the `isAdmin` server-side middleware.
    res.sendFile(path.join(viewsPath, 'admin.html'));
});

app.get('/admin-products.html', (req, res) => {
    // Access control similar to admin.html
    res.sendFile(path.join(viewsPath, 'admin-products.html'));
});

// Basic 404 handler
app.get('*', (req, res) => {
    res.status(404).send('Page Not Found');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
