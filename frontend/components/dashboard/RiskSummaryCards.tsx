export default function RiskSummaryCards({ stats, riskConfidence }: any) {
  const averageActual = Number(stats.average_actual) || 0;
  const averagePredicted = Number(stats.average_predicted) || 0;
  const meanAbsError = Number(stats.mean_absolute_error) || 0;

  const errorPct = averageActual
    ? (meanAbsError / averageActual) * 100
    : 0;

  const confidenceByRisk = riskConfidence || {
    low: 40,
    medium: 40,
    high: 40
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
      <div className="card">
        <h4>Avg Actual</h4>
        <p>₹{averageActual.toFixed(0)}</p>
      </div>
      <div className="card">
        <h4>Avg Predicted</h4>
        <p>₹{averagePredicted.toFixed(0)}</p>
      </div>
      <div className="card">
        <h4 title="Average deviation between AI predictions and real market prices.">Prediction Error</h4>
        <p>±{errorPct.toFixed(0)}%</p>
      </div>
      <div className="card">
        <h4>Risk Confidence</h4>
        <p>Low: {confidenceByRisk.low.toFixed(0)}%</p>
        <p>Medium: {confidenceByRisk.medium.toFixed(0)}%</p>
        <p>High: {confidenceByRisk.high.toFixed(0)}%</p>
      </div>
    </div>
  );
}
