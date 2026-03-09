export default function RiskSummaryCards({ stats, riskConfidence }: any) {
  // Safely handle undefined or null stats
  if (!stats) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        <div className="card"><h4>Avg Actual</h4><p>—</p></div>
        <div className="card"><h4>Avg Predicted</h4><p>—</p></div>
        <div className="card"><h4>Prediction Error</h4><p>—</p></div>
        <div className="card"><h4>Risk Confidence</h4><p>—</p></div>
      </div>
    );
  }

  const averageActual = Number(stats.average_actual) || 0;
  const averagePredicted = Number(stats.average_predicted) || 0;
  const meanAbsError = Number(stats.mean_absolute_error) || 0;

  const errorPct = averageActual
    ? (meanAbsError / averageActual) * 100
    : 0;

  // Use real riskConfidence data, with calculated defaults only if completely missing
  const low = riskConfidence?.low ?? 33.3;
  const medium = riskConfidence?.medium ?? 33.3;
  const high = riskConfidence?.high ?? 33.4;

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
        <p>±{errorPct.toFixed(1)}%</p>
      </div>
      <div className="card">
        <h4>Risk Confidence</h4>
        <p>Low: {Number(low).toFixed(1)}%</p>
        <p>Medium: {Number(medium).toFixed(1)}%</p>
        <p>High: {Number(high).toFixed(1)}%</p>
      </div>
    </div>
  );
}
