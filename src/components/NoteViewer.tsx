import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit3, Trash2, Bookmark, AlertTriangle, FileText, Copy, Check, Sparkles, Clock, RefreshCw, Volume2, ShieldCheck, Database } from 'lucide-react';
import { Note, Recording } from '../types';
import { indexedDbService } from '../services/indexedDbService';

interface NoteViewerProps {
  note: Note;
  onBack: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onRegenerate?: (noteId: string) => void;
}

export const NoteViewer: React.FC<NoteViewerProps> = ({
  note,
  onBack,
  onEdit,
  onDelete,
  onRegenerate
}) => {
  const [showTranscript, setShowTranscript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let createdUrl: string | null = null;

    const loadRecording = async () => {
      if (!note.recordingId) return;
      try {
        const rec = await indexedDbService.getRecording(note.recordingId);
        if (isMounted && rec) {
          setRecording(rec);
          if (rec.audioBlob) {
            createdUrl = URL.createObjectURL(rec.audioBlob);
            setAudioUrl(createdUrl);
          }
        }
      } catch (err) {
        console.error('Failed to load source recording audio from IndexedDB:', err);
      }
    };

    loadRecording();

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [note.recordingId]);

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    if (confirm('Regenerate structured notes from the original spoken transcript? Any manual edits will be updated.')) {
      setIsRegenerating(true);
      try {
        await onRegenerate(note.id);
      } finally {
        setIsRegenerating(false);
      }
    }
  };

  const copyAsMarkdown = () => {
    let md = `# ${note.structuredNotes.title || note.title}\n\n`;
    md += `**Subject:** ${note.subject}  \n`;
    md += `**Date:** ${note.date} | **Duration:** ${note.durationFormatted}\n\n`;
    md += `## Executive Summary\n${note.structuredNotes.summary}\n\n`;

    note.structuredNotes.sections.forEach(section => {
      md += `## ${section.heading}\n\n`;
      section.points.forEach(pt => {
        md += `- ${pt}\n`;
      });
      md += '\n';

      if (section.definitions?.length > 0) {
        md += `### Key Definitions\n`;
        section.definitions.forEach(def => {
          md += `- **${def.term}**: ${def.definition}`;
          if (def.added_context) md += ` *(Context: ${def.added_context})*`;
          md += '\n';
        });
        md += '\n';
      }

      if (section.exam_flag) {
        md += `> ⚡ **EXAM HIGHLIGHT:** ${section.exam_flag}\n\n`;
      }
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-6 sm:py-8 animate-fadeIn">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 hover:bg-slate-50 transition min-h-[40px]"
          aria-label="Back to Notes list"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex flex-wrap items-center space-x-1.5 sm:space-x-2">
          {onRegenerate && !note.isDemo && (
            <button
              disabled={isRegenerating}
              onClick={handleRegenerate}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition min-h-[40px] disabled:opacity-50"
              title="Regenerate notes from transcript"
              aria-label="Regenerate notes from transcript"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 flex-shrink-0 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
            </button>
          )}

          <button
            onClick={() => setShowTranscript(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition min-h-[40px]"
            title="View Raw Speech Transcript"
            aria-label="View raw speech transcript"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="hidden xs:inline">Transcript</span>
          </button>

          <button
            onClick={copyAsMarkdown}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 hover:bg-indigo-100 transition min-h-[40px]"
            title="Copy as Markdown"
            aria-label="Copy note as Markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" /> : <Copy className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={onEdit}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition min-h-[40px]"
            aria-label="Edit notes"
          >
            <Edit3 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Edit</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this lecture note?')) {
                onDelete(note.id);
              }
            }}
            className="p-2 rounded-xl text-red-600 bg-white border border-red-200 hover:bg-red-50 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Delete note"
            aria-label="Delete lecture note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Note Sheet */}
      <article className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-10 shadow-lg shadow-slate-200/50 border border-slate-200/80 space-y-6 sm:space-y-8">
        {/* Note Provenance Banner */}
        {note.isDemo ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 flex items-center space-x-3 text-xs text-slate-600">
            <Database className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <div>
              <span className="font-bold text-slate-800">Pre-seeded Demo Sample</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                This note is a reference fixture (Stanford Machine Learning CS229). It was not generated from your microphone.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-bold">Verified Audio Provenance</span>
              <span className="text-emerald-700 hidden sm:inline">•</span>
              <span className="text-emerald-700 text-[11px] font-mono hidden sm:inline">
                Recording ID: {note.recordingId.substring(0, 16)}...
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
              Source of Truth: Real Recording
            </span>
          </div>
        )}

        {/* Audio Player (if audio blob exists) */}
        {audioUrl && (
          <section aria-label="Original Lecture Audio Recording" className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900 mb-2">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-indigo-600" />
                <span>Original Lecture Audio Recording</span>
              </div>
              {recording && (
                <span className="text-[11px] text-indigo-600 font-normal">
                  {(recording.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • {recording.audioMimeType}
                </span>
              )}
            </div>
            <audio controls src={audioUrl} className="w-full h-10 rounded-xl" />
          </section>
        )}

        {/* Note Header */}
        <header className="border-b border-slate-100 pb-5 sm:pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5 sm:mb-3">
            <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              {note.subject}
            </span>

            <div className="flex items-center space-x-2 sm:space-x-3 text-xs text-slate-500">
              <span>{note.date}</span>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{note.durationFormatted}</span>
              </div>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {note.structuredNotes.title || note.title}
          </h1>
        </header>

        {/* Executive Summary */}
        <section aria-label="Executive Summary" className="bg-gradient-to-br from-indigo-50/60 via-slate-50 to-indigo-50/30 rounded-2xl p-4 sm:p-6 border border-indigo-100/80">
          <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs sm:text-sm mb-1.5 sm:mb-2">
            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>Executive Summary</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {note.structuredNotes.summary}
          </p>
        </section>

        {/* Sections */}
        <div className="space-y-6 sm:space-y-8">
          {note.structuredNotes.sections.map((section, idx) => (
            <section key={idx} aria-label={section.heading} className="space-y-3.5 sm:space-y-4 pt-1 sm:pt-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">
                {section.heading}
              </h2>

              {/* Bullet Points */}
              <ul className="space-y-2 sm:space-y-2.5 pl-1.5 sm:pl-2">
                {section.points.map((pt, pIdx) => (
                  <li key={pIdx} className="flex items-start text-xs sm:text-sm text-slate-700 leading-relaxed">
                    <span className="text-indigo-600 font-bold mr-2.5 text-sm sm:text-base leading-none">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              {/* Definitions */}
              {section.definitions && section.definitions.length > 0 && (
                <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2">
                  {section.definitions.map((def, dIdx) => (
                    <div
                      key={dIdx}
                      className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 text-xs"
                    >
                      <div className="flex items-center space-x-1.5 font-bold text-amber-900 mb-1">
                        <Bookmark className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">{def.term}</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed mb-2 font-medium">
                        {def.definition}
                      </p>
                      {def.added_context && (
                        <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/80 border border-amber-200/60 text-amber-900/90 text-[10px] sm:text-[11px] font-medium">
                          💡 <span className="ml-1 font-semibold">Context note:</span>&nbsp;{def.added_context}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Exam Callout */}
              {section.exam_flag && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 sm:p-4 flex items-start space-x-2.5 sm:space-x-3 text-xs">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-red-700 uppercase tracking-wide text-[10px] sm:text-[11px] block">
                      ⚡ EXAM HIGHLIGHT
                    </span>
                    <p className="text-red-950 font-bold text-xs sm:text-sm mt-0.5">
                      {section.exam_flag}
                    </p>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      </article>

      {/* Raw Transcript Modal */}
      {showTranscript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Raw Spoken Lecture Transcript</h3>
              </div>
              <button
                onClick={() => setShowTranscript(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="my-3 sm:my-4 overflow-y-auto max-h-[50vh] p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed font-mono">
              {note.transcriptText || 'No transcript text available for this session.'}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Source: Real Speech-to-Text
              </span>
              <button
                onClick={() => setShowTranscript(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition min-h-[38px]"
              >
                Close Transcript
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
