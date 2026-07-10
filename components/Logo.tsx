// The depth logo mark: three left-aligned descending bars (a depth-chart glyph). Shared
// so the header trigger and the sign-in page render the exact same shape at different
// sizes — do not alter the geometry (it's the brand mark). Color inherits from `color`.
export default function Logo({ size = 20, color }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={color ? { color } : undefined}
      aria-hidden="true">
      <rect x="1" y="2.5" width="11" height="2" rx="1" fill="currentColor" />
      <rect x="1" y="7" width="8" height="2" rx="1" fill="currentColor" />
      <rect x="1" y="11.5" width="5" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}
