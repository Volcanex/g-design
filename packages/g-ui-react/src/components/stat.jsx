import NumberFlow from "@number-flow/react";

/* Every animated numeric goes through NumberFlow; it respects the user's
   reduced-motion preference. */
export function Stat({ label, value, suffix, format }) {
  return (
    <div className="card stat">
      <span className="k">{label}</span>
      <span className="v">
        <NumberFlow value={value} format={format} respectMotionPreference suffix={suffix} />
      </span>
    </div>
  );
}
