import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit3, Trash2, Bookmark, AlertTriangle, FileText, Copy, Check, Sparkles, Clock, RefreshCw, Volume2, ShieldCheck, Database, Globe, ExternalLink, Video, Headphones, Key, Calculator, HelpCircle, CheckSquare, AlertCircle, Lightbulb } from 'lucide-react';
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
    const s = note.structuredNotes;
    let md = `# ${s.title || note.title}\n\n`;
    md += `**Subject:** ${note.subject}  \n`;
    md += `**Date:** ${note.date} | **Duration:** ${note.durationFormatted}\n\n`;

    if (s.summary) {
      md += `## Executive Summary\n${s.summary}\n\n`;
    }

    if (s.keyTakeaways && s.keyTakeaways.length > 0) {
      md += `## Key Takeaways\n`;
      s.keyTakeaways.forEach(k => {
        md += `- ${k}\n`;
      });
      md += '\n';
    }

    if (s.sections && s.sections.length > 0) {
      md += `## Detailed Sections\n\n`;
      s.sections.forEach(section => {
        md += `### ${section.title || section.heading || 'Section'}\n\n`;
        if (section.coreConcept) {
          md += `**Core Concept:** ${section.coreConcept}\n\n`;
        }
        if (section.definition) {
          md += `**Definition:** ${section.definition}\n\n`;
        }
        if (section.explanation) {
          md += `**Explanation:** ${section.explanation}\n\n`;
        }
        if (section.logicOrProcess) {
          md += `**Logic / Process:** ${section.logicOrProcess}\n\n`;
        }
        if (section.examples && section.examples.length > 0) {
          md += `**Examples:**\n`;
          section.examples.forEach(ex => {
            md += `- ${ex}\n`;
          });
          md += '\n';
        }
        const pts = (section.importantPoints && section.importantPoints.length > 0)
          ? section.importantPoints
          : (section.points || []);
        if (pts.length > 0) {
          md += `**Important Points:**\n`;
          pts.forEach(pt => {
            md += `- ${pt}\n`;
          });
          md += '\n';
        }

        if (section.definitions && section.definitions.length > 0) {
          md += `#### Section Definitions\n`;
          section.definitions.forEach(def => {
            md += `- **${def.term}**: ${def.definition}`;
            if (def.context) md += ` *(Context: ${def.context})*`;
            else if (def.added_context) md += ` *(Context: ${def.added_context})*`;
            md += '\n';
          });
          md += '\n';
        }

        if (section.exam_flag) {
          md += `> ⚡ **EXAM HIGHLIGHT:** ${section.exam_flag}\n\n`;
        }
      });
    }

    if (s.definitions && s.definitions.length > 0) {
      md += `## Key Definitions\n`;
      s.definitions.forEach(def => {
        md += `- **${def.term}**: ${def.definition}`;
        if (def.context) md += ` *(Context: ${def.context})*`;
        else if (def.added_context) md += ` *(Context: ${def.added_context})*`;
        md += '\n';
      });
      md += '\n';
    }

    if (s.formulas && s.formulas.length > 0) {
      md += `## Formulas\n\n`;
      s.formulas.forEach(f => {
        md += `\`\`\`\n${f.formula}\n\`\`\`\n`;
        if (f.meaning) md += `**Meaning:** ${f.meaning}\n\n`;
        if (f.variables && f.variables.length > 0) {
          md += `**Variables:**\n`;
          f.variables.forEach(v => { md += `- ${v}\n`; });
          md += '\n';
        }
        if (f.context) md += `*Context:* ${f.context}\n\n`;
      });
    }

    if (s.importantFacts && s.importantFacts.length > 0) {
      md += `## Important Facts & Data\n`;
      s.importantFacts.forEach(fact => {
        md += `- ${fact}\n`;
      });
      md += '\n';
    }

    if (s.examAlerts && s.examAlerts.length > 0) {
      md += `## Exam Alerts\n\n`;
      s.examAlerts.forEach(alert => {
        md += `> ⚡ **${alert.topic}**\n`;
        if (alert.reason) md += `> **Reason:** ${alert.reason}\n`;
        if (alert.evidence) md += `> **Evidence:** "${alert.evidence}"\n`;
        md += '\n';
      });
    }

    if (s.questionsMentioned) {
      const { lecturerQuestions, studentQuestions } = s.questionsMentioned;
      if ((lecturerQuestions && lecturerQuestions.length > 0) || (studentQuestions && studentQuestions.length > 0)) {
        md += `## Questions Mentioned\n\n`;
        if (lecturerQuestions && lecturerQuestions.length > 0) {
          md += `### Questions Asked by Lecturer\n`;
          lecturerQuestions.forEach(q => { md += `- ${q}\n`; });
          md += '\n';
        }
        if (studentQuestions && studentQuestions.length > 0) {
          md += `### Questions Asked by Students\n`;
          studentQuestions.forEach(q => { md += `- ${q}\n`; });
          md += '\n';
        }
      }
    }

    if (s.actionItems && s.actionItems.length > 0) {
      md += `## Action Items & Next Steps\n`;
      s.actionItems.forEach(item => {
        md += `- [ ] ${item}\n`;
      });
      md += '\n';
    }

    if (s.unclearPoints && s.unclearPoints.length > 0) {
      md += `## Points Needing Clarification\n`;
      s.unclearPoints.forEach(up => {
        md += `- ❓ ${up}\n`;
      });
      md += '\n';
    }

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
        ) : note.sourceUrl ? (
          <div className="bg-sky-50/70 border border-sky-200/70 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 text-xs text-sky-950">
            <div className="flex items-center space-x-2">
              {note.sourceType === 'URL_VIDEO' ? (
                <Video className="w-4 h-4 text-rose-500 flex-shrink-0" />
              ) : note.sourceType === 'URL_AUDIO' ? (
                <Headphones className="w-4 h-4 text-purple-500 flex-shrink-0" />
              ) : (
                <Globe className="w-4 h-4 text-sky-600 flex-shrink-0" />
              )}
              <span className="font-bold">
                From link:{' '}
                {(() => {
                  try {
                    return new URL(note.sourceUrl).hostname;
                  } catch {
                    return note.sourceUrl;
                  }
                })()}
              </span>
              <span className="text-sky-400 hidden sm:inline">•</span>
              <a
                href={note.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-700 hover:text-sky-900 underline inline-flex items-center space-x-1 font-medium"
              >
                <span>Open original source</span>
                <ExternalLink className="w-3 h-3 ml-0.5 inline" />
              </a>
            </div>
            <span className="text-[11px] font-semibold text-sky-800 bg-sky-100/80 px-2.5 py-0.5 rounded-full">
              Source: {note.sourceType === 'URL_VIDEO' ? 'Online Video' : note.sourceType === 'URL_AUDIO' ? 'Podcast Audio' : 'Web Article'}
            </span>
          </div>
        ) : (
          <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-bold">From recording</span>
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
                  {recording.fileSizeBytes ? `${(recording.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • ` : ''}{recording.audioMimeType || 'audio'}
                </span>
              )}
            </div>
            <audio controls src={audioUrl} className="w-full h-10 rounded-xl" />
          </section>
        )}

        {/* Note Header */}
        <header className="border-b border-slate-100 pb-5 sm:pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5 sm:mb-3">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                {note.subject}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                {note.source === 'user_edited' ? `User Edited (v${note.version || 1})` : `AI Generated (v${note.version || 1})`}
              </span>
            </div>

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

        {/* Key Takeaways */}
        {note.structuredNotes.keyTakeaways && note.structuredNotes.keyTakeaways.length > 0 && (
          <section aria-label="Key Takeaways" className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 sm:p-6 space-y-3">
            <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs sm:text-sm">
              <Key className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Key Takeaways</span>
            </div>
            <ul className="space-y-2">
              {note.structuredNotes.keyTakeaways.map((takeaway, tIdx) => (
                <li key={tIdx} className="flex items-start text-xs sm:text-sm text-slate-800 leading-relaxed">
                  <span className="text-amber-600 font-bold mr-2 leading-none text-base">•</span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Sections */}
        <div className="space-y-6 sm:space-y-8">
          {note.structuredNotes.sections.map((section, idx) => (
            <section key={idx} aria-label={section.title || section.heading} className="space-y-3.5 sm:space-y-4 pt-1 sm:pt-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">
                {section.title || section.heading}
              </h2>

              {/* Core Concept Callout */}
              {section.coreConcept && (
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-950 font-medium">
                  <div className="flex items-center space-x-1.5 font-bold text-indigo-900 mb-1">
                    <Lightbulb className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                    <span>Core Concept</span>
                  </div>
                  <p>{section.coreConcept}</p>
                </div>
              )}

              {/* Explanation */}
              {section.explanation && (
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  {section.explanation}
                </p>
              )}

              {/* Logic or Process */}
              {section.logicOrProcess && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-mono">
                  <span className="font-bold text-slate-900 font-sans block mb-1">⚙️ Process &amp; Logic:</span>
                  <p>{section.logicOrProcess}</p>
                </div>
              )}

              {/* Section Examples */}
              {section.examples && section.examples.length > 0 && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-950">
                  <span className="font-bold text-emerald-900 block mb-1">💡 Examples:</span>
                  <ul className="list-disc list-inside space-y-1">
                    {section.examples.map((ex, exIdx) => (
                      <li key={exIdx}>{ex}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bullet Points / Important Points */}
              <ul className="space-y-2 sm:space-y-2.5 pl-1.5 sm:pl-2">
                {((section.importantPoints && section.importantPoints.length > 0) ? section.importantPoints : (section.points || [])).map((pt, pIdx) => (
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
                      {(def.context || def.added_context) && (
                        <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/80 border border-amber-200/60 text-amber-900/90 text-[10px] sm:text-[11px] font-medium">
                          💡 <span className="ml-1 font-semibold">Context note:</span>&nbsp;{def.context || def.added_context}
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

        {/* Global Definitions */}
        {note.structuredNotes.definitions && note.structuredNotes.definitions.length > 0 && (
          <section aria-label="Key Definitions" className="space-y-3 pt-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 border-l-4 border-amber-500 pl-3">
              Key Terminology &amp; Definitions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {note.structuredNotes.definitions.map((def, dIdx) => (
                <div key={dIdx} className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 text-xs">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-900 mb-1">
                    <Bookmark className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{def.term}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed mb-2 font-medium">{def.definition}</p>
                  {(def.context || def.added_context) && (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-white/80 border border-amber-200/60 text-amber-900 text-[11px]">
                      💡 {def.context || def.added_context}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Formulas */}
        {note.structuredNotes.formulas && note.structuredNotes.formulas.length > 0 && (
          <section aria-label="Formulas" className="space-y-3 pt-2">
            <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm sm:text-base border-l-4 border-indigo-600 pl-3">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span>Formulas &amp; Mathematical Notation</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {note.structuredNotes.formulas.map((f, fIdx) => (
                <div key={fIdx} className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 text-xs space-y-2">
                  <div className="p-3 bg-white rounded-xl border border-indigo-200 font-mono text-xs sm:text-sm text-indigo-950 font-bold overflow-x-auto">
                    {f.formula}
                  </div>
                  {f.meaning && (
                    <p className="text-slate-700"><span className="font-semibold text-slate-900">Meaning:</span> {f.meaning}</p>
                  )}
                  {f.variables && f.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {f.variables.map((v, vIdx) => (
                        <span key={vIdx} className="bg-indigo-100/70 text-indigo-800 text-[11px] font-mono px-2 py-0.5 rounded-md">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                  {f.context && (
                    <p className="text-[11px] text-slate-500 italic">Context: {f.context}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Important Facts */}
        {note.structuredNotes.importantFacts && note.structuredNotes.importantFacts.length > 0 && (
          <section aria-label="Important Facts" className="space-y-3 pt-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 border-l-4 border-slate-600 pl-3">
              Important Facts &amp; Data
            </h2>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <ul className="space-y-2">
                {note.structuredNotes.importantFacts.map((fact, idx) => (
                  <li key={idx} className="flex items-start text-xs sm:text-sm text-slate-700">
                    <span className="text-slate-500 font-bold mr-2">•</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Exam Alerts */}
        {note.structuredNotes.examAlerts && note.structuredNotes.examAlerts.length > 0 && (
          <section aria-label="Exam Alerts" className="space-y-3 pt-2">
            <div className="flex items-center space-x-2 text-red-700 font-bold text-sm sm:text-base border-l-4 border-red-600 pl-3">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Exam Alerts &amp; High-Yield Topics</span>
            </div>
            <div className="space-y-2.5">
              {note.structuredNotes.examAlerts.map((alert, idx) => (
                <div key={idx} className="bg-red-50/80 border border-red-200 rounded-2xl p-3.5 sm:p-4 text-xs space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-red-700 uppercase tracking-wide text-[11px]">
                      ⚡ {alert.topic}
                    </span>
                  </div>
                  {alert.reason && (
                    <p className="text-red-950 font-medium">{alert.reason}</p>
                  )}
                  {alert.evidence && (
                    <p className="text-[11px] text-red-800/90 italic bg-red-100/50 p-2 rounded-lg mt-1">
                      "{alert.evidence}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Questions Mentioned */}
        {note.structuredNotes.questionsMentioned &&
          (((note.structuredNotes.questionsMentioned.lecturerQuestions?.length ?? 0) > 0) ||
           ((note.structuredNotes.questionsMentioned.studentQuestions?.length ?? 0) > 0)) && (
          <section aria-label="Questions Mentioned" className="space-y-3 pt-2">
            <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm sm:text-base border-l-4 border-indigo-500 pl-3">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>Questions Discussed in Lecture</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {note.structuredNotes.questionsMentioned.lecturerQuestions?.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">Lecturer Prompts &amp; Questions:</span>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-700">
                    {note.structuredNotes.questionsMentioned.lecturerQuestions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              {note.structuredNotes.questionsMentioned.studentQuestions?.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">Student Questions:</span>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-700">
                    {note.structuredNotes.questionsMentioned.studentQuestions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Action Items */}
        {note.structuredNotes.actionItems && note.structuredNotes.actionItems.length > 0 && (
          <section aria-label="Action Items" className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 sm:p-6 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs sm:text-sm">
              <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Action Items &amp; Next Steps</span>
            </div>
            <ul className="space-y-2">
              {note.structuredNotes.actionItems.map((item, idx) => (
                <li key={idx} className="flex items-start text-xs sm:text-sm text-emerald-950 font-medium">
                  <span className="inline-block w-4 h-4 mr-2 text-emerald-600">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Unclear Points */}
        {note.structuredNotes.unclearPoints && note.structuredNotes.unclearPoints.length > 0 && (
          <section aria-label="Points Needing Clarification" className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Points Needing Clarification in Transcript</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              {note.structuredNotes.unclearPoints.map((up, idx) => (
                <li key={idx}>{up}</li>
              ))}
            </ul>
          </section>
        )}
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
