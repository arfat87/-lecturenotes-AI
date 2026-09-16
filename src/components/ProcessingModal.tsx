import React from 'react';
import { Sparkles, CloudUpload, AudioWaveform, Brain, Check, AlertCircle, RefreshCw, X } from 'lucide-react';
import { ProcessingJob } from '../types';

interface ProcessingModalProps {
  job: ProcessingJob;
  onRetry: () => void;
  onCancel: () => void;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
  job,
  onRetry,
  onCancel
}) => {
  const getStepNumber = () => {
    switch (job.stage) {
      case 'VALIDATING': return 1;
      case 'TRANSCRIBING': return 2;
      case 'SYNTHESIZING': return 3;
      case 'COMPLETED': return 4;
      default: return 1;
    }
  };

  const currentStep = getStepNumber();
  const isFailed = job.stage === 'FAILED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center relative">
        {/* Close/Dismiss Button */}
        {isFailed && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Status Graphic */}
        <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
          {isFailed ? (
            <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
          ) : (
            <>
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
                <Sparkles className="w-8 h-8 animate-spin-slow" />
              </div>
            </>
          )}
        </div>

        <h2 className="text-xl font-extrabold text-slate-900">
          {isFailed ? 'Note Generation Failed' : 'Processing Lecture Recording'}
        </h2>
        <p className="mt-1.5 text-xs text-slate-500 font-medium">
          {job.progressMessage || 'Processing with Gemini 2.0 Flash...'}
        </p>

        {isFailed && job.error && (
          <div className="mt-4 p-3.5 bg-red-50/90 border border-red-200 rounded-2xl text-left text-xs text-red-900">
            <span className="font-bold block mb-1">Reason:</span>
            <span>{job.error}</span>
          </div>
        )}

        {/* Stepper Card */}
        {!isFailed && (
          <div className="mt-6 bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-3">
            <StepRow
              title="1. Validating Audio File"
              description="Ensuring non-empty microphone data"
              icon={CloudUpload}
              isComplete={currentStep > 1}
              isCurrent={currentStep === 1}
            />
            <StepRow
              title="2. Speech-to-Text Transcription"
              description="Faithful verbatim transcription"
              icon={AudioWaveform}
              isComplete={currentStep > 2}
              isCurrent={currentStep === 2}
            />
            <StepRow
              title="3. Academic Note Synthesis"
              description="Extracting definitions & exam callouts"
              icon={Brain}
              isComplete={currentStep > 3}
              isCurrent={currentStep === 3}
            />
          </div>
        )}

        {/* Action Controls for Failure State */}
        {isFailed && (
          <div className="mt-6 space-y-2.5">
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Note Generation</span>
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              Keep Recording for Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const StepRow: React.FC<{
  title: string;
  description: string;
  icon: React.ElementType;
  isComplete: boolean;
  isCurrent: boolean;
}> = ({ title, description, icon: Icon, isComplete, isCurrent }) => {
  return (
    <div className="flex items-center space-x-3 p-2 rounded-xl transition-all">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs ${
          isComplete
            ? 'bg-emerald-500 text-white'
            : isCurrent
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 ring-4 ring-indigo-100 animate-pulse'
            : 'bg-slate-200 text-slate-500'
        }`}
      >
        {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={`text-xs font-bold ${isCurrent || isComplete ? 'text-slate-900' : 'text-slate-500'}`}>
          {title}
        </h4>
        <p className="text-[11px] text-slate-400 truncate">{description}</p>
      </div>
    </div>
  );
};
