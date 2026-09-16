import React, { useState, useMemo, useEffect } from 'react';
import {
  Link2,
  X,
  Globe,
  Video,
  Headphones,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { linkIngestionService, VideoMetadata } from '../services/linkIngestionService';
import { SourceType } from '../types';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, subject?: string, customTitle?: string, transcriptText?: string) => Promise<void> | void;
}

export const AddLinkModal: React.FC<AddLinkModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [url, setUrl] = useState('');
  const [subject, setSubject] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [transcriptText, setTranscriptText] = useState('');
  const [showManualTranscript, setShowManualTranscript] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [videoMeta, setVideoMeta] = useState<VideoMetadata | null>(null);

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

  // Fetch YouTube video metadata via CORS-friendly oEmbed
  useEffect(() => {
    if (!validation.valid || detectedType !== 'URL_VIDEO') {
      setVideoMeta(null);
      return;
    }

    let isMounted = true;
    setIsLoadingMeta(true);

    linkIngestionService.fetchVideoMetadata(trimmedUrl)
      .then((meta) => {
        if (!isMounted) return;
        setVideoMeta(meta);
        if (meta?.title && !customTitle) {
          setCustomTitle(meta.title);
        }
      })
      .catch(() => {
        if (isMounted) setVideoMeta(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMeta(false);
      });

    return () => {
      isMounted = false;
    };
  }, [trimmedUrl, validation.valid, detectedType]);

  if (!isOpen) return null;

  const handleClose = () => {
    setUrl('');
    setSubject('');
    setCustomTitle('');
    setTranscriptText('');
    setVideoMeta(null);
    setSubmitError(null);
    setShowManualTranscript(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid || isSubmitting) return;

    // For YouTube videos, require transcript text because client-side direct scraping is restricted by CORS/DRM
    if (detectedType === 'URL_VIDEO' && !transcriptText.trim()) {
      setSubmitError('Please paste the YouTube transcript or captions into the box below to generate notes from this video.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(
        trimmedUrl,
        subject.trim() || undefined,
        customTitle.trim() || undefined,
        transcriptText.trim() || undefined
      );
      handleClose();
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

  const isVideo = detectedType === 'URL_VIDEO';
  const shouldShowTranscriptArea = isVideo || showManualTranscript;
  const wordCount = transcriptText.trim() ? transcriptText.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative my-8 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-4 flex-shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Create Note from Link</h2>
            <p className="text-xs text-slate-500">Ingest YouTube lectures, audio podcasts, or academic articles</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
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

          {/* YouTube Video Detected Card */}
          {isVideo && (
            <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-2.5">
              <div className="flex items-start space-x-3">
                {videoMeta?.thumbnailUrl && (
                  <img
                    src={videoMeta.thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-16 h-12 rounded-lg object-cover flex-shrink-0 border border-rose-200 shadow-sm"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <Video className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                    <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                      YouTube Video Detected
                    </span>
                    {isLoadingMeta && <Loader2 className="w-3 h-3 text-rose-500 animate-spin" />}
                  </div>
                  {videoMeta?.title ? (
                    <p className="text-xs font-semibold text-slate-800 line-clamp-1 mt-0.5">
                      {videoMeta.title}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 italic mt-0.5">Fetching video details...</p>
                  )}
                  {videoMeta?.authorName && (
                    <p className="text-[10px] text-slate-500">Channel: {videoMeta.authorName}</p>
                  )}
                </div>
              </div>

              {/* YouTube Transcript Guidance Banner */}
              <div className="bg-white/90 p-3 rounded-xl border border-rose-100 text-xs text-slate-700 space-y-1.5 shadow-sm">
                <div className="font-bold flex items-center space-x-1.5 text-rose-700">
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>How to get the transcript from YouTube:</span>
                </div>
                <ol className="list-decimal list-inside text-[11px] text-slate-600 font-normal space-y-0.5 pl-0.5">
                  <li>Open the video on YouTube</li>
                  <li>Click <span className="font-semibold text-slate-800">"... More"</span> below the video title &rarr; <span className="font-semibold text-slate-800">"Show transcript"</span></li>
                  <li>Copy all text from YouTube's transcript panel and paste it below</li>
                </ol>
                <p className="text-[10px] text-slate-400 italic">
                  * Timestamps (e.g. 0:00, 1:23) will be automatically cleaned and removed.
                </p>
              </div>
            </div>
          )}

          {/* Transcript Textarea (Required for YouTube, Optional toggle for other links) */}
          {shouldShowTranscriptArea && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="transcript-input" className="block text-xs font-bold text-slate-700">
                  Lecture Transcript / Captions {isVideo && <span className="text-rose-500">*</span>}
                </label>
                {wordCount > 0 && (
                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
                    {wordCount.toLocaleString()} words ({Math.max(1, Math.round(wordCount / 140))} min lecture)
                  </span>
                )}
              </div>
              <textarea
                id="transcript-input"
                rows={4}
                required={isVideo}
                value={transcriptText}
                onChange={(e) => {
                  setTranscriptText(e.target.value);
                  setSubmitError(null);
                }}
                placeholder={
                  isVideo
                    ? "Paste YouTube video transcript here (timestamps like 0:05 will be cleaned automatically)..."
                    : "Paste article text or lecture transcript here..."
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition font-mono leading-relaxed"
              />
            </div>
          )}

          {/* Optional manual transcript toggle for non-video links */}
          {!isVideo && trimmedUrl.length > 0 && validation.valid && (
            <div>
              <button
                type="button"
                onClick={() => setShowManualTranscript(!showManualTranscript)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1"
              >
                {showManualTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{showManualTranscript ? 'Hide manual text input' : 'Paste transcript or article text manually (Optional)'}</span>
              </button>
            </div>
          )}

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
              onClick={handleClose}
              className="w-1/3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!validation.valid || isSubmitting || (isVideo && !transcriptText.trim())}
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
