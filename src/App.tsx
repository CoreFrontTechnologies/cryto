/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Clock, 
  Activity, 
  ShieldAlert,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { Prices, Sentiment, PredictionResult } from "./types";
import { getPrediction } from "./services/geminiService";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

const ASSETS = ["BTC", "ETH", "SOL", "BNB"];
const ASSET_COLORS: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  SOL: "#14F195",
  BNB: "#F3BA2F"
};

export default function App() {
  const [prices, setPrices] = useState<Prices | null>(null);
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [predictions, setPredictions] = useState<Record<string, PredictionResult>>({});
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState<string | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<string[]>(["BTC"]);
  const [chartData, setChartData] = useState<any[]>([]);

  const fetchHistory = async (symbols: string[]) => {
    try {
      const results = await Promise.all(
        symbols.map(async (symbol) => {
          const res = await fetch(`/api/history/${symbol}`);
          const data = await res.json();
          return { symbol, data: data.reverse() };
        })
      );

      // Merge data by timestamp
      // For simplicity, we'll assume timestamps align closely or just use the index if they are fetched at same intervals
      // A better way is to group by a rounded timestamp
      const merged: Record<string, any> = {};
      results.forEach(({ symbol, data }) => {
        data.forEach((item: any) => {
          const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          if (!merged[time]) merged[time] = { timestamp: time };
          merged[time][symbol] = item.price;
        });
      });

      setChartData(Object.values(merged));
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [priceRes, sentRes] = await Promise.all([
        fetch("/api/prices"),
        fetch("/api/sentiment")
      ]);
      const priceData = await priceRes.json();
      const sentData = await sentRes.json();
      setPrices(priceData);
      setSentiment(sentData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchHistory(selectedAssets);
  }, [selectedAssets]);

  const toggleAsset = (symbol: string) => {
    setSelectedAssets(prev => {
      if (prev.includes(symbol)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(s => s !== symbol);
      }
      return [...prev, symbol];
    });
  };

  const handlePredict = async (symbol: string) => {
    if (!prices || !sentiment) return;
    setPredicting(symbol);
    try {
      const result = await getPrediction(symbol, prices, sentiment);
      setPredictions(prev => ({ ...prev, [symbol]: result }));
    } catch (error) {
      console.error("Prediction failed:", error);
    } finally {
      setPredicting(null);
    }
  };

  const primaryAsset = selectedAssets[selectedAssets.length - 1];

  if (loading && !prices) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm tracking-widest uppercase opacity-50">Initializing Market Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E1E1E1] font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0D0D0E]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="text-black w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">CRYPTOPREDICT <span className="text-emerald-500">DAILY</span></h1>
          </div>
          <div className="flex items-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-2 opacity-60">
              <Clock className="w-3.5 h-3.5" />
              <span>TARGET: 23:59 UTC</span>
            </div>
            <button 
              onClick={fetchData}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Assets & Sentiment */}
        <div className="lg:col-span-4 space-y-6">
          {/* Sentiment Widget */}
          <section className="bg-[#121214] border border-white/5 rounded-2xl p-6 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShieldAlert className="w-24 h-24" />
            </div>
            <h2 className="text-xs font-mono uppercase tracking-widest opacity-50 mb-4">Market Sentiment</h2>
            <div className="flex items-end gap-4">
              <div className="text-5xl font-mono font-bold text-emerald-500">
                {sentiment?.value}
              </div>
              <div className="pb-1">
                <div className="text-sm font-medium text-white">{sentiment?.classification}</div>
                <div className="text-[10px] font-mono opacity-40 uppercase">Fear & Greed Index</div>
              </div>
            </div>
            <div className="mt-6 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${sentiment?.value}%` }}
                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500"
              />
            </div>
          </section>

          {/* Asset List */}
          <section className="space-y-3">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-xs font-mono uppercase tracking-widest opacity-50">Tracked Assets</h2>
              <span className="text-[10px] opacity-30 font-mono">MULTI-SELECT ENABLED</span>
            </div>
            {ASSETS.map((symbol) => (
              <button
                key={symbol}
                onClick={() => toggleAsset(symbol)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between group ${
                  selectedAssets.includes(symbol) 
                    ? 'bg-emerald-500/10 border-emerald-500/50' 
                    : 'bg-[#121214] border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs"
                    style={{ 
                      backgroundColor: selectedAssets.includes(symbol) ? ASSET_COLORS[symbol] : 'rgba(255,255,255,0.05)',
                      color: selectedAssets.includes(symbol) ? 'black' : 'white'
                    }}
                  >
                    {symbol}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{symbol === 'BTC' ? 'Bitcoin' : symbol === 'ETH' ? 'Ethereum' : symbol === 'SOL' ? 'Solana' : 'BNB Chain'}</div>
                    <div className="text-[10px] font-mono opacity-40">{symbol}/USD</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold">
                    ${prices?.[symbol]?.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className={`text-[10px] font-mono flex items-center justify-end gap-1 ${
                    (prices?.[symbol]?.change24h || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {(prices?.[symbol]?.change24h || 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(prices?.[symbol]?.change24h || 0).toFixed(2)}%
                  </div>
                </div>
              </button>
            ))}
          </section>
        </div>

        {/* Right Column: Analysis & Prediction */}
        <div className="lg:col-span-8 space-y-8">
          {/* Main Chart/Analysis Area */}
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-8 min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  {selectedAssets.length > 1 ? "Market Comparison" : `${primaryAsset} Analysis`}
                  <span className="text-xs font-mono font-normal opacity-40 bg-white/5 px-2 py-1 rounded">LIVE</span>
                </h2>
                <p className="text-sm opacity-50 mt-1">
                  {selectedAssets.length > 1 
                    ? `Comparing ${selectedAssets.join(", ")} price action.` 
                    : `Daily prediction model for ${primaryAsset} tonight's close.`}
                </p>
              </div>
              <button
                onClick={() => handlePredict(primaryAsset)}
                disabled={predicting === primaryAsset}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                {predicting === primaryAsset ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                PREDICT {primaryAsset}
              </button>
            </div>

            {/* Chart */}
            <div className="h-64 w-full mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#ffffff20" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    hide 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#121214', border: '1px solid #ffffff10', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ fontSize: '10px', opacity: 0.5, marginBottom: '4px' }}
                  />
                  {selectedAssets.map(symbol => (
                    <Line 
                      key={symbol}
                      type="monotone" 
                      dataKey={symbol} 
                      stroke={ASSET_COLORS[symbol]} 
                      strokeWidth={2} 
                      dot={false} 
                      animationDuration={1000}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {selectedAssets.map(symbol => (
                  <div key={symbol} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_COLORS[symbol] }} />
                    <span className="text-[10px] font-mono opacity-40 uppercase">{symbol}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prediction Result Display */}
            <AnimatePresence mode="wait">
              {predictions[primaryAsset] ? (
                <motion.div
                  key={primaryAsset + "-pred"}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 flex-1"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                      <div className="text-[10px] font-mono opacity-40 uppercase mb-2">Predicted Price ({primaryAsset})</div>
                      <div className="text-3xl font-mono font-bold text-emerald-500">
                        ${predictions[primaryAsset].predictedPrice.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                      <div className="text-[10px] font-mono opacity-40 uppercase mb-2">Confidence Score</div>
                      <div className="text-3xl font-mono font-bold text-white">
                        {predictions[primaryAsset].confidence}%
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                      <div className="text-[10px] font-mono opacity-40 uppercase mb-2">Probability Range</div>
                      <div className="text-sm font-mono font-bold">
                        ${predictions[primaryAsset].probabilityRange.low.toLocaleString()} - ${predictions[primaryAsset].probabilityRange.high.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-emerald-500 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      AI Reasoning & Market Context
                    </h3>
                    <p className="text-sm leading-relaxed opacity-80 italic">
                      "{predictions[primaryAsset].reasoning}"
                    </p>
                  </div>

                  {/* Visual Probability Meter */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono opacity-40 uppercase">
                      <span>Bearish Zone</span>
                      <span>Target Probability</span>
                      <span>Bullish Zone</span>
                    </div>
                    <div className="h-12 bg-white/5 rounded-xl relative overflow-hidden flex items-center px-4">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-emerald-500/10 to-blue-500/10" />
                      <motion.div 
                        initial={{ left: "0%" }}
                        animate={{ left: `${predictions[primaryAsset].confidence}%` }}
                        className="absolute w-1 h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                      />
                      <div className="w-full flex justify-between relative z-10 text-[10px] font-mono opacity-20">
                        <span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span><span>|</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                  <Brain className="w-16 h-16 mb-4" />
                  <p className="max-w-xs text-sm">Select assets and run the AI prediction model to see tonight's price forecast for {primaryAsset}.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-yellow-500" />
                Risk Assessment
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="opacity-50">Volatility (24h)</span>
                  <span className="font-mono text-emerald-500">Medium</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="opacity-50">Liquidity Score</span>
                  <span className="font-mono text-emerald-500">High</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="opacity-50">Market Dominance</span>
                  <span className="font-mono">52.4%</span>
                </div>
              </div>
            </div>
            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Time to Target
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-2xl font-mono font-bold">
                    {Math.floor((new Date(new Date().setHours(23, 59, 0, 0)).getTime() - new Date().getTime()) / (1000 * 60 * 60))}h {Math.floor(((new Date(new Date().setHours(23, 59, 0, 0)).getTime() - new Date().getTime()) / (1000 * 60)) % 60)}m
                  </div>
                  <div className="text-[10px] font-mono opacity-40 uppercase">Remaining until 11:59 PM</div>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-white/5 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono opacity-30 uppercase tracking-widest">
          <div>© 2026 CRYPTOPREDICT ENGINE V4.2</div>
          <div className="flex gap-8">
            <span>Latency: 42ms</span>
            <span>API: CoinGecko + Alternative.me</span>
            <span>Model: Gemini 3 Flash</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
