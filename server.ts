import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILES = {
  users: path.join(__dirname, "users.json"),
  emisores: path.join(__dirname, "firebase-emisor-data.json"),
  clientes: path.join(__dirname, "firebase-cliente-data.json"),
  presupuestos: path.join(__dirname, "firebase-presupuesto-data.json"),
};

async function ensureDataFiles() {
  // Initialize users.json if it doesn't exist
  try {
    await fs.access(DATA_FILES.users);
  } catch {
    const initialUsers = [
      { username: "admin", password: "password123", role: "administrador" },
      { username: "carbatk", password: "login2025", role: "administrador" },
      { username: "user1", password: "user123", role: "operador" }
    ];
    await fs.writeFile(DATA_FILES.users, JSON.stringify(initialUsers, null, 2));
  }
}

async function readJson(file: string) {
  try {
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return {};
  }
}

async function writeJson(file: string, data: any) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

async function startServer() {
  await ensureDataFiles();
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- Auth Routes ---
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const users = await readJson(DATA_FILES.users);
    const user = users.find((u: any) => u.username === username && u.password === password);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "Credenciales inválidas" });
    }
  });

  app.get("/api/users", async (req, res) => {
    const users = await readJson(DATA_FILES.users);
    res.json(users);
  });

  app.post("/api/users", async (req, res) => {
    const newUser = req.body;
    const users = await readJson(DATA_FILES.users);
    if (users.find((u: any) => u.username === newUser.username)) {
      return res.status(400).json({ success: false, message: "El usuario ya existe" });
    }
    users.push(newUser);
    await writeJson(DATA_FILES.users, users);
    res.json({ success: true, users });
  });

  // --- Issuer (Emisor) Routes ---
  app.get("/api/issuer/:username", async (req, res) => {
    const { username } = req.params;
    const data = await readJson(DATA_FILES.emisores);
    // In this simple implementation, we might store emisores as an object keyed by username
    // or just search in an array. Let's use an object for easier lookup.
    const issuer = data.emisores_by_user?.[username] || data.emisores?.[0]; // Fallback to first one if not found
    res.json(issuer);
  });

  app.post("/api/issuer/:username", async (req, res) => {
    const { username } = req.params;
    const issuerData = req.body;
    const data = await readJson(DATA_FILES.emisores);
    if (!data.emisores_by_user) data.emisores_by_user = {};
    data.emisores_by_user[username] = issuerData;
    await writeJson(DATA_FILES.emisores, data);
    res.json({ success: true });
  });

  // --- Clients Routes ---
  app.get("/api/clients/:username", async (req, res) => {
    const { username } = req.params;
    const data = await readJson(DATA_FILES.clientes);
    // Filter clients by user if we had that field, for now return all or filter if possible
    // Let's assume clients are global or we add a owner field
    const userClients = Object.entries(data.clientes || {})
      .filter(([_, client]: [string, any]) => !client.owner || client.owner === username)
      .reduce((acc, [id, client]) => ({ ...acc, [id]: client }), {});
    res.json(userClients);
  });

  app.post("/api/clients/:username", async (req, res) => {
    const { username } = req.params;
    const clientData = req.body; // { id, ...data }
    const data = await readJson(DATA_FILES.clientes);
    if (!data.clientes) data.clientes = {};
    
    const id = clientData.id || `client-${Date.now()}`;
    data.clientes[id] = { ...clientData, owner: username };
    await writeJson(DATA_FILES.clientes, data);
    res.json({ success: true, id });
  });

  // --- Budgets Routes ---
  app.get("/api/budgets/:username", async (req, res) => {
    const { username } = req.params;
    const data = await readJson(DATA_FILES.presupuestos);
    const userBudgets = Object.entries(data.presupuestos || {})
      .filter(([_, budget]: [string, any]) => budget.metadata?.vendor === username)
      .reduce((acc, [id, budget]) => ({ ...acc, [id]: budget }), {});
    res.json(userBudgets);
  });

  app.post("/api/budgets/:username", async (req, res) => {
    const { username } = req.params;
    const budgetData = req.body;
    const data = await readJson(DATA_FILES.presupuestos);
    if (!data.presupuestos) data.presupuestos = {};
    
    const id = budgetData.id || `budget-${Date.now()}`;
    data.presupuestos[id] = { ...budgetData, metadata: { ...budgetData.metadata, vendor: username } };
    await writeJson(DATA_FILES.presupuestos, data);
    res.json({ success: true, id });
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
