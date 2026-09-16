import React, { useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2, X, RotateCcw, Bookmark, Key, Calculator, AlertTriangle, CheckSquare } from 'lucide-react';
import { Note, StructuredNotes, NoteSection, Definition, Formula, ExamAlert, ExampleGlobal, QuestionsMentioned } from '../types';

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
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>(
    JSON.parse(JSON.stringify(note.structuredNotes.keyTakeaways || []))
  );
  const [sections, setSections] = useState<NoteSection[]>(
    JSON.parse(JSON.stringify(note.structuredNotes.sections || []))
  );
  const [definitions, setDefinitions] = useState<Definition[]>(
    JSON.parse(JSON.stringify(note.structuredNotes.definitions || []))
  );
  const [examplesGlobal, setExamplesGlobal] = useState<ExampleGlobal[]>(
    JSON.parse(JSON.stringify(note.structuredNotes.examplesGlobal || []))
  );
  const [formulas, setFormulas] = useState<Formula[]>(
    JSON.parse(JSON.stringify(note.structuredNotes.formulas || []))
  );
  const [importantFacts, setImportantFacts] = useState<string[]>(
    JSON.parse(JSON.stringify(note.structuredNotes.importantFacts || []))
  );
  const [examAlerts, setExamAlerts] = useState<ExamAlert[]>(
    JSON.parse(JSON.stringify(note.structuredNotes.examAlerts || []))
  );
  const [questionsMentioned, setQuestionsMentioned] = useState<QuestionsMentioned>(
    JSON.parse(JSON.stringify(note.structuredNotes.questionsMentioned || { lecturerQuestions: [], studentQuestions: [] }))
  );
  const [actionItems, setActionItems] = useState<string[]>(
    JSON.parse(JSON.stringify(note.structuredNotes.actionItems || []))
  );
  const [unclearPoints, setUnclearPoints] = useState<string[]>(
    JSON.parse(JSON.stringify(note.structuredNotes.unclearPoints || []))
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: title.trim() || 'Untitled Lecture Note',
      summary: summary.trim(),
      keyTakeaways: keyTakeaways.filter(k => k.trim().length > 0),
      sections: sections.map(s => {
        const titleVal = s.title || s.heading || 'New Section';
        const pointsList = (s.importantPoints && s.importantPoints.length > 0) ? s.importantPoints : (s.points || []);
        return {
          ...s,
          title: titleVal,
          heading: titleVal,
          importantPoints: pointsList,
          points: pointsList,
          examples: s.examples || [],
          definitions: s.definitions || []
        };
      }),
      definitions,
      examplesGlobal,
      formulas,
      importantFacts,
      examAlerts,
      questionsMentioned,
      actionItems: actionItems.filter(a => a.trim().length > 0),
      unclearPoints
    });
  };

  const handleResetToAI = () => {
    if (confirm('Revert all changes to the original AI generated notes?')) {
      const orig = note.aiOriginalNotes;
      setTitle(orig.title || note.title);
      setSummary(orig.summary || '');
      setKeyTakeaways(JSON.parse(JSON.stringify(orig.keyTakeaways || [])));
      setSections(JSON.parse(JSON.stringify(orig.sections || [])));
      setDefinitions(JSON.parse(JSON.stringify(orig.definitions || [])));
      setExamplesGlobal(JSON.parse(JSON.stringify(orig.examplesGlobal || [])));
      setFormulas(JSON.parse(JSON.stringify(orig.formulas || [])));
      setImportantFacts(JSON.parse(JSON.stringify(orig.importantFacts || [])));
      setExamAlerts(JSON.parse(JSON.stringify(orig.examAlerts || [])));
      setQuestionsMentioned(JSON.parse(JSON.stringify(orig.questionsMentioned || { lecturerQuestions: [], studentQuestions: [] })));
      setActionItems(JSON.parse(JSON.stringify(orig.actionItems || [])));
      setUnclearPoints(JSON.parse(JSON.stringify(orig.unclearPoints || [])));
    }
  };

  const addSection = () => {
    setSections([
      ...sections,
      {
        title: 'New Topic Section',
        heading: 'New Topic Section',
        coreConcept: '',
        explanation: '',
        logicOrProcess: '',
        examples: [],
        importantPoints: ['Key concept takeaway point'],
        points: ['Key concept takeaway point'],
        definitions: []
      }
    ]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, idx) => idx !== index));
  };

  const updateSectionField = (index: number, field: keyof NoteSection, val: any) => {
    const updated = [...sections];
    (updated[index] as any)[field] = val;
    if (field === 'title') {
      updated[index].heading = val;
    } else if (field === 'heading') {
      updated[index].title = val;
    }
    setSections(updated);
  };

  const addPoint = (sectionIndex: number) => {
    const updated = [...sections];
    const pts = updated[sectionIndex].importantPoints || updated[sectionIndex].points || [];
    const nextPts = [...pts, 'New key note point'];
    updated[sectionIndex].importantPoints = nextPts;
    updated[sectionIndex].points = nextPts;
    setSections(updated);
  };

  const updatePoint = (sectionIndex: number, pointIndex: number, text: string) => {
    const updated = [...sections];
    const pts = [...(updated[sectionIndex].importantPoints || updated[sectionIndex].points || [])];
    pts[pointIndex] = text;
    updated[sectionIndex].importantPoints = pts;
    updated[sectionIndex].points = pts;
    setSections(updated);
  };

  const removePoint = (sectionIndex: number, pointIndex: number) => {
    const updated = [...sections];
    const pts = (updated[sectionIndex].importantPoints || updated[sectionIndex].points || []).filter((_, idx) => idx !== pointIndex);
    updated[sectionIndex].importantPoints = pts;
    updated[sectionIndex].points = pts;
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
      context: '',
      added_context: null
    });
    setSections(updated);
  };

  const updateDefinition = (sectionIndex: number, defIndex: number, field: keyof Definition, val: string) => {
    const updated = [...sections];
    const def = updated[sectionIndex].definitions?.[defIndex];
    if (def) {
      if (field === 'term') def.term = val;
      else if (field === 'definition') def.definition = val;
      else if (field === 'context') def.context = val;
      else if (field === 'added_context') def.added_context = val.trim() || null;
      setSections(updated);
    }
  };

  const removeDefinition = (sectionIndex: number, defIndex: number) => {
    const updated = [...sections];
    if (updated[sectionIndex].definitions) {
      updated[sectionIndex].definitions = updated[sectionIndex].definitions!.filter((_, idx) => idx !== defIndex);
      setSections(updated);
    }
  };

  // Key Takeaways helper handlers
  const addTakeaway = () => {
    setKeyTakeaways([...keyTakeaways, 'New key takeaway point']);
  };
  const updateTakeaway = (idx: number, val: string) => {
    const updated = [...keyTakeaways];
    updated[idx] = val;
    setKeyTakeaways(updated);
  };
  const removeTakeaway = (idx: number) => {
    setKeyTakeaways(keyTakeaways.filter((_, i) => i !== idx));
  };

  // Action Items helper handlers
  const addActionItem = () => {
    setActionItems([...actionItems, 'New follow-up action item']);
  };
  const updateActionItem = (idx: number, val: string) => {
    const updated = [...actionItems];
    updated[idx] = val;
    setActionItems(updated);
  };
  const removeActionItem = (idx: number) => {
    setActionItems(actionItems.filter((_, i) => i !== idx));
  };

  // Formulas helper handlers
  const addFormula = () => {
    setFormulas([...formulas, { formula: 'Formula equation', meaning: '', variables: [], context: '' }]);
  };
  const updateFormula = (idx: number, field: keyof Formula, val: any) => {
    const updated = [...formulas];
    (updated[idx] as any)[field] = val;
    setFormulas(updated);
  };
  const removeFormula = (idx: number) => {
    setFormulas(formulas.filter((_, i) => i !== idx));
  };

  // Exam Alerts helper handlers
  const addExamAlert = () => {
    setExamAlerts([...examAlerts, { topic: 'Exam Topic', reason: 'Emphasized in lecture', evidence: '' }]);
  };
  const updateExamAlert = (idx: number, field: keyof ExamAlert, val: string) => {
    const updated = [...examAlerts];
    (updated[idx] as any)[field] = val;
    setExamAlerts(updated);
  };
  const removeExamAlert = (idx: number) => {
    setExamAlerts(examAlerts.filter((_, i) => i !== idx));
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

        {/* Key Takeaways Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-900 font-bold text-base">
              <Key className="w-4 h-4 text-amber-600" />
              <span>Key Takeaways ({keyTakeaways.length})</span>
            </div>
            <button
              type="button"
              onClick={addTakeaway}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Takeaway</span>
            </button>
          </div>

          <div className="space-y-2">
            {keyTakeaways.map((takeaway, tIdx) => (
              <div key={tIdx} className="flex items-center space-x-2">
                <span className="text-amber-600 font-bold text-base leading-none">•</span>
                <input
                  type="text"
                  value={takeaway}
                  onChange={(e) => updateTakeaway(tIdx, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeTakeaway(tIdx)}
                  className="p-1.5 text-slate-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Topic Sections Editor */}
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
                  value={section.title || section.heading}
                  onChange={(e) => updateSectionField(sIdx, 'title', e.target.value)}
                  placeholder="Section Title / Heading..."
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

              {/* Core Concept */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Core Concept (Optional)
                </label>
                <input
                  type="text"
                  value={section.coreConcept || ''}
                  onChange={(e) => updateSectionField(sIdx, 'coreConcept', e.target.value)}
                  placeholder="Central concept or core intuition..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Explanation (Optional)
                </label>
                <textarea
                  value={section.explanation || ''}
                  onChange={(e) => updateSectionField(sIdx, 'explanation', e.target.value)}
                  rows={2}
                  placeholder="Clear conceptual explanation..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Logic or Process */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Logic / Process Steps (Optional)
                </label>
                <input
                  type="text"
                  value={section.logicOrProcess || ''}
                  onChange={(e) => updateSectionField(sIdx, 'logicOrProcess', e.target.value)}
                  placeholder="Step 1 -> Step 2 -> Step 3..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Bullet Points */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Important Points
                </label>
                {(section.importantPoints || section.points || []).map((pt, pIdx) => (
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
                      value={def.context || def.added_context || ''}
                      onChange={(e) => {
                        updateDefinition(sIdx, dIdx, 'context', e.target.value);
                        updateDefinition(sIdx, dIdx, 'added_context', e.target.value);
                      }}
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
                  onChange={(e) => updateSectionField(sIdx, 'exam_flag', e.target.value.trim() || null)}
                  placeholder="e.g. Will appear on Midterm 2, remember formulas!"
                  className="w-full px-3.5 py-2 rounded-xl border border-red-200 bg-red-50/30 text-xs sm:text-sm text-red-950 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Formulas Editor */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-indigo-900 font-bold text-base">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span>Formulas &amp; Equations ({formulas.length})</span>
            </div>
            <button
              type="button"
              onClick={addFormula}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Formula</span>
            </button>
          </div>

          <div className="space-y-3">
            {formulas.map((f, fIdx) => (
              <div key={fIdx} className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={f.formula}
                    onChange={(e) => updateFormula(fIdx, 'formula', e.target.value)}
                    placeholder="Formula (e.g. J(theta) = 1/2 sum(h(x) - y)^2)"
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white rounded-lg border border-indigo-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeFormula(fIdx)}
                    className="p-1.5 text-slate-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={f.meaning}
                  onChange={(e) => updateFormula(fIdx, 'meaning', e.target.value)}
                  placeholder="Meaning or explanation"
                  className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-indigo-100"
                />
                <input
                  type="text"
                  value={f.context}
                  onChange={(e) => updateFormula(fIdx, 'context', e.target.value)}
                  placeholder="Context / conditions"
                  className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-indigo-100"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Exam Alerts Editor */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-red-700 font-bold text-base">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Exam Alerts ({examAlerts.length})</span>
            </div>
            <button
              type="button"
              onClick={addExamAlert}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Exam Alert</span>
            </button>
          </div>

          <div className="space-y-3">
            {examAlerts.map((alert, aIdx) => (
              <div key={aIdx} className="p-4 bg-red-50/40 border border-red-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={alert.topic}
                    onChange={(e) => updateExamAlert(aIdx, 'topic', e.target.value)}
                    placeholder="Topic / Concept"
                    className="w-full px-3 py-1.5 text-xs font-bold text-red-900 bg-white rounded-lg border border-red-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeExamAlert(aIdx)}
                    className="p-1.5 text-slate-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={alert.reason}
                  onChange={(e) => updateExamAlert(aIdx, 'reason', e.target.value)}
                  placeholder="Why is it important for exams?"
                  className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-red-100"
                />
                <input
                  type="text"
                  value={alert.evidence}
                  onChange={(e) => updateExamAlert(aIdx, 'evidence', e.target.value)}
                  placeholder="Evidence / instructor quote from transcript"
                  className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-red-100 text-slate-600"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Action Items Editor */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-900 font-bold text-base">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <span>Action Items &amp; Next Steps ({actionItems.length})</span>
            </div>
            <button
              type="button"
              onClick={addActionItem}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Action Item</span>
            </button>
          </div>

          <div className="space-y-2">
            {actionItems.map((item, aIdx) => (
              <div key={aIdx} className="flex items-center space-x-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateActionItem(aIdx, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeActionItem(aIdx)}
                  className="p-1.5 text-slate-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
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
