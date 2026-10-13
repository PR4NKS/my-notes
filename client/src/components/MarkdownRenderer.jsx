import React, { useMemo, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-powershell.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-c.js';
import 'prismjs/components/prism-cpp.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-sql.js';
import 'prismjs/components/prism-markdown.js';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export default function MarkdownRenderer({ content, onNavigateNote }) {
  const containerRef = useRef(null);

  const html = useMemo(() => {
    if (!content) return '';

    // Pre-process KaTeX math: $$block$$ and $inline$
    let processed = content.replace(/\$\$([\s\S]+?)\$\$/g, (match, expr) => {
      try {
        return `<div class="katex-display">${katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false })}</div>`;
      } catch (e) {
        return match;
      }
    });

    processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, expr) => {
      try {
        return `<span class="katex-inline">${katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false })}</span>`;
      } catch (e) {
        return match;
      }
    });

    // Custom renderer for marked
    const renderer = new marked.Renderer();

    // Headings with unique anchors
    renderer.heading = function ({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const rawText = tokens.map(t => t.text || '').join('');
      const slug = slugifyHeading(rawText);
      return `<h${depth} id="${slug}" class="heading-anchor group flex items-center gap-2">
        <span>${text}</span>
        <a href="#${slug}" class="opacity-0 group-hover:opacity-60 text-xs font-mono ml-1">#</a>
      </h${depth}>`;
    };

    // Code blocks with language & copy button hook
    renderer.code = function ({ text, lang }) {
      const language = lang || 'text';
      let highlighted = text;
      try {
        if (Prism.languages[language]) {
          highlighted = Prism.highlight(text, Prism.languages[language], language);
        }
      } catch (e) {
        highlighted = text;
      }

      const encodedCode = encodeURIComponent(text);

      return `<div class="code-block-container my-4 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shadow-md">
        <div class="code-header flex items-center justify-between px-4 py-1.5 bg-slate-800 border-b border-slate-700 text-xs text-slate-300 font-mono">
          <span>${language}</span>
          <button type="button" class="copy-code-btn flex items-center gap-1.5 hover:text-white transition px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600" data-code="${encodedCode}">
            <span>Copy</span>
          </button>
        </div>
        <pre class="p-4 overflow-x-auto m-0 text-sm bg-slate-900"><code class="language-${language}">${highlighted}</code></pre>
      </div>`;
    };

    // Wiki-links: [[Target Note]] or [[Target Note|Custom Text]]
    processed = processed.replace(/\[\[([a-zA-Z0-9_\-\s]+)(?:\|([^\]]+))?\]\]/g, (match, target, text) => {
      const displayText = text ? text.trim() : target.trim();
      const targetSlug = slugifyHeading(target.trim());
      return `<a href="#note/${targetSlug}" class="wiki-link" data-note-target="${targetSlug}">${displayText}</a>`;
    });

    // Parse markdown
    const rawHtml = marked.parse(processed, { renderer, gfm: true, breaks: true });

    // Sanitize with DOMPurify
    return DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['target', 'data-code', 'data-note-target'],
    });
  }, [content]);

  // Attach event handlers for copy buttons and wiki links
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Handle copy buttons
    const copyButtons = container.querySelectorAll('.copy-code-btn');
    const handleCopy = (e) => {
      const btn = e.currentTarget;
      const code = decodeURIComponent(btn.getAttribute('data-code') || '');
      navigator.clipboard.writeText(code).then(() => {
        const span = btn.querySelector('span');
        if (span) {
          const original = span.textContent;
          span.textContent = 'Copied!';
          setTimeout(() => {
            span.textContent = original;
          }, 2000);
        }
      });
    };

    copyButtons.forEach(btn => btn.addEventListener('click', handleCopy));

    // Handle wiki-link internal navigation
    const wikiLinks = container.querySelectorAll('.wiki-link');
    const handleWikiClick = (e) => {
      e.preventDefault();
      const targetSlug = e.currentTarget.getAttribute('data-note-target');
      if (targetSlug && onNavigateNote) {
        onNavigateNote(targetSlug);
      }
    };

    wikiLinks.forEach(link => link.addEventListener('click', handleWikiClick));

    return () => {
      copyButtons.forEach(btn => btn.removeEventListener('click', handleCopy));
      wikiLinks.forEach(link => link.removeEventListener('click', handleWikiClick));
    };
  }, [html, onNavigateNote]);

  return (
    <div 
      ref={containerRef}
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
