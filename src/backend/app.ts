import express from "express";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isNetlify = !!process.env.NETLIFY;
// Netlify functions only have write access to /tmp
const dbPath = isNetlify ? "/tmp/crypto_predictions.db" : "crypto_predictions.db";

const db = new Database(dbPath);

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT,
    price REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sentiment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value INTEGER,
    classification TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const app = express();
app.use(express.json());

// API Routes
app.get("/api/prices", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd&include_24hr_change=true"
    );
    const data = await response.json();
    
    const prices = {
      BTC: { price: data.bitcoin.usd, change24h: data.bitcoin.usd_24h_change },
      ETH: { price: data.ethereum.usd, change24h: data.ethereum.usd_24h_change },
      SOL: { price: data.solana.usd, change24h: data.solana.usd_24h_change },
      BNB: { price: data.binancecoin.usd, change24h: data.binancecoin.usd_24h_change },
    };

    const stmt = db.prepare("INSERT INTO price_history (symbol, price) VALUES (?, ?)");
    Object.entries(prices).forEach(([symbol, info]) => {
      stmt.run(symbol, info.price);
    });

    res.json(prices);
  } catch (error) {
    console.error("Error fetching prices:", error);
    res.status(500).json({ error: "Failed to fetch prices" });
  }
});

app.get("/api/sentiment", async (req, res) => {
  try {
    const response = await fetch("https://api.alternative.me/fng/");
    const data = await response.json();
    const sentiment = data.data[0];
    
    db.prepare("INSERT INTO sentiment_history (value, classification) VALUES (?, ?)")
      .run(sentiment.value, sentiment.value_classification);

    res.json({
      value: parseInt(sentiment.value),
      classification: sentiment.value_classification,
      timestamp: sentiment.timestamp
    });
  } catch (error) {
    console.error("Error fetching sentiment:", error);
    res.status(500).json({ error: "Failed to fetch sentiment" });
  }
});

app.get("/api/history/:symbol", (req, res) => {
  const { symbol } = req.params;
  const history = db.prepare("SELECT price, timestamp FROM price_history WHERE symbol = ? ORDER BY timestamp DESC LIMIT 100")
    .all(symbol.toUpperCase());
  res.json(history);
});

export { app };
