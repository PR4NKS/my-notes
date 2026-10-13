import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Hash } from 'lucide-react';
import { slugifyHeading } from './MarkdownRenderer.jsx';

export default function TableOfContents({ content, onHeadingClick }) {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Parse headings from markdown content
  useEffect(() => {
    if (!content) {
      setHeadings([]);
      return;
    }

    const headingLines = content.split('\n').filter(line => /^#{1,4}\s+/.test(line));
    const parsed = headingLines.map((line) => {
      const match = line.match(/^(#{1,4})\s+(.+)$/);
      if (!match) return null;
      const level = match[1].length;
      const rawTitle = match[2].trim();
      const slug = slugifyHeading(rawTitle);
      return { level, title: rawTitle, slug };
    }).filter(Boolean);

    setHeadings(parsed);
  }, [content]);

  // ScrollSpy observer
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '0% 0% -70% 0%',
        threshold: 0.1,
      }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.slug);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  const handleScrollTo = (slug, e) => {
    e.preventDefault();
    const element = document.getElementById(slug);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(slug);
      if (onHeadingClick) onHeadingClick();
    }
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col mt-4">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between w-full py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
      >
        <div className="flex items-center gap-1.5 tracking-wide">
          <span>Table of Contents</span>
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {!isCollapsed && (
        <nav className="flex flex-col gap-1 mt-1.5 pl-1 border-l border-slate-300 dark:border-slate-700">
          {headings.map((h, idx) => {
            const isActive = activeId === h.slug;
            const indentClass = 
              h.level === 1 ? 'pl-1 font-medium' :
              h.level === 2 ? 'pl-3.5' :
              h.level === 3 ? 'pl-6 text-xs' : 'pl-8 text-xs';

            return (
              <a
                key={`${h.slug}-${idx}`}
                href={`#${h.slug}`}
                onClick={(e) => handleScrollTo(h.slug, e)}
                className={`flex items-start gap-1.5 py-1 text-[13px] leading-tight transition rounded px-1.5 ${indentClass} ${
                  isActive
                    ? 'text-[#881337] dark:text-[#fda4af] font-semibold bg-rose-100/60 dark:bg-rose-950/40 -ml-1 border-l-2 border-[#881337] dark:border-[#fda4af]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
                }`}
              >
                <span className="truncate">{h.title}</span>
              </a>
            );
          })}
        </nav>
      )}
    </div>
  );
}
