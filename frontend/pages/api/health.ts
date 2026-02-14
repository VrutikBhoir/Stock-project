import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  status: string;
  timestamp: string;
  checks: {
    supabase_url?: string;
    dns_test?: {
      status: string;
      error?: string;
    };
    environment?: {
      supabase_url?: string;
      supabase_key_exists?: boolean;
    };
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const response: ResponseData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      supabase_url: supabaseUrl,
      environment: {
        supabase_url: supabaseUrl,
        supabase_key_exists: !!supabaseKey,
      },
    },
  };

  // Try to resolve Supabase URL
  if (supabaseUrl) {
    try {
      const dnsCheck = await fetch(supabaseUrl, {
        method: 'HEAD',
        timeout: 5000,
      }).catch((err) => {
        throw new Error(`Fetch failed: ${err.message}`);
      });

      response.checks.dns_test = {
        status: 'reachable',
      };
    } catch (err: any) {
      response.checks.dns_test = {
        status: 'unreachable',
        error: err.message,
      };
      response.status = 'warning';
    }
  }

  res.status(200).json(response);
}
