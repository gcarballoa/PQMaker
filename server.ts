import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "db.json");

// Initial DB state
const initialDb = {
  issuers: {},
  budgets: {}
};

// Helper to read/write DB
function getDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveDb(db: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  
  // Get Issuer for user
  app.get("/api/issuer/:username", (req, res) => {
    const { username } = req.params;
    const db = getDb();
    const issuer = db.issuers[username] || null;
    res.json(issuer);
  });

  // Save Issuer for user
  app.post("/api/issuer/:username", (req, res) => {
    const { username } = req.params;
    const issuerData = req.body;
    const db = getDb();
    db.issuers[username] = issuerData;
    saveDb(db);
    res.json({ success: true });
  });

  // Get Budgets for user
  app.get("/api/budgets/:username", (req, res) => {
    const { username } = req.params;
    const db = getDb();
    const budgets = db.budgets[username] || [];
    res.json(budgets);
  });

  // Save Budget for user
  app.post("/api/budgets/:username", (req, res) => {
    const { username } = req.params;
    const budget = req.body;
    const db = getDb();
    
    if (!db.budgets[username]) {
      db.budgets[username] = [];
    }
    
    // If it has an ID and exists, update it, otherwise add new
    const existingIndex = db.budgets[username].findIndex((b: any) => b.id === budget.id);
    if (existingIndex > -1) {
      db.budgets[username][existingIndex] = { ...budget, updatedAt: new Date().toISOString() };
    } else {
      db.budgets[username].push({ 
        ...budget, 
        id: budget.id || Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    saveDb(db);
    res.json({ success: true, budget });
  });

  // Delete Budget
  app.delete("/api/budgets/:username/:id", (req, res) => {
    const { username, id } = req.params;
    const db = getDb();
    if (db.budgets[username]) {
      db.budgets[username] = db.budgets[username].filter((b: any) => b.id !== id);
      saveDb(db);
    }
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
