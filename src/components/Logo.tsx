/** The Wiremi mark: a tiny wireframe of a screen. Same drawing as public/favicon.svg. */
export function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="7" fill="#4f8ef7" />
      <rect x="7" y="7.5" width="18" height="4" rx="1.5" fill="#fff" />
      <rect x="7" y="14.5" width="8" height="10" rx="1.5" fill="#fff" fillOpacity=".92" />
      <rect x="17" y="14.5" width="8" height="4" rx="1.5" fill="#fff" fillOpacity=".6" />
      <rect x="17" y="20.5" width="8" height="4" rx="1.5" fill="#fff" fillOpacity=".6" />
    </svg>
  );
}
