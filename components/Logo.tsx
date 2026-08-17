import { colors } from './ui/tokens';

// The depth logo mark: a detached first-down marker beside three staggered depth bars.
// Shared so the header trigger and sign-in page render the exact same mark at every size.
export default function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true">
      <rect width="1024" height="1024" fill={colors.bg} />
      <circle cx="270" cy="270" r="132" fill="#FF6500" />
      <circle cx="270" cy="270" r="82" fill={colors.bg} />
      <circle cx="270" cy="270" r="50" fill="#FF6500" />
      <defs>
        <clipPath id="depth-marker-pole">
          <path d="M190 405h160l-28 435q-2 22-24 22h-56q-22 0-24-22l-28-435Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#depth-marker-pole)">
        <rect x="160" y="405" width="220" height="470" fill="#FF6500" />
        <rect x="160" y="490" width="220" height="52" fill="#FFFFFF" />
        <rect x="160" y="610" width="220" height="52" fill="#FFFFFF" />
      </g>
      <rect x="420" y="415" width="410" height="96" rx="29" fill="#FFFFFF" />
      <rect x="420" y="565" width="275" height="96" rx="29" fill="#FFFFFF" />
      <rect x="420" y="715" width="155" height="96" rx="29" fill="#FFFFFF" />
    </svg>
  );
}
