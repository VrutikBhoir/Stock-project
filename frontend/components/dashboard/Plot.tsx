import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
function calculateBollingerBands(
  prices: number[],
  period = 20,
  multiplier = 2
) {
  const upper: number[] = [];
  const lower: number[] = [];
  const middle: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      upper.push(null as any);
      lower.push(null as any);
      middle.push(null as any);
      continue;
    }

    const slice = prices.slice(i - period, i);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance =
      slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const std = Math.sqrt(variance);

    middle.push(mean);
    upper.push(mean + multiplier * std);
    lower.push(mean - multiplier * std);
  }

  return { upper, lower, middle };
}

// Dynamically import Plotly for better performance (code splitting)
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false, // Disable server-side rendering for Plotly
  loading: () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '400px',
      color: '#888'
    }}>
      Loading chart...
    </div>
  ),
});

interface EnhancedPlotProps {
  data: any[];
  layout?: Partial<Plotly.Layout>;
  config?: Partial<Plotly.Config>;
  useResponsiveWidth?: boolean;
  darkMode?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function EnhancedPlot({
  data,
  layout = {},
  config = {},
  useResponsiveWidth = true,
  darkMode = true,
  className = '',
  style = {},
}: EnhancedPlotProps) {
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(darkMode ? 'dark' : 'light');

  // Sync with global theme from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeMode(savedTheme);
      }
    } catch {}
  }, []);

  // Dark theme configuration for Plotly
  const darkThemeLayout: Partial<Plotly.Layout> = {
    paper_bgcolor: '#111',
    plot_bgcolor: '#1a1a1a',
    font: {
      color: '#ddd',
      family: 'system-ui, -apple-system, sans-serif',
    },
    xaxis: {
      gridcolor: '#333',
      linecolor: '#444',
      tickcolor: '#444',
      zerolinecolor: '#444',
    },
    yaxis: {
      gridcolor: '#333',
      linecolor: '#444',
      tickcolor: '#444',
      zerolinecolor: '#444',
    },
    hovermode: 'closest',
    hoverlabel: {
      bgcolor: '#222',
      bordercolor: '#4ade80',
      font: { color: '#fff' },
    },
  };

  // Light theme configuration
  const lightThemeLayout: Partial<Plotly.Layout> = {
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#f9f9f9',
    font: {
      color: '#333',
      family: 'system-ui, -apple-system, sans-serif',
    },
    xaxis: {
      gridcolor: '#e5e5e5',
      linecolor: '#ccc',
      tickcolor: '#ccc',
      zerolinecolor: '#ccc',
    },
    yaxis: {
      gridcolor: '#e5e5e5',
      linecolor: '#ccc',
      tickcolor: '#ccc',
      zerolinecolor: '#ccc',
    },
  };

  // Performance optimization configuration
  const optimizedConfig: Partial<Plotly.Config> = {
    responsive: useResponsiveWidth,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: 'stock_chart',
      height: 1080,
      width: 1920,
      scale: 2,
    },
    ...config,
  };

  // Merge theme with user layout
  const finalLayout: Partial<Plotly.Layout> = {
    ...(themeMode === 'dark' ? darkThemeLayout : lightThemeLayout),
    autosize: true,
    margin: { l: 50, r: 30, t: 50, b: 50 },
    ...layout,
    xaxis: {
  ...((themeMode === 'dark' ? darkThemeLayout.xaxis : lightThemeLayout.xaxis) || {}),
  rangeslider: { visible: false },
  showspikes: true,
  spikemode: 'across',
  spikesnap: 'cursor',
  showline: true,
},

yaxis: {
  ...((themeMode === 'dark' ? darkThemeLayout.yaxis : lightThemeLayout.yaxis) || {}),
  fixedrange: false,
  showspikes: true,
  spikemode: 'across',
},

  };

  // Optimize data for large datasets (downsampling for >10k points)
  const optimizedData = data.map((trace) => {
    if (trace.x && trace.x.length > 10000) {
      // Use scattergl for better performance with large datasets
      return {
        ...trace,
        type: trace.type || 'scattergl',
        mode: trace.mode || 'lines',
      };
    }
    return trace;
  });

  return (
    <div className={className} style={{ width: '100%', ...style }}>
      <Plot
        data={optimizedData}
        layout={finalLayout}
        config={optimizedConfig}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
      />
    </div>
  );
}

// Separate lightweight component for basic usage (backward compatible)
