import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Folder, Tag, CornerDownLeft, Loader2 } from 'lucide-react';
import { searchApi } from '../api.js';

export default function SearchModal({ isOpen, onClose, onSelectNote }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchApi.search(query.trim());
        setResults(data);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelectNote(results[selectedIndex].id || results[selectedIndex].slug);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-16 px-3 sm:px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[75vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5 border-b border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, attack vectors, commands, folders, tags..."
            className="w-full bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm sm:text-base focus:outline-none"
          />
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />}
          <button
            onClick={onClose}
            aria-label="Close search"
            className="p-1.5 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results list */}
        <div className="overflow-y-auto p-2 divide-y divide-slate-200 dark:divide-slate-800/60">
          {query.trim() === '' ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Type to start searching across the entire knowledge base...
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No matching notes found for "{query}".
            </div>
          ) : (
            results.map((note, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note.id || note.slug);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-lg cursor-pointer transition flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50'
                      : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                      <FileText className="w-4 h-4 text-[#881337] dark:text-[#fda4af]" />
                      <span className="text-[15px]">{note.title}</span>
                      {note.status === 'draft' && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          Draft
                        </span>
                      )}
                    </div>
                    {note.folder_name && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded">
                        <Folder className="w-3 h-3" />
                        {note.folder_name}
                      </span>
                    )}
                  </div>

                  {note.snippet && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 font-normal">
                      {note.snippet}
                    </p>
                  )}

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {note.tags.map((t, tidx) => (
                        <span
                          key={tidx}
                          className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 rounded"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-slate-300 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-950 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>Pranks Search</span>
        </div>
      </div>
    </div>
  );
}
