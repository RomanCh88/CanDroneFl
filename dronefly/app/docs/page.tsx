'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import AccountMenu from '@/components/AccountMenu';
import { MembersBadge } from '@/components/docs/blocks';
import { chaptersEn } from '@/components/docs/content.en';
import { chaptersUk } from '@/components/docs/content.uk';
import type { Chapter, DocsPart } from '@/components/docs/types';

// Public documentation. Long-form content is per language in components/docs/content.*.tsx;
// screenshots + element boxes come from the capture script (see CLAUDE.md → Docs).

const PARTS: DocsPart[] = ['basics', 'members', 'reference'];

export default function DocsPage() {
  const { lang, setLang, tr } = useLanguage();
  const chapters: Chapter[] = lang === 'uk' ? chaptersUk : chaptersEn;
  const partTitle: Record<DocsPart, string> = { basics: tr.docsPartBasics, members: tr.docsPartMembers, reference: tr.docsPartReference };
  const byPart = useMemo(() => PARTS.map(p => ({ part: p, items: chapters.filter(c => c.part === p) })), [chapters]);
  const [current, setCurrent] = useState(chapters[0].id);
  const [tocOpen, setTocOpen] = useState(false);

  // Scroll-spy: highlight the chapter whose top is nearest above the upper third of the screen.
  useEffect(() => {
    const els = chapters.map(c => document.getElementById(c.id)).filter((e): e is HTMLElement => !!e);
    const onScroll = () => {
      const y = window.innerHeight * 0.3;
      let id = els[0]?.id;
      for (const el of els) if (el.getBoundingClientRect().top <= y) id = el.id;
      if (id) setCurrent(id);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [chapters]);

  // Deep links (#mission etc.) after the client render.
  useEffect(() => {
    const h = decodeURIComponent(window.location.hash.slice(1));
    if (h) document.getElementById(h)?.scrollIntoView();
  }, []);

  const toc = (
    <nav aria-label={tr.docsContents} className="space-y-5">
      {byPart.map(({ part, items }) => (
        <div key={part}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#4a6080] mb-2 flex items-center gap-2">
            {partTitle[part]}
            {part === 'members' && <MembersBadge />}
          </div>
          <ul className="space-y-0.5 border-l border-[#1e2d45]">
            {items.map(c => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  onClick={() => setTocOpen(false)}
                  className={`block -ml-px pl-3 py-1 border-l-2 text-[13px] transition-colors ${current === c.id ? 'border-[#00b4d8] text-[#e6ebf5]' : 'border-transparent text-[#6b7d99] hover:text-[#c8d0e0]'}`}
                >
                  {c.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0f1a' }}>
      <header className="sticky top-0 z-30 border-b border-[#1e2d45] bg-[#080d17] flex items-center gap-4 px-4 py-3 flex-wrap">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛩</span>
          <span className="font-bold text-lg tracking-widest text-[#00b4d8]">DRONEFLY</span>
        </Link>
        <span className="text-xs font-mono text-[#4a6080] hidden sm:inline">{'// '}{tr.navDocs}</span>
        <Link href="/" className="text-xs font-mono text-[#4a6080] hover:text-[#00b4d8]">{tr.backToDashboard}</Link>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'uk' ? 'en' : 'uk')}
            className="text-xs px-2 py-1 border border-[#1e2d45] font-mono tracking-wider"
            title={lang === 'uk' ? 'Switch to English' : 'Перейти на українську'}
          >
            <span style={{ color: lang === 'uk' ? '#00b4d8' : '#4a6080' }}>UA</span>
            <span className="text-[#2d4060]">|</span>
            <span style={{ color: lang === 'en' ? '#00b4d8' : '#4a6080' }}>EN</span>
          </button>
          <AccountMenu />
        </div>
      </header>

      <div className="flex-1 w-full max-w-[1200px] mx-auto px-4 lg:px-6 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        {/* desktop TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-[72px] max-h-[calc(100vh-88px)] overflow-y-auto py-8 pr-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#00b4d8] mb-4">{tr.docsContents}</div>
            {toc}
          </div>
        </aside>

        <main className="min-w-0 py-8 pb-24" style={{ fontFamily: 'var(--font-exo2), sans-serif' }}>
          {/* hero */}
          <div className="mb-10 border-b border-[#1e2d45] pb-8">
            <div className="text-[11px] font-mono text-[#00b4d8] tracking-wider mb-2">{'// '}{tr.navDocs}</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#e6ebf5] tracking-wide">{tr.docsTitle}</h1>
            <p className="mt-3 text-[15px] text-[#8a9ab5] max-w-2xl leading-relaxed">{tr.docsSubtitle}</p>
          </div>

          {/* mobile TOC */}
          <div className="lg:hidden mb-8 border border-[#1e2d45] bg-[#0d1424]">
            <button
              type="button"
              onClick={() => setTocOpen(o => !o)}
              aria-expanded={tocOpen}
              className="w-full flex items-center justify-between px-4 py-3 text-[12px] font-mono uppercase tracking-wider text-[#00b4d8]"
            >
              {tr.docsContents}
              <span className="text-[#4a6080]">{tocOpen ? '▴' : '▾'}</span>
            </button>
            {tocOpen && <div className="px-4 pb-4">{toc}</div>}
          </div>

          {byPart.map(({ part, items }) => (
            <div key={part}>
              <div className="mt-6 mb-2 flex items-center gap-3">
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#4a6080]">{partTitle[part]}</span>
                <span className="flex-1 border-t border-[#1e2d45]" />
              </div>
              {items.map((c, i) => (
                <section key={c.id} id={c.id} className="scroll-mt-20 py-8 border-b border-[#1e2d45] last:border-b-0">
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <span className="text-[11px] font-mono text-[#4a6080]">
                      {String(chapters.indexOf(c) + 1).padStart(2, '0')}
                    </span>
                    <h2 className="text-xl font-semibold text-[#e6ebf5] tracking-wide">
                      <a href={`#${c.id}`} className="hover:text-[#00b4d8]">{c.title}</a>
                    </h2>
                    {c.members && <MembersBadge />}
                  </div>
                  <div className="text-[12px] font-mono text-[#4a6080] mb-4">{c.blurb}</div>
                  {c.body}
                  {i === items.length - 1 && part === 'reference' && (
                    <a href="#" className="inline-block mt-6 text-[11px] font-mono text-[#4a6080] hover:text-[#00b4d8]">↑ {tr.docsBackToTop}</a>
                  )}
                </section>
              ))}
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
