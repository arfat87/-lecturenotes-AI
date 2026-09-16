import React, { useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2, X, RotateCcw, Bookmark } from 'lucide-react';
import { Note, StructuredNotes, NoteSection, Definition } from '../types';

interface NoteEditorProps {
  note: Note;
  onSave: (updatedNotes: StructuredNotes) => void;
  onCancel: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onSave,
  onCancel
}) => {
  const [title, setTitle] = useState(note.structuredNotes.title || note.title);
  const [summary, setSummary] = useState(note.structuredNotes.summary);
  const [sections, setSections] = useState<NoteSection[]>(
    JSON.parse(JSON.stringify(note.structuredNotes.sections))
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: title.trim() || 'Untitled Lecture Note',
      summary: summary.trim(),
      sections: sections
    });
  };

  const handleResetToAI = () => {
    if (confirm('Revert all changes to the original AI generated notes?')) {
      setTitle(note.aiOriginalNotes.title);
      setSummary(note.aiOriginalNotes.summary);
      setSections(JSON.parse(JSON.stringify(note.aiOriginalNotes.sections)));
    }
  };

  const addSection = () => {
    setSections([
      ...sections,
      {
        heading: 'New Topic Section',
        points: ['Key concept takeaway point'],
        definitions: []
      }
    ]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, idx) => idx !== index));
  };

  const updateHeading = (index: number, newHeading: string) => {
    const updated = [...sections];
    updated[index].heading = newHeading;
    setSections(updated);
  };

  const updateExamFlag = (index: number, flag: string) => {
    const updated = [...sections];
    updated[index].exam_flag = flag.trim() || undefined;
    setSections(updated);
  };

  const addPoint = (sectionIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].points.push('New key note point');
    setSections(updated);
  };

  const updatePoint = (sectionIndex: number, pointIndex: number, text: string) => {
    const updated = [...sections];
    updated[sectionIndex].points[pointIndex] = text;
    setSections(updated);
  };

  const removePoint = (sectionIndex: number, pointIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].points = updated[sectionIndex].points.filter((_, idx) => idx !== pointIndex);
    setSections(updated);
  };

  const addDefinition = (sectionIndex: number) => {
    const updated = [...sections];
    if (!updated[sectionIndex].definitions) {
      updated[sectionIndex].definitions = [];
    }
    updated[sectionIndex].definitions.push({
      term: 'New Term',
      definition: 'Definition text',
      added_context: null
    });
    setSections(updated);
  };

  const updateDefinition = (sectionIndex: number, defIndex: number, field: keyof Definition, val: string) => {
    const updated = [...sections];
    const def = updated[sectionIndex].definitions[defIndex];
    if (field === 'term') def.term = val;
    else if (field === 'definition') def.definition = val;
    else if (field === 'added_context') def.added_context = val.trim() || null;
    setSections(updated);
  };

  const removeDefinition = (sectionIndex: number, defIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].definitions = updated[sectionIndex].definitions.filter((_, idx) => idx !== defIndex);
    setSections(updated);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fadeIn">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleResetToAI}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              title="Reset to AI synthesized original notes"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>Reset to AI Original</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Note Changes</span>
            </button>
          </div>
        </div>

        {/* General Info Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">General Overview</h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Lecture Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Executive Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Sections Editor */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Topic Sections ({sections.length})</h2>
            <button
              type="button"
              onClick={addSection}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Section</span>
            </button>
          </div>

          {sections.map((section, sIdx) => (
            <div
              key={sIdx}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={section.heading}
                  onChange={(e) => updateHeading(sIdx, e.target.value)}
                  placeholder="Section Heading..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeSection(sIdx)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition"
                  title="Remove section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Bullet Points */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Key Bullet Points
                </label>
                {section.points.map((pt, pIdx) => (
                  <div key={pIdx} className="flex items-center space-x-2">
                    <span className="text-indigo-600 font-bold">•</span>
                    <input
                      type="text"
                      value={pt}
                      onChange={(e) => updatePoint(sIdx, pIdx, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removePoint(sIdx, pIdx)}
                      className="p-1.5 text-slate-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addPoint(sIdx)}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Point</span>
                </button>
              </div>

              {/* Definitions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider">
                    Key Definitions ({section.definitions?.length || 0})
                  </label>
                  <button
                    type="button"
                    onClick={() => addDefinition(sIdx)}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-amber-700 hover:text-amber-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Definition</span>
                  </button>
                </div>

                {section.definitions?.map((def, dIdx) => (
                  <div key={dIdx} className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5 flex-1">
                        <Bookmark className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <input
                          type="text"
                          value={def.term}
                          onChange={(e) => updateDefinition(sIdx, dIdx, 'term', e.target.value)}
                          placeholder="Term"
                          className="w-full px-2.5 py-1 text-xs font-bold bg-white rounded-lg border border-amber-200"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDefinition(sIdx, dIdx)}
                        className="p-1 text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={def.definition}
                      onChange={(e) => updateDefinition(sIdx, dIdx, 'definition', e.target.value)}
                      placeholder="Definition text"
                      className="w-full px-2.5 py-1 text-xs bg-white rounded-lg border border-amber-200"
                    />

                    <input
                      type="text"
                      value={def.added_context || ''}
                      onChange={(e) => updateDefinition(sIdx, dIdx, 'added_context', e.target.value)}
                      placeholder="Context note (optional)"
                      className="w-full px-2.5 py-1 text-[11px] bg-white rounded-lg border border-amber-100 text-slate-600"
                    />
                  </div>
                ))}
              </div>

              {/* Exam Flag */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-red-700 uppercase tracking-wider mb-1">
                  Exam Flag Alert (Optional)
                </label>
                <input
                  type="text"
                  value={section.exam_flag || ''}
                  onChange={(e) => updateExamFlag(sIdx, e.target.value)}
                  placeholder="e.g. Will appear on Midterm 2, remember formulas!"
                  className="w-full px-3.5 py-2 rounded-xl border border-red-200 bg-red-50/30 text-xs sm:text-sm text-red-950 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Save Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-2 px-8 py-3.5 rounded-2xl text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 active:scale-95 transition"
          >
            <Save className="w-5 h-5" />
            <span>Save All Note Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
};
