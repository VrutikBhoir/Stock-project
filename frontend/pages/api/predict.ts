import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { symbol, steps = '10', investment_horizon = 'medium_term' } = req.query;

    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ error: 'Symbol parameter is required' });
    }

    console.log(`[API] Proxying predict request for ${symbol} to backend...`);

    const { data } = await axios.get(
      `http://127.0.0.1:8001/api/predict/${symbol}`,
      {
        params: {
          steps: parseInt(steps as string) || 10,
          investment_horizon: investment_horizon as string,
        },
        timeout: 120000,
      }
    );

    return res.status(200).json(data);
  } catch (e: any) {
    console.error('[API] Predict API error:', e.message);

    if (e.response?.status === 404) {
      return res.status(404).json({
        detail: e.response?.data?.detail || `Symbol not found or unable to fetch data`,
      });
    }

    return res.status(e.response?.status || 500).json({
      detail: e.response?.data?.detail || e.message || 'Prediction API error',
    });
  }
}