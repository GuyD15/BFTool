const sqlite3 = require("sqlite3").verbose();

// Open the database (creates a file named training.db)
const db = new sqlite3.Database("training.db");

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY,
            title TEXT,
            content TEXT,
            parent_id INTEGER
        )
    `);
    console.log("Database initialized successfully.");
});

db.close();
