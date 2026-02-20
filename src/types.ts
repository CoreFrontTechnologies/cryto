export interface CryptoPrice {
  price: number;
  change24h: number;
}

export interface Prices {
  [key: string]: CryptoPrice;
}

export interface Sentiment {
  value: number;
  classification: string;
  timestamp: string;
}

export interface HistoryItem {
  price: number;
  timestamp: string;
}

export interface PredictionResult {
  symbol: string;
  predictedPrice: number;
  confidence: number;
  reasoning: string;
  probabilityRange: {
    low: number;
    high: number;
  };
}
