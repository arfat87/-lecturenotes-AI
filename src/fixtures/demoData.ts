import { Note, Recording, Transcript } from '../types';

export const DEMO_RECORDING_1: Recording = {
  id: 'demo_rec_1',
  userId: 'usr_101',
  subject: 'Computer Science 106B',
  title: 'Graph Algorithms & Breadth-First Search',
  durationSeconds: 3120,
  audioBlob: null,
  audioMimeType: 'audio/webm',
  fileSizeBytes: 2450000,
  createdAt: Date.now() - 86400000 * 2,
  status: 'COMPLETED',
  transcriptId: 'demo_tr_1',
  noteId: 'demo_note_1',
  isDemo: true
};

export const DEMO_TRANSCRIPT_1: Transcript = {
  id: 'demo_tr_1',
  recordingId: 'demo_rec_1',
  text: 'Welcome class. Today we are diving into Graph Theory and state space search. Graphs consist of vertices V and edges E. Breadth-First Search uses a FIFO queue to visit nodes level by level. It guarantees the shortest path in unweighted graphs. Remember this for Midterm 2!',
  language: 'en',
  durationSeconds: 3120,
  createdAt: Date.now() - 86400000 * 2,
  status: 'COMPLETED',
  isEdited: false,
  originalTextRef: null,
  isDemo: true
};

export const DEMO_NOTE_1: Note = {
  id: 'demo_note_1',
  recordingId: 'demo_rec_1',
  transcriptId: 'demo_tr_1',
  userId: 'usr_101',
  subject: 'Computer Science 106B',
  title: 'Graph Algorithms & Breadth-First Search',
  date: 'Jul 28, 2026',
  durationFormatted: '52 mins',
  durationSeconds: 3120,
  transcriptText: DEMO_TRANSCRIPT_1.text,
  structuredNotes: {
    title: 'Graph Algorithms: BFS & Shortest Paths',
    summary: 'An in-depth analysis of graph structures, adjacency representations, and Breadth-First Search (BFS). Highlights optimal path discovery using FIFO queues and time complexity guarantees.',
    sections: [
      {
        heading: '1. Fundamentals of Graph Theory',
        points: [
          'A Graph G = (V, E) is composed of a finite set of Vertices (V) and Edges (E).',
          'Directed Graphs (Digraphs) have one-way edges; Undirected Graphs allow bidirectional traversal.',
          'Adjacency Lists are O(V + E) space efficient compared to O(V²) Adjacency Matrices.'
        ],
        definitions: [
          {
            term: 'Adjacency List',
            definition: 'An array of lists where each vertex stores a reference to its neighbor nodes.',
            added_context: 'Preferred in sparse graphs where |E| << |V|².'
          }
        ]
      },
      {
        heading: '2. Breadth-First Search (BFS) Traversal',
        points: [
          'Uses a First-In-First-Out (FIFO) Queue data structure to explore nodes in concentric ripples.',
          'Guarantees finding the shortest path (fewest edges) in unweighted graphs.',
          'Tracks visited vertices in a boolean array or set to avoid infinite loops in cyclic graphs.'
        ],
        definitions: [
          {
            term: 'Queue Frontier',
            definition: 'A dynamic queue maintaining unvisited neighboring vertices at the current depth.',
            added_context: null
          }
        ],
        exam_flag: 'EXAM QUESTION: Be prepared to trace a BFS queue line-by-line on an undirected graph with 8 nodes!'
      },
      {
        heading: '3. Time & Space Complexity Analysis',
        points: [
          'Time Complexity: O(V + E) where V is vertex count and E is edge count.',
          'Space Complexity: O(V) in worst-case trees with wide branching factor.'
        ],
        definitions: []
      }
    ]
  },
  aiOriginalNotes: {
    title: 'Graph Algorithms: BFS & Shortest Paths',
    summary: 'An in-depth analysis of graph structures, adjacency representations, and Breadth-First Search (BFS). Highlights optimal path discovery using FIFO queues and time complexity guarantees.',
    sections: []
  },
  createdAt: Date.now() - 86400000 * 2,
  updatedAt: Date.now() - 86400000 * 2,
  source: 'ai_generated',
  version: 1,
  isDemo: true
};

export const DEMO_RECORDING_2: Recording = {
  id: 'demo_rec_2',
  userId: 'usr_101',
  subject: 'Organic Chemistry',
  title: 'Nucleophilic Substitution (SN1 vs SN2)',
  durationSeconds: 2880,
  audioBlob: null,
  audioMimeType: 'audio/webm',
  fileSizeBytes: 2150000,
  createdAt: Date.now() - 86400000 * 4,
  status: 'COMPLETED',
  transcriptId: 'demo_tr_2',
  noteId: 'demo_note_2',
  isDemo: true
};

export const DEMO_TRANSCRIPT_2: Transcript = {
  id: 'demo_tr_2',
  recordingId: 'demo_rec_2',
  text: 'Today we discuss SN1 and SN2 reaction mechanisms. SN2 is a bimolecular single-step backside attack causing Walden inversion. SN1 goes through a carbocation intermediate.',
  language: 'en',
  durationSeconds: 2880,
  createdAt: Date.now() - 86400000 * 4,
  status: 'COMPLETED',
  isEdited: false,
  originalTextRef: null,
  isDemo: true
};

export const DEMO_NOTE_2: Note = {
  id: 'demo_note_2',
  recordingId: 'demo_rec_2',
  transcriptId: 'demo_tr_2',
  userId: 'usr_101',
  subject: 'Organic Chemistry',
  title: 'Nucleophilic Substitution (SN1 vs SN2)',
  date: 'Jul 26, 2026',
  durationFormatted: '48 mins',
  durationSeconds: 2880,
  transcriptText: DEMO_TRANSCRIPT_2.text,
  structuredNotes: {
    title: 'Nucleophilic Substitution Mechanisms',
    summary: 'Comprehensive breakdown of SN1 and SN2 mechanisms. Details reaction kinetics, substrate steric hindrance, stereochemical outcome, and solvent effects.',
    sections: [
      {
        heading: '1. SN2 Reaction Kinetics & Walden Inversion',
        points: [
          'Bimolecular rate law: Rate = k[Substrate][Nucleophile].',
          'Single concerted step: Nucleophile attacks 180° opposite the leaving group.',
          'Results in complete inversion of stereocenter configuration (Walden Inversion).'
        ],
        definitions: [
          {
            term: 'Walden Inversion',
            definition: "Inversion of a chiral center's absolute configuration caused by backside nucleophilic attack.",
            added_context: 'Analogy: an umbrella flipping inside out during a heavy wind gust.'
          }
        ],
        exam_flag: 'MUST KNOW FOR FINAL: Primary alkyl halides undergo SN2; tertiary halides NEVER undergo SN2!'
      },
      {
        heading: '2. SN1 Mechanisms & Carbocation Stability',
        points: [
          'Unimolecular rate law: Rate = k[Substrate]. Rate-determining step is leaving group dissociation.',
          'Forms a planar sp² carbocation intermediate.',
          'Nucleophile can attack from either face, yielding a racemic mixture (50:50 enantiomers).'
        ],
        definitions: [
          {
            term: 'Carbocation',
            definition: 'An ion with a positively charged carbon atom containing six valence electrons.',
            added_context: 'Stability order: Tertiary > Secondary >> Primary.'
          }
        ]
      }
    ]
  },
  aiOriginalNotes: {
    title: 'Nucleophilic Substitution Mechanisms',
    summary: 'Comprehensive breakdown of SN1 and SN2 mechanisms.',
    sections: []
  },
  createdAt: Date.now() - 86400000 * 4,
  updatedAt: Date.now() - 86400000 * 4,
  source: 'ai_generated',
  version: 1,
  isDemo: true
};

export const DEMO_NOTES = [DEMO_NOTE_1, DEMO_NOTE_2];
export const DEMO_RECORDINGS = [DEMO_RECORDING_1, DEMO_RECORDING_2];
export const DEMO_TRANSCRIPTS = [DEMO_TRANSCRIPT_1, DEMO_TRANSCRIPT_2];
