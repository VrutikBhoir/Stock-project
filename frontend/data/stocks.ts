export type InstrumentType = 'EQUITY' | 'ETF' | 'INDEX' | 'COMMODITY';
export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  instrumentType: InstrumentType;
  exchange?: 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE';
}

export const STOCKS: Stock[] = [
  // ─── Technology ───────────────────────────────────────────────────────────
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", instrumentType: "EQUITY", exchange: "NASDAQ" },
  { symbol: "MSFT", name: "Microsoft Corp.", sector: "Technology", instrumentType: "EQUITY", exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology", instrumentType: "EQUITY", exchange: "NASDAQ" },
  { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Technology", instrumentType: "EQUITY", exchange: "NASDAQ" },
  { symbol: "META", name: "Meta Platforms", sector: "Technology", instrumentType: "EQUITY", exchange: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Technology", instrumentType: "EQUITY", exchange: "NASDAQ" },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology", instrumentType: "EQUITY", exchange: "NASDAQ" },
  { symbol: "INTC", name: "Intel Corp.", sector: "Technology", instrumentType: "EQUITY", exchange: "NASDAQ" },
  { symbol: "ORCL", name: "Oracle Corp.", sector: "Technology", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "CRM", name: "Salesforce Inc.", sector: "Technology", instrumentType: "EQUITY", exchange: "NYSE" },
  // Indian IT
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "Technology", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "INFY", name: "Infosys Ltd.", sector: "Technology", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "WIPRO", name: "Wipro Ltd.", sector: "Technology", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "Technology", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "TECHM", name: "Tech Mahindra", sector: "Technology", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "LTIM", name: "LTIMindtree", sector: "Technology", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "MPHASIS", name: "Mphasis Ltd.", sector: "Technology", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "PERSISTENT", name: "Persistent Systems", sector: "Technology", instrumentType: "EQUITY", exchange: "NSE" },

  // ─── Banking ──────────────────────────────────────────────────────────────
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Banking", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "BAC", name: "Bank of America", sector: "Banking", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "GS", name: "Goldman Sachs", sector: "Banking", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "MS", name: "Morgan Stanley", sector: "Banking", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "WFC", name: "Wells Fargo", sector: "Banking", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "C", name: "Citigroup", sector: "Banking", instrumentType: "EQUITY", exchange: "NYSE" },
  // Indian Banks
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banking", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Banking", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", sector: "Banking", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "BANKBARODA", name: "Bank of Baroda", sector: "Banking", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "PNB", name: "Punjab National Bank", sector: "Banking", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "CANBK", name: "Canara Bank", sector: "Banking", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "IDFCFIRSTB", name: "IDFC First Bank", sector: "Banking", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "FEDERALBNK", name: "Federal Bank", sector: "Banking", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "YESBANK", name: "Yes Bank", sector: "Banking", instrumentType: "EQUITY", exchange: "NSE" },

  // ─── Healthcare ───────────────────────────────────────────────────────────
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "PFE", name: "Pfizer Inc.", sector: "Healthcare", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "UNH", name: "UnitedHealth Group", sector: "Healthcare", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "ABBV", name: "AbbVie Inc.", sector: "Healthcare", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "LLY", name: "Eli Lilly & Co.", sector: "Healthcare", instrumentType: "EQUITY", exchange: "NYSE" },
  // Indian Pharma
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Healthcare", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "DRREDDY", name: "Dr. Reddy's Labs", sector: "Healthcare", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "CIPLA", name: "Cipla Ltd.", sector: "Healthcare", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "DIVISLAB", name: "Divi's Laboratories", sector: "Healthcare", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals", sector: "Healthcare", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "AUROPHARMA", name: "Aurobindo Pharma", sector: "Healthcare", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "BIOCON", name: "Biocon Ltd.", sector: "Healthcare", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "LUPIN", name: "Lupin Ltd.", sector: "Healthcare", instrumentType: "EQUITY", exchange: "NSE" },

  // ─── Consumer ─────────────────────────────────────────────────────────────
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer", instrumentType: "EQUITY", exchange: "NASDAQ" },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "COST", name: "Costco Wholesale", sector: "Consumer", instrumentType: "EQUITY", exchange: "NASDAQ" },
  { symbol: "NKE", name: "Nike Inc.", sector: "Consumer", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "MCD", name: "McDonald's Corp.", sector: "Consumer", instrumentType: "EQUITY", exchange: "NYSE" },
  // Indian Consumer
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "Consumer", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "ITC", name: "ITC Ltd.", sector: "Consumer", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "NESTLEIND", name: "Nestle India", sector: "Consumer", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "BRITANNIA", name: "Britannia Industries", sector: "Consumer", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "DMART", name: "Avenue Supermarts (DMart)", sector: "Consumer", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "TATACONSUM", name: "Tata Consumer Products", sector: "Consumer", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "MARICO", name: "Marico Ltd.", sector: "Consumer", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "DABUR", name: "Dabur India", sector: "Consumer", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "COLPAL", name: "Colgate-Palmolive India", sector: "Consumer", instrumentType: "EQUITY", exchange: "NSE" },

  // ─── Energy ───────────────────────────────────────────────────────────────
  { symbol: "XOM", name: "ExxonMobil Corp.", sector: "Energy", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "CVX", name: "Chevron Corp.", sector: "Energy", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "COP", name: "ConocoPhillips", sector: "Energy", instrumentType: "EQUITY", exchange: "NYSE" },
  // Indian Energy
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "ONGC", name: "ONGC Ltd.", sector: "Energy", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "BPCL", name: "BPCL Ltd.", sector: "Energy", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "IOC", name: "Indian Oil Corp.", sector: "Energy", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "ADANIGREEN", name: "Adani Green Energy", sector: "Energy", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "TATAPOWER", name: "Tata Power", sector: "Energy", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "NTPC", name: "NTPC Ltd.", sector: "Energy", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "POWERGRID", name: "Power Grid Corp.", sector: "Energy", instrumentType: "EQUITY", exchange: "NSE" },

  // ─── Telecom ──────────────────────────────────────────────────────────────
  { symbol: "VZ", name: "Verizon Communications", sector: "Telecom", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "T", name: "AT&T Inc.", sector: "Telecom", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "TMUS", name: "T-Mobile US", sector: "Telecom", instrumentType: "EQUITY", exchange: "NASDAQ" },
  // Indian Telecom
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "IDEA", name: "Vodafone Idea", sector: "Telecom", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "TATACOMM", name: "Tata Communications", sector: "Telecom", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "ROUTE", name: "Route Mobile", sector: "Telecom", instrumentType: "EQUITY", exchange: "NSE" },

  // ─── Media & Entertainment ────────────────────────────────────────────────
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Media", instrumentType: "EQUITY", exchange: "NASDAQ" },
  { symbol: "DIS", name: "Walt Disney Co.", sector: "Media", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "SPOT", name: "Spotify Technology", sector: "Media", instrumentType: "EQUITY", exchange: "NYSE" },
  // Indian Media
  { symbol: "ZEEL", name: "Zee Entertainment", sector: "Media", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "SUNTV", name: "Sun TV Network", sector: "Media", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "NETWORK18", name: "Network18 Media", sector: "Media", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "PVRINOX", name: "PVR INOX Ltd.", sector: "Media", instrumentType: "EQUITY", exchange: "NSE" },

  // ─── Auto & EV ────────────────────────────────────────────────────────────
  { symbol: "F", name: "Ford Motor Co.", sector: "Auto", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "GM", name: "General Motors", sector: "Auto", instrumentType: "EQUITY", exchange: "NYSE" },
  { symbol: "RIVN", name: "Rivian Automotive", sector: "Auto", instrumentType: "EQUITY", exchange: "NASDAQ" },
  // Indian Auto
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "MARUTI", name: "Maruti Suzuki India", sector: "Auto", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", sector: "Auto", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "EICHERMOT", name: "Eicher Motors (RE)", sector: "Auto", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp", sector: "Auto", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "M&M", name: "Mahindra & Mahindra", sector: "Auto", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "ASHOKLEY", name: "Ashok Leyland", sector: "Auto", instrumentType: "EQUITY", exchange: "NSE" },

  // ─── Infrastructure & Conglomerate (India) ───────────────────────────────
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Infrastructure", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "ADANIPORTS", name: "Adani Ports & SEZ", sector: "Infrastructure", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Infrastructure", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", sector: "Infrastructure", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "GRASIM", name: "Grasim Industries", sector: "Infrastructure", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "DLF", name: "DLF Ltd.", sector: "Infrastructure", instrumentType: "EQUITY", exchange: "NSE" },

  // ─── Finance & NBFC (India) ───────────────────────────────────────────────
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Finance", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", sector: "Finance", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance", sector: "Finance", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "SBILIFE", name: "SBI Life Insurance", sector: "Finance", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "ICICIGI", name: "ICICI Lombard", sector: "Finance", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "MUTHOOTFIN", name: "Muthoot Finance", sector: "Finance", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "CHOLAFIN", name: "Cholamandalam Finance", sector: "Finance", instrumentType: "EQUITY", exchange: "NSE" },

  // ─── Market Indices ───────────────────────────────────────────────────────
  { symbol: "^NSEI", name: "NIFTY 50", sector: "Market Index", instrumentType: "INDEX", exchange: "NSE" },
  { symbol: "^BSESN", name: "SENSEX", sector: "Market Index", instrumentType: "INDEX", exchange: "BSE" },
  // ─── ETFs / Commodities ────────────────────────────────────────────────────
  {symbol: "TATAGOLD.NS", name: "Tata Gold ETF", sector: "Commodities",  instrumentType: "ETF", exchange: "NSE"},
  //------Cryptocurrencies (Indian Exchanges) ───────────────────────────────────────────────
  { symbol: "BTC-INR", name: "Bitcoin (BTC/INR)", sector: "Cryptocurrency", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "ETH-INR", name: "Ethereum (ETH/INR)", sector: "Cryptocurrency", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "XRP-INR", name: "Ripple (XRP/INR)", sector: "Cryptocurrency", instrumentType: "EQUITY", exchange: "NSE" },
  { symbol: "LTC-INR", name: "Litecoin (LTC/INR)", sector: "Cryptocurrency", instrumentType: "EQUITY", exchange: "NSE" },
  {symbol:"BTC-USD", name:"Bitcoin (BTC/USD)", sector:"Cryptocurrency", instrumentType:"EQUITY", exchange:"NASDAQ"},
  {symbol:"ETH-USD", name:"Ethereum (ETH/USD)", sector:"Cryptocurrency", instrumentType:"EQUITY", exchange:"NASDAQ"},
  {symbol:"SOL-USD", name:"Solana (SOL/USD)", sector:"Cryptocurrency", instrumentType:"EQUITY", exchange:"NASDAQ"},
];