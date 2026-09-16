import { Note, Recording, Transcript } from '../types';

export const DEMO_RECORDING_1: Recording = {
  id: 'demo_rec_1',
  userId: 'usr_101',
  sourceType: 'AUDIO_RECORDING',
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
  sourceId: 'demo_rec_1',
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
  sourceId: 'demo_rec_1',
  sourceType: 'AUDIO_RECORDING',
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
    keyTakeaways: [
      'Graphs consist of vertices V and edges E, modeling complex networks and relational data.',
      'Adjacency lists are space-optimal at O(V + E) compared to O(V²) matrices for sparse graphs.',
      'Breadth-First Search systematically discovers shortest paths in unweighted graphs using a FIFO queue.',
      'Cycle detection and avoidance require marking nodes as visited.'
    ],
    sections: [
      {
        title: '1. Fundamentals of Graph Theory',
        heading: '1. Fundamentals of Graph Theory',
        coreConcept: 'Mathematical abstraction of pairwise connections between discrete objects.',
        explanation: 'A graph is represented as G = (V, E) where V is the vertex set and E is the edge set. Graphs can be directed (digraphs) or undirected.',
        logicOrProcess: 'Representing via Adjacency List: each vertex maps to a linked list or dynamic array of its immediate neighbors.',
        examples: ['Road networks with one-way streets (directed) vs. friendship connections (undirected).'],
        importantPoints: [
          'A Graph G = (V, E) is composed of a finite set of Vertices (V) and Edges (E).',
          'Directed Graphs have one-way edges; Undirected Graphs allow bidirectional traversal.',
          'Adjacency Lists are O(V + E) space efficient compared to O(V²) Adjacency Matrices.'
        ],
        points: [
          'A Graph G = (V, E) is composed of a finite set of Vertices (V) and Edges (E).',
          'Directed Graphs have one-way edges; Undirected Graphs allow bidirectional traversal.',
          'Adjacency Lists are O(V + E) space efficient compared to O(V²) Adjacency Matrices.'
        ],
        definitions: [
          {
            term: 'Adjacency List',
            definition: 'An array of lists where each vertex stores a reference to its neighbor nodes.',
            context: 'Standard representation for sparse graphs.',
            added_context: 'Preferred in sparse graphs where |E| << |V|².'
          }
        ]
      },
      {
        title: '2. Breadth-First Search (BFS) Traversal',
        heading: '2. Breadth-First Search (BFS) Traversal',
        coreConcept: 'Level-order graph exploration starting from an arbitrary root node.',
        explanation: 'BFS explores the graph in concentric ripples, visiting all immediate neighbors at depth d before proceeding to depth d+1.',
        logicOrProcess: '1. Initialize FIFO queue with start vertex. 2. Mark start as visited. 3. While queue not empty, dequeue u, visit each unvisited neighbor v, mark visited and enqueue v.',
        examples: ['Finding the fewest degrees of separation in a social network.'],
        importantPoints: [
          'Uses a First-In-First-Out (FIFO) Queue data structure to explore nodes in concentric ripples.',
          'Guarantees finding the shortest path (fewest edges) in unweighted graphs.',
          'Tracks visited vertices in a boolean array or set to avoid infinite loops in cyclic graphs.'
        ],
        points: [
          'Uses a First-In-First-Out (FIFO) Queue data structure to explore nodes in concentric ripples.',
          'Guarantees finding the shortest path (fewest edges) in unweighted graphs.',
          'Tracks visited vertices in a boolean array or set to avoid infinite loops in cyclic graphs.'
        ],
        definitions: [
          {
            term: 'Queue Frontier',
            definition: 'A dynamic queue maintaining unvisited neighboring vertices at the current depth.',
            context: 'Maintains BFS level-by-level exploration order.',
            added_context: null
          }
        ],
        exam_flag: 'EXAM QUESTION: Be prepared to trace a BFS queue line-by-line on an undirected graph with 8 nodes!'
      },
      {
        title: '3. Time & Space Complexity Analysis',
        heading: '3. Time & Space Complexity Analysis',
        coreConcept: 'Asymptotic performance guarantees of BFS traversal.',
        explanation: 'Every vertex is enqueued at most once, and every edge is scanned at most twice (undirected) or once (directed).',
        logicOrProcess: 'Summing neighbor scan loops across all vertices yields exact edge counts.',
        examples: [],
        importantPoints: [
          'Time Complexity: O(V + E) where V is vertex count and E is edge count.',
          'Space Complexity: O(V) in worst-case trees with wide branching factor.'
        ],
        points: [
          'Time Complexity: O(V + E) where V is vertex count and E is edge count.',
          'Space Complexity: O(V) in worst-case trees with wide branching factor.'
        ],
        definitions: []
      }
    ],
    definitions: [
      {
        term: 'Breadth-First Search',
        definition: 'An algorithm for traversing or searching tree or graph data structures using a queue.',
        context: 'Unweighted shortest path algorithm.'
      },
      {
        term: 'Adjacency List',
        definition: 'Collection of unordered lists used to represent which vertices are adjacent.',
        context: 'Graph memory layout.'
      }
    ],
    examplesGlobal: [
      {
        example: 'Navigation route discovery on unweighted city street grids',
        explanation: 'BFS guarantees fewest turn intersections.',
        conceptDemonstrated: 'Shortest path optimality in unweighted graphs'
      }
    ],
    formulas: [
      {
        formula: 'T(V, E) = O(|V| + |E|)',
        meaning: 'Total runtime of BFS traversal',
        variables: ['V = total number of vertices', 'E = total number of edges'],
        context: 'Using adjacency list representation'
      },
      {
        formula: 'S(V) = O(|V|)',
        meaning: 'Maximum memory required for visited set and queue frontier',
        variables: ['V = total number of vertices'],
        context: 'Worst-case star graph or binary tree level'
      }
    ],
    importantFacts: [
      'FIFO queue ordering is essential to BFS level progression.',
      'BFS will fail to terminate on graphs with cycles if a visited set is omitted.',
      'Space complexity O(V) can exceed DFS memory usage on graphs with high branching.'
    ],
    examAlerts: [
      {
        topic: 'BFS Queue Tracing',
        reason: 'Explicitly declared for Midterm 2 by lecturer',
        evidence: 'Remember this for Midterm 2! Trace queue state line by line.'
      }
    ],
    questionsMentioned: {
      lecturerQuestions: [
        'Why does DFS fail to guarantee the shortest path in unweighted graphs?',
        'How does space complexity compare when the branching factor is large?'
      ],
      studentQuestions: [
        'Can BFS be used when edge weights are non-negative real numbers?'
      ]
    },
    actionItems: [
      'Review textbook chapter on Graph Traversal before next lab.',
      'Complete assignment problem on bidirectional BFS.'
    ],
    unclearPoints: []
  },
  aiOriginalNotes: {
    title: 'Graph Algorithms: BFS & Shortest Paths',
    summary: 'An in-depth analysis of graph structures, adjacency representations, and Breadth-First Search (BFS). Highlights optimal path discovery using FIFO queues and time complexity guarantees.',
    keyTakeaways: [
      'Graphs consist of vertices V and edges E, modeling complex networks and relational data.',
      'Adjacency lists are space-optimal at O(V + E) compared to O(V²) matrices for sparse graphs.',
      'Breadth-First Search systematically discovers shortest paths in unweighted graphs using a FIFO queue.'
    ],
    sections: [],
    definitions: [],
    examplesGlobal: [],
    formulas: [],
    importantFacts: [],
    examAlerts: [],
    questionsMentioned: { lecturerQuestions: [], studentQuestions: [] },
    actionItems: [],
    unclearPoints: []
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
  sourceType: 'AUDIO_RECORDING',
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
  sourceId: 'demo_rec_2',
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
  sourceId: 'demo_rec_2',
  sourceType: 'AUDIO_RECORDING',
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
    keyTakeaways: [
      'SN2 is a concerted bimolecular reaction with second-order kinetics Rate = k[Substrate][Nu].',
      'SN2 requires backside attack yielding complete Walden inversion of stereocenters.',
      'SN1 proceeds via a rate-determining carbocation intermediate yielding racemic mixtures.',
      'Substrate steric bulk dictates mechanism: primary halides favor SN2, tertiary halides favor SN1.'
    ],
    sections: [
      {
        title: '1. SN2 Reaction Kinetics & Walden Inversion',
        heading: '1. SN2 Reaction Kinetics & Walden Inversion',
        coreConcept: 'Concerted nucleophilic substitution with simultaneous bond formation and cleavage.',
        explanation: 'The nucleophile attacks the electrophilic carbon 180 degrees opposite the leaving group.',
        logicOrProcess: 'Backside attack forces the three remaining substituents to invert configuration like an umbrella.',
        examples: ['Hydroxide reacting with (R)-2-bromobutane to yield (S)-2-butanol.'],
        importantPoints: [
          'Bimolecular rate law: Rate = k[Substrate][Nucleophile].',
          'Single concerted step: Nucleophile attacks 180° opposite the leaving group.',
          'Results in complete inversion of stereocenter configuration (Walden Inversion).'
        ],
        points: [
          'Bimolecular rate law: Rate = k[Substrate][Nucleophile].',
          'Single concerted step: Nucleophile attacks 180° opposite the leaving group.',
          'Results in complete inversion of stereocenter configuration (Walden Inversion).'
        ],
        definitions: [
          {
            term: 'Walden Inversion',
            definition: "Inversion of a chiral center's absolute configuration caused by backside nucleophilic attack.",
            context: 'Stereochemical consequence of SN2.',
            added_context: 'Analogy: an umbrella flipping inside out during a heavy wind gust.'
          }
        ],
        exam_flag: 'MUST KNOW FOR FINAL: Primary alkyl halides undergo SN2; tertiary halides NEVER undergo SN2!'
      },
      {
        title: '2. SN1 Mechanisms & Carbocation Stability',
        heading: '2. SN1 Mechanisms & Carbocation Stability',
        coreConcept: 'Stepwise substitution via a planar carbocation intermediate.',
        explanation: 'The leaving group departs in the slow rate-determining step, creating an sp² planar carbocation.',
        logicOrProcess: 'Step 1: Loss of leaving group (slow). Step 2: Nucleophilic attack from top or bottom face (fast).',
        examples: ['Hydrolysis of tert-butyl bromide in aqueous acetone.'],
        importantPoints: [
          'Unimolecular rate law: Rate = k[Substrate]. Rate-determining step is leaving group dissociation.',
          'Forms a planar sp² carbocation intermediate.',
          'Nucleophile can attack from either face, yielding a racemic mixture (50:50 enantiomers).'
        ],
        points: [
          'Unimolecular rate law: Rate = k[Substrate]. Rate-determining step is leaving group dissociation.',
          'Forms a planar sp² carbocation intermediate.',
          'Nucleophile can attack from either face, yielding a racemic mixture (50:50 enantiomers).'
        ],
        definitions: [
          {
            term: 'Carbocation',
            definition: 'An ion with a positively charged carbon atom containing six valence electrons.',
            context: 'High-energy intermediate in SN1/E1 reactions.',
            added_context: 'Stability order: Tertiary > Secondary >> Primary.'
          }
        ]
      }
    ],
    definitions: [
      {
        term: 'SN2',
        definition: 'Substitution Nucleophilic Bimolecular reaction.',
        context: 'Second-order rate kinetics.'
      },
      {
        term: 'SN1',
        definition: 'Substitution Nucleophilic Unimolecular reaction.',
        context: 'First-order rate kinetics.'
      }
    ],
    examplesGlobal: [
      {
        example: 'Backside attack on (S)-2-chlorobutane',
        explanation: 'Produces (R)-2-butanol exclusively.',
        conceptDemonstrated: 'Walden inversion stereocontrol'
      }
    ],
    formulas: [
      {
        formula: 'Rate_{SN2} = k [Substrate] [Nucleophile]',
        meaning: 'Bimolecular second-order rate law',
        variables: ['k = rate constant', '[Substrate] = electrophile concentration', '[Nucleophile] = attacking nucleophile concentration'],
        context: 'SN2 kinetics'
      },
      {
        formula: 'Rate_{SN1} = k [Substrate]',
        meaning: 'Unimolecular first-order rate law',
        variables: ['k = rate constant', '[Substrate] = electrophile concentration'],
        context: 'SN1 kinetics, nucleophile does not affect rate'
      }
    ],
    importantFacts: [
      'Polar aprotic solvents (DMSO, acetone, DMF) accelerate SN2 reactions.',
      'Polar protic solvents (water, ethanol) stabilize carbocations and favor SN1.'
    ],
    examAlerts: [
      {
        topic: 'Halide Substitution Restrictions',
        reason: 'Frequently tested on the final exam',
        evidence: 'Primary alkyl halides undergo SN2; tertiary halides NEVER undergo SN2!'
      }
    ],
    questionsMentioned: {
      lecturerQuestions: [
        'Why cannot tertiary alkyl halides undergo SN2 backside attack?'
      ],
      studentQuestions: [
        'Does temperature change the ratio of substitution to elimination?'
      ]
    },
    actionItems: [
      'Memorize the carbocation stability order: 3° > 2° >> 1° > methyl.',
      'Practice drawing Walden inversion stereocenters for next quiz.'
    ],
    unclearPoints: []
  },
  aiOriginalNotes: {
    title: 'Nucleophilic Substitution Mechanisms',
    summary: 'Comprehensive breakdown of SN1 and SN2 mechanisms.',
    keyTakeaways: [],
    sections: [],
    definitions: [],
    examplesGlobal: [],
    formulas: [],
    importantFacts: [],
    examAlerts: [],
    questionsMentioned: { lecturerQuestions: [], studentQuestions: [] },
    actionItems: [],
    unclearPoints: []
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
