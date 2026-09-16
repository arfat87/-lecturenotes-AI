import type { Note, ProcessingJob } from '../types';
import { storageService } from './storageService';
import { transcriptionService } from './transcriptionService';
import { synthesisService } from './synthesisService';

class PipelineService {
  private activeJobs: Set<string> = new Set();

  /**
   * Complete, robust 13-step pipeline converting a real audio recording into structured notes.
   */
  async createNoteFromRecording(
    recordingId: string,
    onJobUpdate?: (job: ProcessingJob) => void
  ): Promise<Note> {
    // Lock check (prevent duplicate concurrent jobs on same recording)
    if (this.activeJobs.has(recordingId)) {
      throw new Error('A note generation job is already in progress for this recording.');
    }

    this.activeJobs.add(recordingId);

    const updateJob = (stage: ProcessingJob['stage'], progressMessage: string, error?: string | null) => {
      if (onJobUpdate) {
        onJobUpdate({ recordingId, stage, progressMessage, error });
      }
    };

    try {
      // 1. Verify recording exists
      updateJob('VALIDATING', 'Retrieving and validating recording metadata...');
      const recording = await storageService.getRecording(recordingId);
      if (!recording) {
        throw new Error(`Recording ${recordingId} was not found in storage.`);
      }

      // 2. Verify recording status is not already completed
      if (recording.noteId) {
        const existingNote = await storageService.getNote(recording.noteId);
        if (existingNote) {
          this.activeJobs.delete(recordingId);
          return existingNote;
        }
      }

      // 3. Verify recording has actual audio data
      if (!recording.audioBlob || recording.audioBlob.size === 0) {
        throw new Error('Recording has no audio data (0 bytes). Please record the lecture again.');
      }

      // 4. Verify recording duration is valid
      if (recording.durationSeconds <= 0) {
        throw new Error('Recording duration is invalid (0 seconds).');
      }

      // 5. Update recording status to TRANSCRIBING
      recording.status = 'TRANSCRIBING';
      recording.errorMessage = null;
      await storageService.saveRecording(recording, recording.audioBlob);

      // 6. Transcribe the actual audio recording (Stage 1)
      updateJob('TRANSCRIBING', 'Transcribing spoken lecture audio to verbatim text...');
      const transcript = await transcriptionService.transcribeRecording(
        recording,
        recording.audioBlob,
        (msg) => updateJob('TRANSCRIBING', msg)
      );

      // 7. Verify transcript exists and is non-empty
      if (!transcript || !transcript.text || transcript.text.trim().length === 0) {
        throw new Error('Transcription yielded an empty transcript. Lecture speech could not be recognized.');
      }

      // Save transcript
      await storageService.saveTranscript(transcript);
      recording.transcriptId = transcript.id;

      // 8. Synthesize structured notes from verified transcript (Stage 2)
      recording.status = 'SYNTHESIZING';
      await storageService.saveRecording(recording, recording.audioBlob);
      updateJob('SYNTHESIZING', 'Synthesizing structured study notes, definitions & exam highlights...');

      const structuredNotes = await synthesisService.synthesizeNotes(
        recording,
        transcript,
        (msg) => updateJob('SYNTHESIZING', msg)
      );

      // 9. Format duration
      const mins = Math.floor(recording.durationSeconds / 60);
      const formattedDuration = recording.durationSeconds > 0
        ? (mins === 0 ? `${recording.durationSeconds}s` : `${mins} mins`)
        : '45 mins';

      const formattedDate = new Date(recording.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });

      // 10. Assemble Note with provenance relationships
      const note: Note = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recordingId: recording.id,
        transcriptId: transcript.id,
        userId: recording.userId,
        subject: recording.subject,
        title: structuredNotes.title || recording.title,
        date: formattedDate,
        durationFormatted: formattedDuration,
        durationSeconds: recording.durationSeconds,
        transcriptText: transcript.text,
        structuredNotes: structuredNotes,
        aiOriginalNotes: JSON.parse(JSON.stringify(structuredNotes)),
        userEditedNotes: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDemo: false
      };

      // 11. Save the note & update recording status to COMPLETED
      await storageService.saveNote(note);

      recording.status = 'COMPLETED';
      recording.noteId = note.id;
      await storageService.saveRecording(recording, recording.audioBlob);

      updateJob('COMPLETED', 'Notes ready!');
      return note;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred during note creation.';
      console.error('Note creation pipeline failed for recording', recordingId, errorMsg);

      // Update recording state to FAILED without deleting the audio
      const rec = await storageService.getRecording(recordingId);
      if (rec) {
        rec.status = 'FAILED';
        rec.errorMessage = errorMsg;
        await storageService.saveRecording(rec, rec.audioBlob);
      }

      updateJob('FAILED', 'Failed to generate note.', errorMsg);
      throw new Error(errorMsg);
    } finally {
      this.activeJobs.delete(recordingId);
    }
  }

  /**
   * Regenerates structured notes from the existing original transcript.
   */
  async regenerateNote(noteId: string): Promise<Note> {
    const note = await storageService.getNote(noteId);
    if (!note) throw new Error('Note not found.');

    const recording = await storageService.getRecording(note.recordingId);
    if (!recording) throw new Error('Source recording not found.');

    const transcript = await storageService.getTranscript(note.transcriptId);
    if (!transcript) throw new Error('Source transcript not found.');

    const freshNotes = await synthesisService.synthesizeNotes(recording, transcript);

    const updatedNote: Note = {
      ...note,
      title: freshNotes.title,
      structuredNotes: freshNotes,
      aiOriginalNotes: JSON.parse(JSON.stringify(freshNotes)),
      userEditedNotes: null,
      updatedAt: Date.now()
    };

    await storageService.saveNote(updatedNote);
    return updatedNote;
  }

  /**
   * Retries note creation for a failed recording using its original saved audio.
   */
  async retryProcessing(recordingId: string, onJobUpdate?: (job: ProcessingJob) => void): Promise<Note> {
    return this.createNoteFromRecording(recordingId, onJobUpdate);
  }
}

export const pipelineService = new PipelineService();
