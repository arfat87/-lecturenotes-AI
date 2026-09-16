import React, { useState } from 'react';
import { Search, X, ChevronRight, BookOpen } from 'lucide-react';
import { Note } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (note: Note) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  const searchResults = cleanQuery === ''
    ? []
    : notes.filter(note => {
        const inTitle = note.title.toLowerCase().includes(cleanQuery);
        const inSubject = note.subject.toLowerCase().includes(cleanQuery);
        const inSummary = note.structuredNotes.summary.toLowerCase().includes(cleanQuery);
        const inTranscript = note.transcriptText?.toLowerCase().includes(cleanQuery) || false;
        const inSections = note.structuredNotes.sections.some(s =>
          s.heading.toLowerCase().includes(cleanQuery) ||
          s.points.some(p => p.toLowerCase().includes(cleanQuery)) ||
          s.definitions?.some(d => d.term.toLowerCase().includes(cleanQuery) || d.definition.toLowerCase().includes(cleanQuery) || (d.added_context?.toLowerCase().includes(cleanQuery) ?? false)) ||
          (s.exam_flag?.toLowerCase().includes(cleanQuery) ?? false)
        );
        return inTitle || inSubject || inSummary || inTranscript || inSections;
      });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[75vh]">
        {/* Search Bar */}
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <Search className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, verbatim transcripts, definitions, formulas..."
            className="w-full text-base font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 rounded-lg"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="mt-4 overflow-y-auto space-y-2.5 flex-1 pr-1">
          {cleanQuery === '' ? (
            <div className="py-12 text-center text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">Type any term or concept to search your notes & transcripts</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-semibold text-slate-600">No matching notes found</p>
              <p className="text-xs mt-1">Try searching for course names or broader lecture terms.</p>
            </div>
          ) : (
            searchResults.map(note => (
              <div
                key={note.id}
                onClick={() => {
                  onSelectNote(note);
                  onClose();
                }}
                className="group p-4 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/80 border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-700">
                      {note.subject}
                    </span>
                    {note.isDemo && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-600">
                        Demo
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">{note.date}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">
                    {note.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                    {note.structuredNotes.summary}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition flex-shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
