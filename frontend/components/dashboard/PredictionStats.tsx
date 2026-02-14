export default function PredictionStats({ stats }: any) {
  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      <div className="card">Avg Predicted: ₹{stats.average_predicted.toFixed(2)}</div>
      <div className="card">Avg Actual: ₹{stats.average_actual.toFixed(2)}</div>
      <div className="card">MAE: ₹{stats.mean_absolute_error.toFixed(2)}</div>
      <div className="card">Max Predicted: ₹{stats.max_predicted.toFixed(2)}</div>
    </div>
  );
}
