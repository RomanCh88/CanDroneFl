'use client';

import { useEffect, useState } from 'react';

// Small shared building blocks for the profile page (HUD style: flat, square, monospace).

export function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border border-[#1e2d45] bg-[#0d1424]">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#1e2d45]">
        <h2 className="text-[#4a6080] text-xs font-mono uppercase tracking-wider">{'// '}{title}</h2>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

type BtnVariant = 'primary' | 'ghost' | 'danger';
const btnClass: Record<BtnVariant, string> = {
  primary: 'border-[#00b4d8] text-[#00b4d8] hover:bg-[#00b4d8] hover:text-black',
  ghost: 'border-[#1e2d45] text-[#4a6080] hover:border-[#c8d0e0] hover:text-[#c8d0e0]',
  danger: 'border-[#ff3344] text-[#ff3344] hover:bg-[#ff3344] hover:text-black',
};

export function Btn({ variant = 'ghost', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      type="button"
      {...props}
      className={`border px-2 py-1 text-[11px] font-mono tracking-wider whitespace-nowrap transition-colors disabled:opacity-40 disabled:pointer-events-none ${btnClass[variant]} ${className}`}
    />
  );
}

/** Two-step delete: first click arms it, second click confirms. Disarms after 3 s. */
export function ConfirmDeleteBtn({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: () => void | Promise<void> }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Btn
      variant={armed ? 'danger' : 'ghost'}
      onClick={() => { if (armed) { setArmed(false); void onConfirm(); } else setArmed(true); }}
    >
      {armed ? confirmLabel : label}
    </Btn>
  );
}

export const inputClass =
  'w-full bg-[#0a0f1a] border border-[#1e2d45] px-2 py-1.5 text-sm font-mono text-[#c8d0e0] outline-none focus:border-[#00b4d8] aria-[invalid=true]:border-[#ff3344]';

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-wider text-[#4a6080] mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[10px] font-mono text-[#2d4060] mt-0.5">{hint}</span>}
    </label>
  );
}
