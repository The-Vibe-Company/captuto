import localFont from 'next/font/local';

// Canvas annotation parity is needed only in the editor, not on every route.
const annotationFont = localFont({
  src: '../../lib/render/fonts/NotoSans-Regular.ttf',
  display: 'swap',
  variable: '--font-annotation',
});

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The Studio editor renders its own full-bleed top bar, so this layout
  // intentionally does not wrap children with a global Header. Authentication
  // is enforced by middleware before we get here.
  return <div className={annotationFont.variable}>{children}</div>;
}
