import { Recording, Transcript, Note, UserAccount } from '../types';
import { indexedDbService } from './indexedDbService';
import { DEMO_NOTES, DEMO_RECORDINGS, DEMO_TRANSCRIPTS } from '../fixtures/demoData';

const USER_STORAGE_KEY = 'lecturenotes_user';

export const initialUser: UserAccount = {
  userId: 'usr_101',
  name: 'Alex Vance',
  email: 'alex.vance@stanford.edu',
  college: 'Stanford University'
};

class StorageService {
  private memoryRecordings: Recording[] = [];
  private memoryNotes: Note[] = [];
  private memoryTranscripts: Transcript[] = [];
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const storedNotes = await indexedDbService.getAllNotes();
      const storedRecordings = await indexedDbService.getAllRecordings();

      if (storedNotes.length === 0 && storedRecordings.length === 0) {
        // Initialize with isolated demo data
        for (const note of DEMO_NOTES) {
          await indexedDbService.saveNote(note);
        }
        for (const rec of DEMO_RECORDINGS) {
          await indexedDbService.saveRecording(rec, null);
        }
        for (const tr of DEMO_TRANSCRIPTS) {
          await indexedDbService.saveTranscript(tr);
        }
        this.memoryNotes = [...DEMO_NOTES];
        this.memoryRecordings = [...DEMO_RECORDINGS];
        this.memoryTranscripts = [...DEMO_TRANSCRIPTS];
      } else {
        this.memoryNotes = storedNotes.sort((a, b) => b.createdAt - a.createdAt);
        this.memoryRecordings = storedRecordings.sort((a, b) => b.createdAt - a.createdAt);
      }
      this.isInitialized = true;
    } catch (err) {
      console.error('StorageService init error:', err);
      this.memoryNotes = [...DEMO_NOTES];
      this.memoryRecordings = [...DEMO_RECORDINGS];
      this.isInitialized = true;
    }
  }

  // --- RECORDINGS ---

  async saveRecording(recording: Recording, audioBlob?: Blob | null): Promise<void> {
    await indexedDbService.saveRecording(recording, audioBlob);
    const existingIndex = this.memoryRecordings.findIndex(r => r.id === recording.id);
    if (existingIndex >= 0) {
      this.memoryRecordings[existingIndex] = recording;
    } else {
      this.memoryRecordings.unshift(recording);
    }
  }

  async getRecording(id: string): Promise<Recording | null> {
    return indexedDbService.getRecording(id);
  }

  getRecordings(): Recording[] {
    return [...this.memoryRecordings];
  }

  async deleteRecording(id: string): Promise<void> {
    await indexedDbService.deleteRecording(id);
    this.memoryRecordings = this.memoryRecordings.filter(r => r.id !== id);
  }

  // --- TRANSCRIPTS ---

  async saveTranscript(transcript: Transcript): Promise<void> {
    await indexedDbService.saveTranscript(transcript);
    const existingIndex = this.memoryTranscripts.findIndex(t => t.id === transcript.id);
    if (existingIndex >= 0) {
      this.memoryTranscripts[existingIndex] = transcript;
    } else {
      this.memoryTranscripts.unshift(transcript);
    }
  }

  async getTranscript(id: string): Promise<Transcript | null> {
    return indexedDbService.getTranscript(id);
  }

  // --- NOTES ---

  async saveNote(note: Note): Promise<void> {
    await indexedDbService.saveNote(note);
    const existingIndex = this.memoryNotes.findIndex(n => n.id === note.id);
    if (existingIndex >= 0) {
      this.memoryNotes[existingIndex] = note;
    } else {
      this.memoryNotes.unshift(note);
    }
  }

  async getNote(id: string): Promise<Note | null> {
    return indexedDbService.getNote(id);
  }

  getNotes(): Note[] {
    return [...this.memoryNotes];
  }

  async deleteNote(id: string): Promise<void> {
    await indexedDbService.deleteNote(id);
    this.memoryNotes = this.memoryNotes.filter(n => n.id !== id);
  }

  // --- USER ACCOUNT ---

  getUser(): UserAccount {
    try {
      const data = localStorage.getItem(USER_STORAGE_KEY);
      return data ? JSON.parse(data) : initialUser;
    } catch {
      return initialUser;
    }
  }

  saveUser(user: UserAccount): void {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

export const storageService = new StorageService();
