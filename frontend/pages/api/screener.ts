import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { tickers, filters } = req.body || {};
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001";
    const { data } = await axios.post(`${API_BASE_URL}/screener`, { tickers, filters }, { timeout: 120000 });
    res.status(200).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Screener error' });
  }
}


