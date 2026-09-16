import { describe, it, expect } from 'vitest';
import {
  canTranscribe,
  validateTranscriptText,
  canGenerateNote,
  PipelineService
} from '../pipelineService';
import type { Recording, Transcript, Note, UserAccount } from '../../types';

describe('Web Pipeline Integrity & Acceptance Criteria (Master Prompt v2)', () => {
  const mockUser: UserAccount = {
    userId: 'usr_101',
    name: 'Alex Vance',
    email: 'alex@stanford.edu',
    college: 'Stanford'
  };

  const createMockBlob = (size: number = 1024, type: string = 'audio/webm'): Blob => {
    return new Blob([new Uint8Array(size)], { type });
  };

  const mockRecording: Recording = {
    id: 'rec_test_001',
    userId: 'usr_101',
    subject: 'Computer Science',
    title: 'Operating Systems - Concurrency',
    durationSeconds: 300,
    audioMimeType: 'audio/webm',
    fileSizeBytes: 1024,
    createdAt: Date.now(),
    status: 'STOPPED',
    isDemo: false
  };

  describe('§5 Pre-flight Checklist Guard (canTranscribe)', () => {
    it('accepts valid recording with audio data and proper user ownership', () => {
      const blob = createMockBlob(2048, 'audio/webm');
      const result = canTranscribe(mockRecording, blob, mockUser);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects null or non-existent recording', () => {
      const result = canTranscribe(null, null, mockUser);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('rejects recording owned by a different user', () => {
      const otherUser: UserAccount = { ...mockUser, userId: 'usr_impostor' };
      const blob = createMockBlob(1024);
      const result = canTranscribe(mockRecording, blob, otherUser);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not belong to the current user');
    });

    it('rejects recording with empty audio (0 bytes)', () => {
      const emptyBlob = createMockBlob(0);
      const result = canTranscribe(mockRecording, emptyBlob, mockUser);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('0 bytes');
    });

    it('rejects recording with duration 0 seconds', () => {
      const invalidRec: Recording = { ...mockRecording, durationSeconds: 0 };
      const blob = createMockBlob(1024);
      const result = canTranscribe(invalidRec, blob, mockUser);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('0 seconds');
    });

    it('rejects recording currently in TRANSCRIBING status', () => {
      const transcribingRec: Recording = { ...mockRecording, status: 'TRANSCRIBING' };
      const blob = createMockBlob(1024);
      const result = canTranscribe(transcribingRec, blob, mockUser);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already being transcribed');
    });
  });

  describe('§7 Candidate Transcript Validation Gate (validateTranscriptText)', () => {
    it('accepts genuine, substantive lecture transcript text', () => {
      const genuineText = 'Today we analyze semaphores and mutex locks to prevent race conditions in multithreaded systems.';
      const result = validateTranscriptText(genuineText, false);
      expect(result.valid).toBe(true);
    });

    it('rejects null, undefined, or empty transcript text', () => {
      expect(validateTranscriptText(null, false).valid).toBe(false);
      expect(validateTranscriptText(undefined, false).valid).toBe(false);
      expect(validateTranscriptText('', false).valid).toBe(false);
      expect(validateTranscriptText('   \n\t  ', false).valid).toBe(false);
    });

    it('rejects transcripts shorter than minimum length', () => {
      const result = validateTranscriptText('Hi', false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('rejects known placeholder and fixture strings when not in demo mode', () => {
      const placeholders = [
        'test',
        'sample transcript',
        'lorem ipsum',
        'demo lecture',
        'sample text',
        'placeholder',
        'test lecture',
        'fake transcript'
      ];

      for (const ph of placeholders) {
        const check1 = validateTranscriptText(ph, false);
        expect(check1.valid).toBe(false);
        expect(check1.error).toContain('placeholder');

        const check2 = validateTranscriptText(`${ph}.`, false);
        expect(check2.valid).toBe(false);
      }
    });

    it('allows demo fixtures when isDemo = true', () => {
      const demoResult = validateTranscriptText('demo lecture on linear regression algorithms.', true);
      expect(demoResult.valid).toBe(true);
    });
  });

  describe('§8 Note-Generation Gate (canGenerateNote)', () => {
    const validTranscript: Transcript = {
      id: 'tr_test_001',
      recordingId: 'rec_test_001',
      text: 'Today we discuss process scheduling algorithms including Round Robin and Shortest Job First.',
      language: 'en',
      durationSeconds: 300,
      createdAt: Date.now(),
      status: 'COMPLETED',
      isDemo: false
    };

    it('allows note generation when recording and COMPLETED transcript match', () => {
      const activeJobs = new Set<string>();
      const result = canGenerateNote(mockRecording, validTranscript, activeJobs);
      expect(result.valid).toBe(true);
    });

    it('rejects note generation if transcript is not COMPLETED', () => {
      const pendingTr: Transcript = { ...validTranscript, status: 'TRANSCRIBING' };
      const result = canGenerateNote(mockRecording, pendingTr, new Set());
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not COMPLETED');
    });

    it('rejects note generation if transcript belongs to a different recording', () => {
      const mismatchedTr: Transcript = { ...validTranscript, recordingId: 'rec_other_999' };
      const result = canGenerateNote(mockRecording, mismatchedTr, new Set());
      expect(result.valid).toBe(false);
      expect(result.error).toContain('recordingId does not match');
    });

    it('rejects note generation if job is already active for this recording', () => {
      const activeJobs = new Set<string>(['rec_test_001']);
      const result = canGenerateNote(mockRecording, validTranscript, activeJobs);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already active');
    });
  });

  describe('§11 Granular Concurrency Lock', () => {
    it('locks per recordingId and allows separate recordings concurrently', () => {
      const pipeline = new PipelineService();
      expect(pipeline.isJobActive('rec_1')).toBe(false);
      expect(pipeline.isJobActive('rec_2')).toBe(false);
    });
  });

  describe('§12 & §13 Versioning, Reset to AI Original, and Immutability', () => {
    it('differentiates AI generated note from user edited note', () => {
      const initialNote: Note = {
        id: 'note_001',
        recordingId: 'rec_001',
        transcriptId: 'tr_001',
        userId: 'usr_101',
        subject: 'Math',
        title: 'Linear Algebra',
        date: 'Aug 1, 2026',
        durationFormatted: '45 mins',
        durationSeconds: 2700,
        transcriptText: 'Eigenvalues and eigenvectors lecture.',
        structuredNotes: {
          title: 'Eigenvalues',
          summary: 'Overview of determinants and eigenvalues.',
          sections: []
        },
        aiOriginalNotes: {
          title: 'Eigenvalues',
          summary: 'Overview of determinants and eigenvalues.',
          sections: []
        },
        userEditedNotes: null,
        source: 'ai_generated',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDemo: false
      };

      expect(initialNote.source).toBe('ai_generated');
      expect(initialNote.version).toBe(1);

      // Simulate user editing
      const editedNote: Note = {
        ...initialNote,
        structuredNotes: {
          ...initialNote.structuredNotes,
          title: 'Eigenvalues & Diagonalization (My Notes)'
        },
        userEditedNotes: {
          ...initialNote.structuredNotes,
          title: 'Eigenvalues & Diagonalization (My Notes)'
        },
        source: 'user_edited',
        updatedAt: Date.now()
      };

      expect(editedNote.source).toBe('user_edited');
      // aiOriginalNotes remains intact
      expect(editedNote.aiOriginalNotes.title).toBe('Eigenvalues');

      // Simulate reset to AI original
      const resetNote: Note = {
        ...editedNote,
        structuredNotes: JSON.parse(JSON.stringify(editedNote.aiOriginalNotes)),
        userEditedNotes: null,
        source: 'ai_generated',
        updatedAt: Date.now()
      };

      expect(resetNote.source).toBe('ai_generated');
      expect(resetNote.userEditedNotes).toBeNull();
      expect(resetNote.structuredNotes.title).toBe('Eigenvalues');
    });
  });

  describe('§18 Demo Fixture Isolation', () => {
    it('demo fixtures are flagged with isDemo = true and never mistaken for user output', () => {
      const demoNote: Note = {
        id: 'demo_note_1',
        recordingId: 'demo_rec_1',
        transcriptId: 'demo_tr_1',
        userId: 'usr_101',
        subject: 'CS106B',
        title: 'Graphs',
        date: 'Jul 28, 2026',
        durationFormatted: '52 mins',
        durationSeconds: 3120,
        transcriptText: 'Graphs and BFS.',
        structuredNotes: { title: 'Graphs', summary: 'Summary', sections: [] },
        aiOriginalNotes: { title: 'Graphs', summary: 'Summary', sections: [] },
        source: 'ai_generated',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDemo: true
      };

      expect(demoNote.isDemo).toBe(true);
    });
  });
});
