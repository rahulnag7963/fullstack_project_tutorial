// Flat, colourful illustrations in the style of the reference mock.
// Each one is drawn on a 64 x 64 grid.

const ART = {
  book: (
    <>
      <rect x="12" y="10" width="30" height="42" rx="4" fill="#90CAF9" />
      <rect x="15" y="8" width="30" height="42" rx="4" fill="#42A5F5" />
      <rect x="20" y="15" width="20" height="9" rx="2" fill="#BBDEFB" />
      <rect x="20" y="29" width="14" height="3" rx="1.5" fill="#BBDEFB" />
      <rect x="20" y="35" width="10" height="3" rx="1.5" fill="#BBDEFB" />
      <path d="M40 44 54 22l5 3-14 22-6 2z" fill="#FFB74D" />
      <path d="M54 22l2.5-4 5 3-2.5 4z" fill="#F06292" />
      <circle cx="8" cy="18" r="2" fill="#FFD54F" />
      <circle cx="56" cy="52" r="2.5" fill="#4DD0E1" />
    </>
  ),
  palette: (
    <>
      <path d="M32 10C18 10 8 20 8 32s9 22 20 22c4 0 5-3 3-6-2-3 0-6 4-6h6c9 0 15-6 15-13 0-11-11-19-24-19z" fill="#FFF3E0" />
      <circle cx="21" cy="24" r="4" fill="#EF5350" />
      <circle cx="32" cy="19" r="4" fill="#42A5F5" />
      <circle cx="43" cy="24" r="4" fill="#FFCA28" />
      <circle cx="18" cy="36" r="4" fill="#66BB6A" />
      <path d="M44 52 58 34l3 2-13 19z" fill="#8D6E63" />
      <path d="M42 54c1-3 3-4 5-3l1 1c0 3-3 4-6 2z" fill="#AB47BC" />
      <circle cx="56" cy="12" r="2" fill="#F06292" />
    </>
  ),
  jar: (
    <>
      <rect x="18" y="8" width="28" height="7" rx="3" fill="#FFB74D" />
      <path d="M16 20c0-3 3-5 6-5h20c3 0 6 2 6 5v26c0 5-4 9-9 9H25c-5 0-9-4-9-9z" fill="#80DEEA" />
      <path d="M16 32h32v14c0 5-4 9-9 9H25c-5 0-9-4-9-9z" fill="#4DD0E1" />
      <circle cx="32" cy="40" r="7" fill="#FFCA28" />
      <path d="M32 36l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z" fill="#FF8F00" />
      <circle cx="10" cy="14" r="2" fill="#F06292" />
      <circle cx="54" cy="10" r="1.5" fill="#FFD54F" />
    </>
  ),
  mountain: (
    <>
      <path d="M4 54 24 22l20 32z" fill="#42A5F5" />
      <path d="M24 22l-6 10 3 2 3-3 3 3 3-2z" fill="#E3F2FD" />
      <path d="M26 54 44 28l16 26z" fill="#1E88E5" />
      <path d="M44 28l-5 7 2.5 1.5 2.5-2.5 2.5 2.5 2.5-1.5z" fill="#E3F2FD" />
      <path d="M44 28V14" stroke="#FFCA28" strokeWidth="2" />
      <path d="M44 14h9l-3 3 3 3h-9z" fill="#F06292" />
      <circle cx="10" cy="20" r="2" fill="#FFD54F" />
    </>
  ),
  cart: (
    <>
      <path d="M6 12h8l6 28h28l6-20H18" fill="none" stroke="#FFB74D" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="22" y="20" width="10" height="14" rx="2" fill="#42A5F5" />
      <rect x="34" y="16" width="10" height="18" rx="2" fill="#66BB6A" />
      <circle cx="48" cy="26" r="5" fill="#EF5350" />
      <circle cx="24" cy="50" r="4" fill="#E3F2FD" />
      <circle cx="44" cy="50" r="4" fill="#E3F2FD" />
    </>
  ),
  dumbbell: (
    <>
      <rect x="18" y="29" width="28" height="6" rx="3" fill="#B0BEC5" />
      <rect x="8" y="18" width="8" height="28" rx="3" fill="#EF5350" />
      <rect x="48" y="18" width="8" height="28" rx="3" fill="#EF5350" />
      <rect x="14" y="22" width="6" height="20" rx="2" fill="#FFB74D" />
      <rect x="44" y="22" width="6" height="20" rx="2" fill="#FFB74D" />
      <circle cx="32" cy="12" r="2" fill="#FFD54F" />
      <circle cx="54" cy="54" r="2" fill="#4DD0E1" />
    </>
  ),
  laptop: (
    <>
      <rect x="12" y="14" width="40" height="28" rx="3" fill="#E3F2FD" />
      <rect x="15" y="17" width="34" height="22" rx="1.5" fill="#1E88E5" />
      <path d="M24 24l-4 4 4 4M40 24l4 4-4 4M34 22l-4 12" fill="none" stroke="#FFCA28" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 44h52l-4 6H10z" fill="#90CAF9" />
      <circle cx="56" cy="10" r="2" fill="#F06292" />
    </>
  ),
  plant: (
    <>
      <path d="M20 38h24l-3 16H23z" fill="#FFB74D" />
      <rect x="18" y="34" width="28" height="6" rx="2" fill="#FF8A65" />
      <path d="M32 34V18" stroke="#43A047" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 22c-10 0-14-6-14-12 8 0 14 4 14 12z" fill="#66BB6A" />
      <path d="M32 26c8 0 13-5 13-11-7 0-13 4-13 11z" fill="#81C784" />
      <circle cx="50" cy="40" r="2" fill="#4DD0E1" />
      <circle cx="12" cy="22" r="2" fill="#FFD54F" />
    </>
  ),
  star: (
    <>
      <path d="M32 8l7 15 16 2-12 11 3 16-14-8-14 8 3-16L9 25l16-2z" fill="#FFCA28" />
      <path d="M32 16l4 9 10 1-7 7 2 10-9-5z" fill="#FFE082" />
      <circle cx="10" cy="50" r="2" fill="#F06292" />
      <circle cx="54" cy="50" r="2.5" fill="#4DD0E1" />
    </>
  ),
  lock: (
    <>
      <path d="M20 28v-8a12 12 0 0 1 24 0v8" fill="none" stroke="#90CAF9" strokeWidth="5" />
      <rect x="12" y="28" width="40" height="28" rx="6" fill="#FFCA28" />
      <circle cx="32" cy="40" r="4" fill="#F57C00" />
      <rect x="30.5" y="41" width="3" height="8" rx="1.5" fill="#F57C00" />
      <circle cx="8" cy="16" r="2" fill="#F06292" />
      <circle cx="56" cy="20" r="2" fill="#4DD0E1" />
    </>
  ),
};

// Icons a todo can get. Keywords are checked in this order.
export const ICON_NAMES = ['book', 'palette', 'jar', 'mountain', 'cart', 'dumbbell', 'laptop', 'plant'];

const KEYWORDS = [
  [/\b(read|book|study|learn|homework)/i, 'book'],
  [/\b(paint|draw|art|design|sketch)/i, 'palette'],
  [/\b(sav|money|budget|pay|bank)/i, 'jar'],
  [/\b(climb|hike|mountain|walk|run|trip|travel)/i, 'mountain'],
  [/\b(buy|shop|milk|grocer|food|cook)/i, 'cart'],
  [/\b(gym|workout|exercise|lift|yoga|train)/i, 'dumbbell'],
  [/\b(code|build|project|work|email|write)/i, 'laptop'],
  [/\b(water|plant|garden|clean)/i, 'plant'],
];

export function pickIcon(title = '', id = '') {
  const match = KEYWORDS.find(([pattern]) => pattern.test(title));
  if (match) return match[1];
  if (!id) return 'star';
  const hash = [...id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 0);
  return ICON_NAMES[hash % ICON_NAMES.length];
}

export function Illustration({ name, className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {ART[name]}
    </svg>
  );
}

export function TodoIcon({ title, id, className }) {
  return <Illustration name={pickIcon(title, id)} className={className} />;
}

// Small line icons for buttons. They use the current text colour.
function LineIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const CheckIcon = () => <LineIcon><path d="M5 12.5l4.5 4.5L19 7.5" /></LineIcon>;
export const TrashIcon = () => <LineIcon><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></LineIcon>;
export const LogoutIcon = () => <LineIcon><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></LineIcon>;
export const BackIcon = () => <LineIcon><path d="M19 12H5M11 6l-6 6 6 6" /></LineIcon>;
