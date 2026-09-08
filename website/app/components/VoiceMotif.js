import Icon from "./Icon";
export default function VoiceMotif({ compact = false }) {
  return (
    <div
      className={`voice-motif ${compact ? "motif-compact" : ""}`}
      aria-hidden="true"
    >
      <span className="motif-icon">
        <Icon name="mic" />
      </span>
      <svg viewBox="0 0 240 72" fill="none">
        <path d="M0 36h240" stroke="currentColor" opacity=".12" />
        {Array.from({ length: 25 }, (_, i) => {
          const height =
            8 + Math.sin(i * 1.7) ** 2 * Math.sin((Math.PI * i) / 24) * 52;
          return (
            <path
              key={i}
              d={`M${12 + i * 9} ${36 - height / 2}v${height}`}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <span className="motif-icon">
        <Icon name="book" />
      </span>
    </div>
  );
}
