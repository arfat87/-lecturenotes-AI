import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HomeScreen } from './components/HomeScreen';
import { RecordingModal } from './components/RecordingModal';
import { ProcessingModal } from './components/ProcessingModal';
import { NoteViewer } from './components/NoteViewer';
import { NoteEditor } from './components/NoteEditor';
import { SearchModal } from './components/SearchModal';
import { AuthModal } from './components/AuthModal';
import { Note, Recording, StructuredNotes, UserAccount, ProcessingJob } from './types';
import { storageService } from './services/storageService';
import { pipelineService } from './services/pipelineService';

export const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [user, setUser] = useState<UserAccount>(storageService.getUser());
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [viewState, setViewState] = useState<'HOME' | 'VIEW' | 'EDIT'>('HOME');

  // Modals & Background processing state
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeJob, setActiveJob] = useState<ProcessingJob | null>(null);

  const refreshData = useCallback(() => {
    setNotes(storageService.getNotes());
    setRecordings(storageService.getRecordings());
  }, []);

  useEffect(() => {
    const initApp = async () => {
      await storageService.init();
      refreshData();
    };
    initApp();
  }, [refreshData]);

  // Keyboard shortcut for search (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handler when audio recording is finalized & saved in IndexedDB
  const handleRecordingSaved = async (recordingId: string) => {
    setIsRecordOpen(false);
    refreshData();

    setActiveJob({
      recordingId,
      stage: 'VALIDATING',
      progressMessage: 'Validating saved audio recording...'
    });

    try {
      const generatedNote = await pipelineService.createNoteFromRecording(
        recordingId,
        (job) => setActiveJob(job)
      );

      refreshData();
      setSelectedNote(generatedNote);
      setActiveJob(null);
      setViewState('VIEW');
    } catch (err: unknown) {
      console.error('Pipeline processing error in App:', err);
      refreshData();
      // Keep activeJob in FAILED stage so ProcessingModal offers Retry
      const errorMsg = err instanceof Error ? err.message : 'Processing failed.';
      setActiveJob({
        recordingId,
        stage: 'FAILED',
        progressMessage: 'Pipeline failed.',
        error: errorMsg
      });
    }
  };

  // Retry generating note for an existing failed recording
  const handleRetryProcessing = async (recordingId: string) => {
    setActiveJob({
      recordingId,
      stage: 'VALIDATING',
      progressMessage: 'Retrying verification and synthesis pipeline...'
    });

    try {
      const generatedNote = await pipelineService.retryProcessing(
        recordingId,
        (job) => setActiveJob(job)
      );

      refreshData();
      setSelectedNote(generatedNote);
      setActiveJob(null);
      setViewState('VIEW');
    } catch (err: unknown) {
      console.error('Retry failed:', err);
      refreshData();
      const errorMsg = err instanceof Error ? err.message : 'Retry failed.';
      setActiveJob({
        recordingId,
        stage: 'FAILED',
        progressMessage: 'Retry failed.',
        error: errorMsg
      });
    }
  };

  const handleRegenerateNote = async (noteId: string) => {
    try {
      const updated = await pipelineService.regenerateNote(noteId);
      refreshData();
      setSelectedNote(updated);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Regeneration failed.';
      alert(`Could not regenerate notes: ${errorMsg}`);
    }
  };

  const handleSaveEditedNotes = async (updatedNotes: StructuredNotes) => {
    if (!selectedNote) return;
    const isReset = JSON.stringify(updatedNotes) === JSON.stringify(selectedNote.aiOriginalNotes);
    const updated: Note = {
      ...selectedNote,
      title: updatedNotes.title,
      structuredNotes: updatedNotes,
      userEditedNotes: isReset ? null : updatedNotes,
      source: isReset ? 'ai_generated' : 'user_edited',
      updatedAt: Date.now()
    };
    await storageService.saveNote(updated);
    refreshData();
    setSelectedNote(updated);
    setViewState('VIEW');
  };

  const handleDeleteNote = async (id: string) => {
    await storageService.deleteNote(id);
    refreshData();
    if (selectedNote?.id === id) {
      setSelectedNote(null);
      setViewState('HOME');
    }
  };

  const handleDeleteRecording = async (id: string) => {
    await storageService.deleteRecording(id);
    refreshData();
  };

  const handleUpdateUser = (updatedUser: UserAccount) => {
    storageService.saveUser(updatedUser);
    setUser(updatedUser);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar
        user={user}
        onOpenRecord={() => setIsRecordOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <div className="flex-1">
        {viewState === 'HOME' && (
          <HomeScreen
            notes={notes}
            recordings={recordings}
            onSelectNote={(note) => {
              setSelectedNote(note);
              setViewState('VIEW');
            }}
            onRetryRecording={handleRetryProcessing}
            onDeleteNote={handleDeleteNote}
            onDeleteRecording={handleDeleteRecording}
            onOpenRecord={() => setIsRecordOpen(true)}
          />
        )}

        {viewState === 'VIEW' && selectedNote && (
          <NoteViewer
            note={selectedNote}
            onBack={() => setViewState('HOME')}
            onEdit={() => setViewState('EDIT')}
            onDelete={handleDeleteNote}
            onRegenerate={handleRegenerateNote}
          />
        )}

        {viewState === 'EDIT' && selectedNote && (
          <NoteEditor
            note={selectedNote}
            onSave={handleSaveEditedNotes}
            onCancel={() => setViewState('VIEW')}
          />
        )}
      </div>

      {/* Recording Modal */}
      <RecordingModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        onRecordingSaved={handleRecordingSaved}
        userId={user.userId}
      />

      {/* Processing AI Modal */}
      {activeJob && (
        <ProcessingModal
          job={activeJob}
          onRetry={() => handleRetryProcessing(activeJob.recordingId)}
          onCancel={() => setActiveJob(null)}
        />
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        notes={notes}
        onSelectNote={(note) => {
          setSelectedNote(note);
          setViewState('VIEW');
        }}
      />

      {/* Auth / Profile Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={user}
        onUpdateUser={handleUpdateUser}
      />
    </div>
  );
};
export default App;
