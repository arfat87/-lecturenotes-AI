import { Recording, Transcript, Note } from '../types';

const DB_NAME = 'LectureNotesDB';
const DB_VERSION = 2;

const STORES = {
  RECORDINGS: 'recordings',
  TRANSCRIPTS: 'transcripts',
  NOTES: 'notes',
  AUDIO_BLOBS: 'audio_blobs'
} as const;

class IndexedDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.RECORDINGS)) {
          db.createObjectStore(STORES.RECORDINGS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.TRANSCRIPTS)) {
          db.createObjectStore(STORES.TRANSCRIPTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.NOTES)) {
          db.createObjectStore(STORES.NOTES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.AUDIO_BLOBS)) {
          db.createObjectStore(STORES.AUDIO_BLOBS);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- RECORDINGS & BINARY AUDIO ---

  async saveRecording(recording: Recording, audioBlob?: Blob | null): Promise<void> {
    const db = await this.getDB();
    
    // Save recording metadata without the blob in metadata store for fast query
    const meta: Recording = { ...recording, audioBlob: null };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.RECORDINGS, STORES.AUDIO_BLOBS], 'readwrite');
      const recStore = tx.objectStore(STORES.RECORDINGS);
      const blobStore = tx.objectStore(STORES.AUDIO_BLOBS);

      recStore.put(meta);

      if (audioBlob) {
        blobStore.put(audioBlob, recording.id);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getRecording(id: string): Promise<Recording | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.RECORDINGS, STORES.AUDIO_BLOBS], 'readonly');
      const recStore = tx.objectStore(STORES.RECORDINGS);
      const blobStore = tx.objectStore(STORES.AUDIO_BLOBS);

      const recReq = recStore.get(id);
      const blobReq = blobStore.get(id);

      tx.oncomplete = () => {
        if (!recReq.result) {
          resolve(null);
          return;
        }
        const recording: Recording = recReq.result;
        recording.audioBlob = blobReq.result || null;
        resolve(recording);
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllRecordings(): Promise<Recording[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RECORDINGS, 'readonly');
      const store = tx.objectStore(STORES.RECORDINGS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRecording(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.RECORDINGS, STORES.AUDIO_BLOBS], 'readwrite');
      tx.objectStore(STORES.RECORDINGS).delete(id);
      tx.objectStore(STORES.AUDIO_BLOBS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- TRANSCRIPTS ---

  async saveTranscript(transcript: Transcript): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TRANSCRIPTS, 'readwrite');
      tx.objectStore(STORES.TRANSCRIPTS).put(transcript);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getTranscript(id: string): Promise<Transcript | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TRANSCRIPTS, 'readonly');
      const req = tx.objectStore(STORES.TRANSCRIPTS).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  // --- NOTES ---

  async saveNote(note: Note): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.NOTES, 'readwrite');
      tx.objectStore(STORES.NOTES).put(note);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getNote(id: string): Promise<Note | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.NOTES, 'readonly');
      const req = tx.objectStore(STORES.NOTES).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllNotes(): Promise<Note[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.NOTES, 'readonly');
      const req = tx.objectStore(STORES.NOTES).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteNote(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.NOTES, 'readwrite');
      tx.objectStore(STORES.NOTES).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const indexedDbService = new IndexedDbService();
