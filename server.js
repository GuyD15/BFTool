require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the root directory (for index.html and style.css)
app.use(express.static(__dirname));

// Serve static files from the src directory (for app.js)
app.use('/src', express.static(path.join(__dirname, 'src')));

// MySQL Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

// Middleware to authenticate admin token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];
    
    if (!token) return res.sendStatus(401); // Unauthorized if token is missing

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden if token is invalid
        req.user = user;
        next();
    });
}

// Admin login endpoint
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.query("SELECT * FROM admins WHERE username = ?", [username], async (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database error" });
        }
        if (results.length === 0 || !(await bcrypt.compare(password, results[0].password))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ username: results[0].username }, process.env.SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    });
});

// Get all main pages with their subpages (accessible to all users)
app.get("/pages", (req, res) => {
    db.query("SELECT * FROM pages WHERE parent_id IS NULL", (err, mainPages) => {
        if (err) {
            console.error("Error fetching main pages:", err);
            return res.status(500).send(err);
        }

        const promises = mainPages.map(page => {
            return new Promise((resolve, reject) => {
                db.query("SELECT * FROM pages WHERE parent_id = ?", [page.id], (err, subpages) => {
                    if (err) reject(err);
                    else {
                        page.subpages = subpages || []; // Ensure subpages is an empty array if no subpages exist
                        resolve(page);
                    }
                });
            });
        });

        Promise.all(promises)
            .then(pagesWithSubpages => {
                console.log("Fetched pages with subpages:", JSON.stringify(pagesWithSubpages, null, 2));// Log to confirm structure
                res.json(pagesWithSubpages);
            })
            .catch(err => {
                console.error("Error fetching subpages:", err);
                res.status(500).send(err);
            });
    });
});

// Add a new page or subpage (admin-only)
app.post("/pages", authenticateToken, (req, res) => {
    const { title, content, parent_id = null } = req.body;

    // Log the incoming data to confirm it's received correctly
    console.log("Received new page data:", { title, content, parent_id });

    db.query("INSERT INTO pages (title, content, parent_id) VALUES (?, ?, ?)", [title, content, parent_id], (err, result) => {
        if (err) {
            console.error("Error inserting page:", err); // Log database error
            return res.status(500).send({ message: "Database insertion error", error: err });
        }
        res.json({ id: result.insertId, title, content, parent_id });
    });
});

// Update a page or subpage (admin-only)
app.put("/pages/:id", authenticateToken, (req, res) => {
    const { title, content } = req.body;
    const { id } = req.params;
    db.query("UPDATE pages SET title = ?, content = ? WHERE id = ?", [title, content, id], (err) => {
        if (err) {
            console.error("Error updating page:", err);
            return res.status(500).send(err);
        }
        res.json({ id, title, content });
    });
});

// Delete a page or subpage (admin-only)
app.delete("/pages/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM pages WHERE id = ?", [id], (err) => {
        if (err) {
            console.error("Error deleting page:", err);
            return res.status(500).send(err);
        }
        res.json({ message: "Page deleted successfully" });
    });
});

// Serve the main index.html file for all other routes
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});