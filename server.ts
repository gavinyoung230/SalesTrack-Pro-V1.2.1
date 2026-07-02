import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
const PORT = 3000;

app.use(cors()); // Allow CORS for Electron app connection support
app.use(express.json());

// Flat File DB persistence path
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'db.json');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

interface UserAccount {
  email: string;
  pass: string;
  role: 'user' | 'admin';
}

interface UserDataStore {
  orders: any[];
  expenses: any[];
}

interface DBStructure {
  users: UserAccount[];
  userdata: { [email: string]: UserDataStore };
}

// Initial/default Database seed
const defaultDB: DBStructure = {
  users: [
    { email: 'admin', pass: 'admin', role: 'admin' },
    { email: 'gs3dprintingandlaserengraving@gmail.com', pass: 'admin123', role: 'user' },
    { email: 'operator@salestrackpro.io', pass: 'operator99', role: 'user' }
  ],
  userdata: {}
};

// Seed if db.json doesn't exist
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2));
}

// Helper to read DB safely
function readDB(): DBStructure {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("DB reading failed", e);
  }
  return defaultDB;
}

// Helper to write DB safely
function writeDB(db: DBStructure) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("DB saving failed", e);
  }
}

// API Routes
app.post("/api/chatbot", async (req, res) => {
  try {
    const { message, history, categories, orders, expenses } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message content is required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY environment variable is not defined. Please add your key in the Secrets panel." 
      });
    }

    // Prepare system instruction with the real-time business context provided by the app
    const systemInstruction = `You are SalesTrack Pro Assistant, a highly intelligent and helpful business companion.
You have real-time access to the user's business ledger currently open in SalesTrack Pro.
Your job is to answer the user's questions about their categories, orders, sales performance, and expenses correctly, using only the provided facts.

Here is the current real-time application data:
1. CATEGORIES AVAILABLE: ${JSON.stringify(categories || [])}
2. SALES/ORDERS LEDGER: ${JSON.stringify((orders || []).map((o: any) => ({
      id: o.id,
      customerName: o.customerName,
      date: o.date,
      product: o.product,
      amount: o.amount,
      status: o.status,
      category: o.category || 'Uncategorized'
    })))}
3. OVERHEAD EXPENSES LEDGER: ${JSON.stringify((expenses || []).map((e: any) => ({
      id: e.id,
      date: e.date,
      category: e.category || 'Uncategorized',
      description: e.description,
      amount: e.amount
    })))}

Guidelines to formulate answers:
- Provide exact information from the lists. Analyze sales, expenses, or categories, and summarize them when asked.
- Avoid any speculation or hallucination. If some details are absent, mention that.
- Keep responses friendly, professional, clear, and action-oriented.
- Use clean Markdown and list format to make answers scannable.
- Highlight specific IDs, amounts, and statuses in monospaced blocks (e.g. \`ORD-1002\`, \`$120.00\`).
- If asked unrelated questions, answer nicely, then redirect back to their SalesTrack Pro helper tasks.
`;

    // Map history to the required format if history is provided
    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content || msg.text || "" }]
    }));

    // Add the current user query to the contents
    const contents = [
      ...formattedHistory,
      { role: "user", parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.25,
      },
    });

    const reply = response.text || "I am sorry, but I was not able to generate a response at this moment.";
    res.json({ text: reply });
  } catch (error: any) {
    console.error("Gemini Assistant Route Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error occurred when querying the AI assistant." });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const formattedEmail = String(email || '').trim().toLowerCase();
  
  const user = db.users.find(u => u.email.toLowerCase() === formattedEmail);
  
  if (!user) {
    return res.status(401).json({ error: "No registered account was found with this email/username." });
  }
  
  if (user.pass !== password) {
    return res.status(401).json({ error: "Incorrect security passkey. Please verify credentials." });
  }
  
  res.json({ email: user.email, role: user.role });
});

app.post("/api/auth/register", (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const formattedEmail = String(email || '').trim().toLowerCase();
  
  if (!formattedEmail || !password) {
    return res.status(400).json({ error: "Email/login and password are required." });
  }
  
  const exists = db.users.some(u => u.email.toLowerCase() === formattedEmail);
  if (exists) {
    return res.status(409).json({ error: "An account with this email/login is already registered." });
  }
  
  db.users.push({
    email: formattedEmail,
    pass: password,
    role: 'user'
  });
  
  writeDB(db);
  res.json({ success: true, email: formattedEmail });
});

// Sync data (Get or Save user-specific ledger)
app.get("/api/userdata", (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: "Email parameter required" });
  }
  
  const db = readDB();
  const data = db.userdata[email] || { orders: [], expenses: [] };
  res.json(data);
});

app.post("/api/userdata", (req, res) => {
  const { email, orders, expenses } = req.body;
  const formattedEmail = String(email || '').trim().toLowerCase();
  if (!formattedEmail) {
    return res.status(400).json({ error: "Email is required" });
  }
  
  const db = readDB();
  db.userdata[formattedEmail] = {
    orders: orders || [],
    expenses: expenses || []
  };
  
  writeDB(db);
  res.json({ success: true });
});

// Admin APIs (View & edit accounts)
app.get("/api/admin/users", (req, res) => {
  const db = readDB();
  const summary = db.users.map(u => {
    const data = db.userdata[u.email.toLowerCase()] || { orders: [], expenses: [] };
    return {
      email: u.email,
      pass: u.pass,
      role: u.role,
      ordersCount: data.orders.length,
      expensesCount: data.expenses.length
    };
  });
  res.json(summary);
});

app.post("/api/admin/users/update", (req, res) => {
  const { email, pass, role } = req.body;
  const db = readDB();
  const formattedEmail = String(email || '').trim().toLowerCase();
  
  const idx = db.users.findIndex(u => u.email.toLowerCase() === formattedEmail);
  if (idx === -1) {
    return res.status(404).json({ error: "User not found" });
  }
  
  db.users[idx].pass = pass !== undefined ? pass : db.users[idx].pass;
  db.users[idx].role = role !== undefined ? role : db.users[idx].role;
  
  writeDB(db);
  res.json({ success: true });
});

app.post("/api/admin/users/create", (req, res) => {
  const { email, pass, role } = req.body;
  const db = readDB();
  const formattedEmail = String(email || '').trim().toLowerCase();
  
  if (!formattedEmail || !pass) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  
  const exists = db.users.some(u => u.email.toLowerCase() === formattedEmail);
  if (exists) {
    return res.status(400).json({ error: "Email/login already exists" });
  }
  
  db.users.push({
    email: formattedEmail,
    pass,
    role: role || 'user'
  });
  
  writeDB(db);
  res.json({ success: true });
});

app.post("/api/admin/users/delete", (req, res) => {
  const { email } = req.body;
  const db = readDB();
  const formattedEmail = String(email || '').trim().toLowerCase();
  
  if (formattedEmail === 'admin') {
    return res.status(400).json({ error: "Cannot delete the primary admin account" });
  }
  
  db.users = db.users.filter(u => u.email.toLowerCase() !== formattedEmail);
  delete db.userdata[formattedEmail];
  
  writeDB(db);
  res.json({ success: true });
});

app.post("/api/admin/userdata/save", (req, res) => {
  const { email, orders, expenses } = req.body;
  const formattedEmail = String(email || '').trim().toLowerCase();
  if (!formattedEmail) {
    return res.status(400).json({ error: "Email is required" });
  }
  const db = readDB();
  db.userdata[formattedEmail] = {
    orders: orders || [],
    expenses: expenses || []
  };
  writeDB(db);
  res.json({ success: true });
});

// Vite server connection middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening at http://localhost:${PORT}`);
  });
}

startServer();
