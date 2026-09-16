import React, { useState, useMemo } from 'react';
import { Link2, X, Globe, Video, Headphones, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { linkIngestionService } from '../services/linkIngestionService';
import { SourceType } from '../types';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, subject?: string, customTitle?: string) => Promise<void> | void;
}

export const AddLinkModal: React.FC<AddLinkModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [url, setUrl] = useState('');
  const [subject, setSubject] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const trimmedUrl = url.trim();

  const validation = useMemo(() => {
    if (!trimmedUrl) {
      return { valid: false, error: null };
    }
    return linkIngestionService.validateUrl(trimmedUrl);
  }, [trimmedUrl]);

  const detectedType: SourceType = useMemo(() => {
    if (!trimmedUrl || !validation.valid) return 'URL_ARTICLE';
    return linkIngestionService.detectSourceType(trimmedUrl).sourceType;
  }, [trimmedUrl, validation.valid]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(trimmedUrl, subject.trim() || undefined, customTitle.trim() || undefined);
      setUrl('');
      setSubject('');
      setCustomTitle('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to ingest URL.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadge = () => {
    switch (detectedType) {
      case 'URL_VIDEO':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Video className="w-3.5 h-3.5 mr-1" />
            <span>YouTube / Online Video</span>
          </span>
        );
      case 'URL_AUDIO':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Headphones className="w-3.5 h-3.5 mr-1" />
            <span>Podcast / Audio Stream</span>
          </span>
        );
      case 'URL_ARTICLE':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Globe className="w-3.5 h-3.5 mr-1" />
            <span>Web Article / Publication</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Create Note from Link</h2>
            <p className="text-xs text-slate-500">Ingest YouTube lectures, audio podcasts, or academic articles</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL Input */}
          <div>
            <label htmlFor="url-input" className="block text-xs font-bold text-slate-700 mb-1.5">
              URL / Link <span className="text-rose-500">*</span>
            </label>
            <input
              id="url-input"
              type="url"
              required
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setSubmitError(null);
              }}
              placeholder="https://www.youtube.com/watch?v=... or https://example.org/article"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition ${
                validation.error
                  ? 'border-rose-300 focus:ring-2 focus:ring-rose-200 bg-rose-50/20'
                  : 'border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400'
              }`}
              autoFocus
            />

            {/* Validation Feedback & Detected Type */}
            {trimmedUrl.length > 0 && (
              <div className="mt-2 flex items-center justify-between">
                {validation.valid ? (
                  <div className="flex items-center space-x-1.5 text-xs text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Valid public URL</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5 text-xs text-rose-600">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{validation.error}</span>
                  </div>
                )}

                {validation.valid && getTypeBadge()}
              </div>
            )}
          </div>

          {/* Subject Field */}
          <div>
            <label htmlFor="subject-input" className="block text-xs font-bold text-slate-700 mb-1.5">
              Subject / Course <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              id="subject-input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Biology 101, Computer Science, Economics"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
            />
          </div>

          {/* Custom Title Field */}
          <div>
            <label htmlFor="title-input" className="block text-xs font-bold text-slate-700 mb-1.5">
              Custom Title <span className="text-slate-400 font-normal">(Optional, will auto-detect from page)</span>
            </label>
            <input
              id="title-input"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Intro to Neural Networks - Lecture 3"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
            />
          </div>

          {/* Submission Error Banner */}
          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Pipeline Note */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-600 text-[11px] leading-relaxed">
            <span className="font-bold text-slate-800 block mb-0.5">Two-Stage Pipeline Rule:</span>
            Content is strictly extracted verbatim first. Note generation only proceeds if genuine lecture text is verified.
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!validation.valid || isSubmitting}
              className="w-2/3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition flex items-center justify-center space-x-1.5 min-h-[42px]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Ingesting Link...' : 'Generate Notes from Link'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
