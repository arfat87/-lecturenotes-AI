import React, { useState } from 'react';
import { Clock, AlertTriangle, BookOpen, Trash2, ChevronRight, Mic, Sparkles, Plus, RefreshCw, AlertCircle, Radio } from 'lucide-react';
import { Note, Recording } from '../types';

interface HomeScreenProps {
  notes: Note[];
  recordings: Recording[];
  onSelectNote: (note: Note) => void;
  onRetryRecording: (recordingId: string) => void;
  onDeleteNote: (id: string) => void;
  onDeleteRecording: (id: string) => void;
  onOpenRecord: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  notes,
  recordings,
  onSelectNote,
  onRetryRecording,
  onDeleteNote,
  onDeleteRecording,
  onOpenRecord
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('All');

  const subjects = ['All', ...Array.from(new Set(notes.map(n => n.subject)))];

  const filteredNotes = selectedSubject === 'All'
    ? notes
    : notes.filter(n => n.subject.toLowerCase() === selectedSubject.toLowerCase());

  // Filter pending or failed recordings that do not have a completed note yet
  const pendingRecordings = recordings.filter(
    r => r.status !== 'COMPLETED' || !r.noteId
  );

  return (
    <main className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8" role="main">
      {/* Hero Banner */}
      <section
        aria-label="Welcome banner"
        className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl shadow-indigo-950/10 relative overflow-hidden mb-6 sm:mb-8"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5 sm:gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-indigo-200 mb-2.5 sm:mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300 flex-shrink-0" />
              <span>Gemini 2.0 Flash Verified Pipeline</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
              Turn Real Lecture Audio Into Verifiable Study Notes
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
              Record microphone audio, transcribe spoken content faithfully, and synthesize structured concepts, definitions, and exam alerts.
            </p>
          </div>
          <div className="flex flex-shrink-0">
            <button
              onClick={onOpenRecord}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs sm:text-sm shadow-lg active:scale-95 transition-all min-h-[44px]"
              aria-label="Start recording a new lecture"
            >
              <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
              <span>Record New Lecture</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pending / Failed Audio Recordings Section (Preserved in IndexedDB) */}
      {pendingRecordings.length > 0 && (
        <section aria-label="Active and pending recordings" className="mb-8 space-y-3">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-amber-600 animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Audio Recordings ({pendingRecordings.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingRecordings.map((rec) => {
              const mins = Math.floor(rec.durationSeconds / 60);
              const durationText = rec.durationSeconds > 0
                ? (mins === 0 ? `${rec.durationSeconds}s` : `${mins} mins`)
                : 'Audio Captured';

              return (
                <div
                  key={rec.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    rec.status === 'FAILED'
                      ? 'bg-red-50/70 border-red-200'
                      : 'bg-amber-50/60 border-amber-200/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-white/80 border border-slate-200 text-slate-700">
                        {rec.subject}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rec.status === 'FAILED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}
                      >
                        {rec.status === 'FAILED' ? 'Processing Failed' : rec.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{rec.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Duration: {durationText} • Audio preserved in local storage
                    </p>

                    {rec.errorMessage && (
                      <div className="mt-2 text-[11px] text-red-700 bg-red-100/80 rounded-lg p-2 flex items-start space-x-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{rec.errorMessage}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                    <button
                      onClick={() => onDeleteRecording(rec.id)}
                      className="text-xs font-semibold text-slate-400 hover:text-red-600 transition"
                    >
                      Discard Recording
                    </button>

                    <button
                      onClick={() => onRetryRecording(rec.id)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{rec.status === 'FAILED' ? 'Retry AI Pipeline' : 'Process Audio'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Course Filter Chips */}
      <section aria-label="Filter notes by course" className="mb-6">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {subjects.map(subj => {
            const isActive = selectedSubject === subj;
            return (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all min-h-[36px] ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
                aria-pressed={isActive}
              >
                {subj}
              </button>
            );
          })}
        </div>
      </section>

      {/* Lectures Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-900">
          Saved Lecture Notes ({filteredNotes.length})
        </h2>
        <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Sorted by Most Recent</span>
      </div>

      {/* Lecture Notes Cards Grid */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 p-8 sm:p-12 text-center max-w-md mx-auto my-6 sm:my-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">No lecture notes in this category</h3>
          <p className="text-xs text-slate-500 mb-5">Start a new audio recording to generate your structured notes.</p>
          <button
            onClick={onOpenRecord}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Lecture</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredNotes.map(note => {
            const examCount = note.structuredNotes.sections.filter(s => !!s.exam_flag).length;
            const defCount = note.structuredNotes.sections.reduce((acc, s) => acc + (s.definitions?.length || 0), 0);

            return (
              <article
                key={note.id}
                onClick={() => onSelectNote(note)}
                className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                tabIndex={0}
                role="button"
                aria-label={`View notes for ${note.title}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectNote(note);
                  }
                }}
              >
                <div>
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
                    <div className="flex items-center space-x-1.5 overflow-hidden">
                      <span className="inline-flex items-center px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 truncate max-w-[150px]">
                        {note.subject}
                      </span>
                      {note.isDemo && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Demo Sample
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                      <span className="text-[11px] sm:text-xs">{note.date}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${note.title}"?`)) {
                            onDeleteNote(note.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Delete note"
                        aria-label={`Delete ${note.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Summary */}
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1">
                    {note.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3 sm:mb-4">
                    {note.structuredNotes.summary}
                  </p>
                </div>

                {/* Bottom Metadata & Badges */}
                <div className="pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5 sm:space-x-3 text-slate-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[11px] sm:text-xs">{note.durationFormatted}</span>
                    </div>
                    {defCount > 0 && (
                      <span className="text-slate-400 font-medium text-[11px] sm:text-xs hidden xs:inline">
                        {defCount} {defCount === 1 ? 'def' : 'defs'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {examCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] sm:text-[11px] bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 text-red-600 flex-shrink-0" />
                        <span>{examCount} Exam {examCount === 1 ? 'Flag' : 'Flags'}</span>
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
};
