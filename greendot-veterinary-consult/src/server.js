const express = require('express');
const path = require('path');
const fs = require('fs'); // Added File System module
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
const users = []; // Stores { id, username, email, password (hashed) }

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
            password: hashedPassword
        };
        users.push(newUser);

        console.log('User registered:', newUser.email); // Server log
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
            { userId: user.id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        console.log('User logged in:', user.email); // Server log
        res.status(200).json({
            message: 'Login successful!',
            token,
            user: { id: user.id, email: user.email, username: user.username }
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

// Basic 404 handler
app.get('*', (req, res) => {
    res.status(404).send('Page Not Found');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
