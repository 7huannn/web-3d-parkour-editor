import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { UiTheme } from '../types/game';

type HelpTutorialOverlayProps = {
  readonly open: boolean;
  readonly theme: UiTheme;
  readonly onClose: () => void;
};

type TutorialSection = {
  readonly title: string;
  readonly summary: string;
  readonly rows: ReadonlyArray<{
    readonly label: string;
    readonly detail: string;
  }>;
};

const TUTORIAL_SECTIONS: ReadonlyArray<TutorialSection> = [
  {
    title: 'Basic Controls',
    summary: 'Core movement and retry controls while playing.',
    rows: [
      { label: 'Move', detail: 'WASD / Arrow Keys' },
      { label: 'Jump', detail: 'Space' },
      { label: 'Sprint', detail: 'Shift' },
      { label: 'Restart', detail: 'R' },
    ],
  },
  {
    title: 'Building Tips',
    summary: 'Fast editing actions in build mode.',
    rows: [
      { label: 'Select block', detail: 'Click a block' },
      { label: 'Place block', detail: 'Left click on a block surface' },
      { label: 'Move block', detail: 'Arrow keys' },
      { label: 'Delete block', detail: 'Delete key' },
    ],
  },
  {
    title: 'Lighting',
    summary: 'Global scene lighting controls.',
    rows: [
      { label: 'Ambient Intensity', detail: 'Overall base light level for the entire scene.' },
      { label: 'Directional Intensity', detail: 'Main sunlight strength that drives shading and highlights.' },
      { label: 'Directional Position', detail: 'Direction and elevation of the key light source.' },
    ],
  },
  {
    title: 'Post Processing',
    summary: 'Final image tuning and cinematic effects.',
    rows: [
      { label: 'Bloom', detail: 'Glow around bright surfaces and emissive areas.' },
      { label: 'Vignette', detail: 'Darkens frame edges to focus attention to center.' },
      { label: 'Chromatic Aberration', detail: 'Subtle RGB split for stylized lens effect.' },
      { label: 'Depth Of Field', detail: 'Camera-like focus blur by distance.' },
      { label: 'Brightness', detail: 'Lifts or lowers global luminance.' },
      { label: 'Contrast', detail: 'Separates dark and bright values.' },
      { label: 'Hue', detail: 'Rotates overall color tone.' },
      { label: 'Saturation', detail: 'Controls color vividness.' },
    ],
  },
  {
    title: 'Character Physics',
    summary: 'Movement behavior and airborne handling.',
    rows: [
      { label: 'Move Speed', detail: 'Base walking speed.' },
      { label: 'Sprint Multiplier', detail: 'Speed boost factor while sprinting.' },
      { label: 'Jump Force', detail: 'Vertical jump power.' },
      { label: 'Fall Multiplier', detail: 'Extra downward acceleration while falling.' },
      { label: 'Air Control', detail: 'How strongly movement can be steered mid-air.' },
      { label: 'Friction', detail: 'Ground traction and stopping feel.' },
      { label: 'Linear Damping', detail: 'Velocity decay over time.' },
      { label: 'Angular Damping', detail: 'Rotational slowdown over time.' },
    ],
  },
  {
    title: 'Task Bar / Editor Tools',
    summary: 'Per-block visual and transform editing.',
    rows: [
      { label: 'Render Mode', detail: 'Solid / Lines / Points on the selected block only.' },
      { label: 'Affine Transform', detail: 'Translate / Rotate / Scale modes.' },
      { label: 'Axis Nudges', detail: 'Use +/-X, +/-Y, +/-Z buttons for precise edits.' },
      { label: 'Reset Transform', detail: 'Returns current transform preview to default.' },
      { label: 'Texture Mapping', detail: 'Upload an image and apply it as block texture.' },
    ],
  },
  {
    title: 'Projection',
    summary: 'Camera framing and perspective setup.',
    rows: [
      { label: 'Near', detail: 'Near clipping plane distance.' },
      { label: 'Far', detail: 'Far clipping plane distance.' },
      { label: 'Offset X', detail: 'Horizontal camera offset from target.' },
      { label: 'Height', detail: 'Vertical camera height above target.' },
      { label: 'Distance', detail: 'Follow camera distance from target.' },
    ],
  },
];

export function HelpTutorialOverlay({ open, theme, onClose }: HelpTutorialOverlayProps) {
  const isLight = theme === 'light';

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    globalThis.addEventListener('keydown', handleEscape);
    return () => globalThis.removeEventListener('keydown', handleEscape);
  }, [onClose, open]);

  return (
    <div
      className={`absolute inset-0 z-[1300] transition-opacity duration-300 ease-out ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onMouseDown={onClose}
      aria-hidden={!open}
    >
      <div className={`absolute inset-0 backdrop-blur-md ${isLight ? 'bg-slate-900/45' : 'bg-black/65'}`} />
      <div className="relative flex h-full w-full items-center justify-center p-4 sm:p-6 lg:p-10">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-overlay-title"
          className={`relative w-full max-w-6xl overflow-hidden rounded-2xl border shadow-2xl transition-all duration-300 ease-out ${open ? 'translate-y-0 scale-100' : 'translate-y-6 scale-[0.98]'} ${isLight ? 'border-slate-300/90 bg-white/95 text-slate-900 shadow-slate-900/20' : 'border-white/10 bg-slate-950/92 text-white shadow-black/65'}`}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className={`flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6 ${isLight ? 'border-slate-200/90' : 'border-white/10'}`}>
            <div>
              <div className={`text-[11px] uppercase tracking-[0.22em] ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Tutorial</div>
              <h2 id="tutorial-overlay-title" className="mt-1 text-xl font-semibold sm:text-2xl">How To Play And Build</h2>
              <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                Press Esc, click the X button, or click outside this panel to close.
              </p>
            </div>
            <button
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${isLight ? 'border-slate-300/90 bg-white/85 text-slate-700 hover:bg-slate-100' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'}`}
              onClick={onClose}
              aria-label="Close tutorial overlay"
            >
              <X size={18} />
            </button>
          </header>

          <div className="max-h-[calc(100dvh-11.5rem)] overflow-y-auto px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {TUTORIAL_SECTIONS.map((section) => (
                <section
                  key={section.title}
                  className={`rounded-xl border p-4 ${isLight ? 'border-slate-200/90 bg-slate-50/80' : 'border-white/10 bg-slate-900/55'}`}
                >
                  <h3 className={`text-[12px] uppercase tracking-[0.18em] ${isLight ? 'text-slate-700' : 'text-cyan-200/90'}`}>
                    {section.title}
                  </h3>
                  <p className={`mt-1 text-xs leading-5 ${isLight ? 'text-slate-600' : 'text-white/65'}`}>
                    {section.summary}
                  </p>

                  <dl className="mt-3 space-y-2">
                    {section.rows.map((row) => (
                      <div
                        key={`${section.title}-${row.label}`}
                        className={`flex flex-col gap-1 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${isLight ? 'border-slate-200/85 bg-white/90' : 'border-white/10 bg-white/[0.03]'}`}
                      >
                        <dt className={`text-[11px] uppercase tracking-[0.15em] ${isLight ? 'text-slate-500' : 'text-white/55'}`}>
                          {row.label}
                        </dt>
                        <dd className={`text-xs leading-5 break-words sm:max-w-[65%] sm:text-right ${isLight ? 'text-slate-800' : 'text-white/90'}`}>
                          {row.detail}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
