import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Square, Pause, Play, AlertCircle, Sparkles } from 'lucide-react';
import { Recording } from '../types';
import { storageService } from '../services/storageService';

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingSaved: (recordingId: string) => void;
  userId: string;
}

export const RecordingModal: React.FC<RecordingModalProps> = ({
  isOpen,
  onClose,
  onRecordingSaved,
  userId
}) => {
  const [subject, setSubject] = useState('Computer Science 106B');
  const [title, setTitle] = useState('Graph Algorithms & Shortest Paths');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopAndCleanup();
      setErrorMessage(null);
    }
  }, [isOpen]);

  const startRecording = async () => {
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Audio recording is not supported in this browser environment. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);

      // Web Audio API Visualizer
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      setIsRecording(true);
      setIsPaused(false);
      setElapsedSeconds(0);

      drawWaveform();

      timerIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error('Microphone permission error:', err);
      setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser to record lectures.');
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9 + 4;

        ctx.fillStyle = isRecording ? '#4F46E5' : '#CBD5E1';
        ctx.beginPath();
        ctx.roundRect(x, (canvas.height - barHeight) / 2, Math.max(3, barWidth - 3), barHeight, 4);
        ctx.fill();

        x += barWidth;
      }
    };

    render();
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsPaused(true);
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
    timerIntervalRef.current = window.setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    setIsPaused(false);
  };

  const finishRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      setErrorMessage('No active recording found to finish.');
      return;
    }

    if (elapsedSeconds < 2) {
      setErrorMessage('Lecture recording is too short (less than 2 seconds). Please speak your lecture points before finishing.');
      return;
    }

    setIsSaving(true);

    mediaRecorderRef.current.onstop = async () => {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      if (audioBlob.size === 0) {
        setIsSaving(false);
        setErrorMessage('Failed to capture audio data (0 bytes recorded). Please check microphone input and try again.');
        return;
      }

      const recId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const recording: Recording = {
        id: recId,
        userId: userId,
        subject: subject.trim() || 'General Course',
        title: title.trim() || 'Lecture Recording',
        durationSeconds: elapsedSeconds,
        audioMimeType: mimeType,
        fileSizeBytes: audioBlob.size,
        createdAt: Date.now(),
        status: 'STOPPED'
      };

      try {
        await storageService.saveRecording(recording, audioBlob);
        stopAndCleanup();
        setIsSaving(false);
        onRecordingSaved(recId);
      } catch (saveErr) {
        console.error('Failed to save audio recording to IndexedDB:', saveErr);
        setIsSaving(false);
        setErrorMessage('Failed to save audio recording to persistent storage.');
      }
    };

    mediaRecorderRef.current.stop();
  };

  const stopAndCleanup = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setIsPaused(false);
    setElapsedSeconds(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col justify-between max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Lecture Audio Capture</h2>
            <p className="text-xs text-slate-500">Record genuine lecture audio directly from your microphone</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="py-5 space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Course / Subject Name
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isRecording}
              placeholder="e.g. Organic Chemistry, CS 106B"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Lecture Topic / Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Nucleophilic Substitution, Graph Algorithms"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Waveform Canvas & Timer */}
        <div className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center my-2 border border-slate-100">
          <canvas
            ref={canvasRef}
            width={300}
            height={60}
            className="w-full h-16 max-w-xs mb-3"
          />

          <div className="text-4xl font-extrabold font-mono tracking-tight text-slate-900">
            {formatDuration(elapsedSeconds)}
          </div>

          <div className="mt-2.5">
            <span
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                !isRecording
                  ? 'bg-slate-200/80 text-slate-700'
                  : isPaused
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-red-100 text-red-700 animate-pulse'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${!isRecording ? 'bg-slate-400' : isPaused ? 'bg-amber-500' : 'bg-red-600'}`} />
              <span>{!isRecording ? 'READY TO RECORD' : isPaused ? 'RECORDING PAUSED' : 'RECORDING LIVE'}</span>
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-3 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-2.5 text-xs text-red-900 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-4 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center space-x-2 text-xs text-indigo-800">
          <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span>Real audio is required. Gemini transcribes spoken speech before synthesizing study notes.</span>
        </div>

        {/* Control Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center space-x-2.5 px-8 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-base shadow-lg shadow-red-600/25 active:scale-95 transition-all min-h-[48px]"
            >
              <Mic className="w-5 h-5" />
              <span>Start Live Recording</span>
            </button>
          ) : (
            <>
              <button
                onClick={isPaused ? resumeRecording : pauseRecording}
                className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold active:scale-95 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                title={isPaused ? 'Resume' : 'Pause'}
                aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
              >
                {isPaused ? <Play className="w-5 h-5 fill-slate-700" /> : <Pause className="w-5 h-5" />}
              </button>

              <button
                disabled={isSaving}
                onClick={finishRecording}
                className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition min-h-[44px]"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>{isSaving ? 'Saving Audio...' : 'Finish & Create Notes'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
