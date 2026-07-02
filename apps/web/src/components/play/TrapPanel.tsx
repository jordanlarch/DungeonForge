interface TrapPanelProps {
  hasTrap: boolean;
  disarmed: boolean;
  onSearch: () => void;
  onDetect: () => void;
  onDisarm: () => void;
}

export default function TrapPanel({ hasTrap, disarmed, onSearch, onDetect, onDisarm }: TrapPanelProps) {
  return (
    <div className="trap-panel panel">
      <h3>Traps</h3>
      {!hasTrap && <p className="muted">Use Search in a trapped room to find hazards.</p>}
      {hasTrap && disarmed && <p className="success">Trap disarmed in this room.</p>}
      {hasTrap && !disarmed && (
        <div className="trap-actions">
          <button type="button" onClick={onSearch}>Search room</button>
          <button type="button" onClick={onDetect}>Detect (Perception)</button>
          <button type="button" onClick={onDisarm}>Disarm (Dex + Prof)</button>
        </div>
      )}
    </div>
  );
}
