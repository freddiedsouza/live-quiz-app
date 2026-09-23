import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { ref, set, update, onValue, get } from 'firebase/database';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { 
  Trophy, Clock, CheckCircle2, Play, 
  ChevronRight, RefreshCw, Smartphone, Monitor, ShieldCheck, Sparkles, Plus, 
  Trash2, Edit3, Layers, Check, X, Info, RotateCcw, Type, Image as ImageIcon, Upload,
  ArrowUp, ArrowDown, EyeOff, Search, Gift, Dices, SpellCheck
} from 'lucide-react';
import MatchstickPuzzle from './components/MatchstickPuzzle';
const PUZZLE_1000_INITIAL = [
  "d0_b", "d0_c",
  "d1_a", "d1_b", "d1_c", "d1_d", "d1_e", "d1_f",
  "d2_a", "d2_b", "d2_c", "d2_d", "d2_e", "d2_f",
  "d3_a", "d3_b", "d3_c", "d3_d", "d3_e", "d3_f"
];

const PUZZLE_7887_SOLUTION = [
  "d0_a", "d0_b", "d0_c",
  "d1_a", "d1_b", "d1_c", "d1_d", "d1_e", "d1_f", "d1_g",
  "d2_a", "d2_b", "d2_c", "d2_d", "d2_e", "d2_f", "d2_g",
  "d3_a", "d3_b", "d3_c"
];

// Generic canvas templates for building any PDF puzzle
const MATCHSTICK_TEMPLATES = {
  glass: {
    preset: "glass",
    initial: ["g_left_up", "g_right_up", "g_bar_mid", "g_stem_down"],
    solution: ["g_left_up", "g_bar_right", "g_stem_down", "g_right_down"],
    moves: 2
  },
  grid_2x2: {
    preset: "grid_2x2",
    initial: ["h_0_0", "h_0_1", "h_1_0", "h_1_1", "h_2_0", "h_2_1", "v_0_0", "v_0_1", "v_0_2", "v_1_0", "v_1_1", "v_1_2"],
    solution: ["h_0_0", "h_0_1", "h_2_0", "h_2_1", "v_0_0", "v_0_2", "v_1_0", "v_1_2"],
    moves: 2
  },
  grid_3x3: {
    preset: "grid_3x3",
    initial: [
      "h_0_0", "h_0_1", "h_0_2", "h_1_0", "h_1_1", "h_1_2", "h_2_0", "h_2_1", "h_2_2", "h_3_0", "h_3_1", "h_3_2",
      "v_0_0", "v_0_1", "v_0_2", "v_0_3", "v_1_0", "v_1_1", "v_1_2", "v_1_3", "v_2_0", "v_2_1", "v_2_2", "v_2_3"
    ],
    solution: [],
    moves: 8
  },
  triangle: {
    preset: "triangle",
    initial: ["iso_spoke_0", "iso_spoke_1", "iso_spoke_2", "iso_rim_0", "iso_rim_1", "iso_rim_2"],
    solution: [],
    moves: 3
  }
};
function shuffleWord(word) {
  const arr = word.toUpperCase().split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const scrambled = arr.join('');
  return scrambled === word.toUpperCase() && arr.length > 2 ? shuffleWord(word) : scrambled;
}

const INITIAL_QUESTIONS = [
  {
    id: "q_match_1",
    type: "matchstick",
    enabled: true,
    question: "Move 3 sticks and make the highest 4-digit number from 1000!",
    timeLimit: 45,
    maxMoves: 3,
    initialSticks: PUZZLE_1000_INITIAL,
    solutionSticks: PUZZLE_7887_SOLUTION,
    explanation: "Take 3 sticks from the last digit (0 becomes 7). Place 1 stick on the first digit (1 becomes 7), and place the remaining 2 sticks in the centers of the two middle zeros (turning both into 8). The highest number is 7887!"
  },
  {
    id: "q_jumble_1",
    type: "jumble",
    enabled: true,
    question: "UNSCRAMBLE: Tap the letters in the correct order to spell the mystery word!",
    targetWord: "PLANET",
    scrambledLetters: "TNAPEL",
    timeLimit: 30,
    explanation: "The unscrambled word is PLANET!"
  },
  {
    id: "q_search_multi_1",
    type: "wordsearch",
    enabled: true,
    question: "WORD SEARCH: Find the 3 hidden space words in the puzzle!",
    imageUrl: "https://images.unsplash.com/photo-1543722530-d2c3201371e7?auto=format&fit=crop&w=600&q=80",
    targetWords: [
      { id: "w_1", word: "SUN", highlight: { x1: 20, y1: 25, x2: 45, y2: 25 } },
      { id: "w_2", word: "MOON", highlight: { x1: 20, y1: 50, x2: 60, y2: 50 } },
      { id: "w_3", word: "STAR", highlight: { x1: 20, y1: 75, x2: 60, y2: 75 } }
    ],
    pointsPerWord: 100,
    timeLimit: 45,
    explanation: "SUN, MOON, and STAR were hidden in the puzzle rows!"
  },
  {
    id: "q_word_1",
    type: "word",
    enabled: true,
    question: "GUESS THE WORD: Combine both pictures to form a compound word!",
    image1: "https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=400&q=80",
    image2: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=400&q=80",
    acceptedAnswers: ["seesaw", "see saw", "see-saw"],
    timeLimit: 25,
    explanation: "Picture 1 = SEE (Eyes) + Picture 2 = SAW (Tool) -> SEESAW!"
  },
  {
    id: "q_1",
    type: "boolean",
    enabled: true,
    question: "Sound travels faster in water than in air.",
    options: ["True", "False"],
    correctIndex: 0,
    timeLimit: 15,
    explanation: "True! Water particles are packed much more densely than air molecules."
  },
  {
    id: "q_2",
    type: "mcq",
    enabled: true,
    question: "Which planet in our solar system has the most moons?",
    options: ["Jupiter", "Saturn", "Uranus", "Neptune"],
    correctIndex: 1,
    timeLimit: 20,
    explanation: "Saturn has 146 confirmed moons, overtaking Jupiter."
  }
];

function DigitMatchstick({ digitIndex, activeSegments = [], onToggle, isInteractive = true }) {
  const segments = [
    { id: 'a', x: 14, y: 6, w: 52, h: 10, isH: true },
    { id: 'f', x: 6, y: 14, w: 10, h: 52, isH: false },
    { id: 'b', x: 64, y: 14, w: 10, h: 52, isH: false },
    { id: 'g', x: 14, y: 64, w: 52, h: 10, isH: true },
    { id: 'e', x: 6, y: 72, w: 10, h: 52, isH: false },
    { id: 'c', x: 64, y: 72, w: 10, h: 52, isH: false },
    { id: 'd', x: 14, y: 122, w: 52, h: 10, isH: true },
  ];

  return (
    <svg viewBox="0 0 80 138" className="w-16 sm:w-20 md:w-24 aspect-[80/138] bg-slate-900/90 rounded-xl p-1 border border-slate-800 shadow-inner select-none">
      {segments.map((s) => {
        const segKey = `d${digitIndex}_${s.id}`;
        const isActive = activeSegments.includes(segKey);

        return (
          <g
            key={s.id}
            onClick={() => isInteractive && onToggle && onToggle(segKey)}
            className={isInteractive ? "cursor-pointer hover:opacity-85" : ""}
          >
            <rect
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              rx={4}
              className={isActive ? "hidden" : "fill-slate-800/30 stroke-dashed stroke-slate-700 stroke-[1.2] hover:fill-indigo-900/40"}
            />
            {isActive && (
              <>
                <rect
                  x={s.x}
                  y={s.y}
                  width={s.w}
                  height={s.h}
                  rx={3}
                  className="fill-[#F4C430] stroke-[1] stroke-amber-500 shadow-lg"
                />
                <circle
                  cx={s.isH ? s.x + s.w - 5 : s.x + 5}
                  cy={s.isH ? s.y + 5 : s.y + 5}
                  r={4}
                  className="fill-red-600"
                />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function MatchstickBoard({ currentSticks = [], onStickToggle, isInteractive = true }) {
  return (
    <div className="flex justify-center items-center gap-2 sm:gap-4 py-2 select-none">
      {[0, 1, 2, 3].map((digitIdx) => (
        <DigitMatchstick
          key={digitIdx}
          digitIndex={digitIdx}
          activeSegments={currentSticks}
          onToggle={onStickToggle}
          isInteractive={isInteractive}
        />
      ))}
    </div>
  );
}

function MultiWordSearchCanvas({ 
  imageUrl, 
  persistedHighlights = [], 
  currentDraftLine = null, 
  onDraftChange, 
  onDraftCommit, 
  isInteractive = true, 
  revealSolutions = [] 
}) {
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);

  const getPercentCoords = (e) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const handlePointerDown = (e) => {
    if (!isInteractive) return;
    const coords = getPercentCoords(e);
    if (!coords) return;
    setIsDrawing(true);
    setStartPoint(coords);
    if (onDraftChange) {
      onDraftChange({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
    }
  };

  const handlePointerMove = (e) => {
    if (!isInteractive || !isDrawing || !startPoint) return;
    const coords = getPercentCoords(e);
    if (!coords) return;
    if (onDraftChange) {
      onDraftChange({ x1: startPoint.x, y1: startPoint.y, x2: coords.x, y2: coords.y });
    }
  };

  const handlePointerUp = () => {
    if (!isInteractive || !isDrawing) return;
    setIsDrawing(false);
    if (onDraftCommit) {
      onDraftCommit();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      className={`relative inline-block max-w-full overflow-hidden rounded-2xl border border-slate-700 bg-black select-none touch-none ${isInteractive ? 'cursor-crosshair' : ''}`}
    >
      <img
        src={imageUrl}
        alt="Word Search Puzzle"
        className="max-h-[380px] w-auto object-contain pointer-events-none"
        draggable={false}
      />

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {revealSolutions.map((item, idx) => item.highlight && (
          <g key={`sol_${idx}`}>
            <line
              x1={`${item.highlight.x1}%`}
              y1={`${item.highlight.y1}%`}
              x2={`${item.highlight.x2}%`}
              y2={`${item.highlight.y2}%`}
              stroke="#10b981"
              strokeWidth="24"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
            <text
              x={`${(item.highlight.x1 + item.highlight.x2) / 2}%`}
              y={`${(item.highlight.y1 + item.highlight.y2) / 2 - 3}%`}
              fill="#ffffff"
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
              className="drop-shadow"
            >
              {item.word}
            </text>
          </g>
        ))}

        {persistedHighlights.map((hl, idx) => (
          <line
            key={`found_${idx}`}
            x1={`${hl.x1}%`}
            y1={`${hl.y1}%`}
            x2={`${hl.x2}%`}
            y2={`${hl.y2}%`}
            stroke="#10b981"
            strokeWidth="22"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
        ))}

        {currentDraftLine && (
          <line
            x1={`${currentDraftLine.x1}%`}
            y1={`${currentDraftLine.y1}%`}
            x2={`${currentDraftLine.x2}%`}
            y2={`${currentDraftLine.y2}%`}
            stroke="#f59e0b"
            strokeWidth="22"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
        )}
      </svg>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [roomId, setRoomId] = useState("QUIZ1");

  const [adminPass, setAdminPass] = useState("");
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [adminTab, setAdminTab] = useState("live");
  const [questions, setQuestions] = useState(INITIAL_QUESTIONS);

  const [editingQId, setEditingQId] = useState(null);
  const [qType, setQType] = useState("matchstick");
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState(["True", "False"]);
  const [qCorrectIndex, setQCorrectIndex] = useState(0);
  const [qTimeLimit, setQTimeLimit] = useState(45);
  const [qImageUrl, setQImageUrl] = useState("");
  const [qImage1, setQImage1] = useState("");
  const [qImage2, setQImage2] = useState("");
  const [qExplanation, setQExplanation] = useState("");
  const [qAcceptedAnswers, setQAcceptedAnswers] = useState("seesaw, see saw");

  const [qJumbleTarget, setQJumbleTarget] = useState("PLANET");
  const [qJumbleScrambled, setQJumbleScrambled] = useState("TNAPEL");

  const [qTargetWords, setQTargetWords] = useState([
    { id: "w_1", word: "SUN", highlight: { x1: 20, y1: 25, x2: 45, y2: 25 } },
    { id: "w_2", word: "MOON", highlight: { x1: 20, y1: 50, x2: 60, y2: 50 } }
  ]);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [newWordInput, setNewWordInput] = useState("");
  const [builderDraftLine, setBuilderDraftLine] = useState(null);

  const [qMatchPreset, setQMatchPreset] = useState("digits");
  const [qMatchInitial, setQMatchInitial] = useState(PUZZLE_1000_INITIAL);
  const [qMatchSolution, setQMatchSolution] = useState(PUZZLE_7887_SOLUTION);
  const [qMatchMaxMoves, setQMatchMaxMoves] = useState(3);
  const [matchEditTarget, setMatchEditTarget] = useState('initial');
  const [statusMessage, setStatusMessage] = useState("");

  const [game, setGame] = useState({
    status: 'LOBBY',
    mode: 'INDIVIDUAL',
    currentIndex: 0,
    timeRemaining: 20,
    questionStartTime: 0
  });

  const [participants, setParticipants] = useState({});
  const [answers, setAnswers] = useState({});
  const [luckyWinner, setLuckyWinner] = useState(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [animatedName, setAnimatedName] = useState("");

  const [playerName, setPlayerName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState("");

  const [userSticks, setUserSticks] = useState(PUZZLE_1000_INITIAL);
  const [stickInventory, setStickInventory] = useState(0);
  const [movesCount, setMovesCount] = useState(0);
  const [foundWordIds, setFoundWordIds] = useState([]);
  const [persistedLines, setPersistedLines] = useState([]);
  const [participantDraftLine, setParticipantDraftLine] = useState(null);

  const [jumbleBank, setJumbleBank] = useState([]);
  const [jumbleSlots, setJumbleSlots] = useState([]);

  const activeQuestions = questions.filter(q => q.enabled !== false);
  const participantList = Object.values(participants);

  useEffect(() => {
    if (!roomId) return;

    const gameRef = ref(db, `rooms/${roomId}/game`);
    const partRef = ref(db, `rooms/${roomId}/participants`);
    const ansRef = ref(db, `rooms/${roomId}/answers`);
    const qRef = ref(db, `rooms/${roomId}/questions`);
    const winnerRef = ref(db, `rooms/${roomId}/luckyWinner`);

    const unsubGame = onValue(gameRef, (snapshot) => {
      const val = snapshot.val();
      if (val) setGame(val);
    });

    const unsubPart = onValue(partRef, (snapshot) => {
      setParticipants(snapshot.val() || {});
    });

    const unsubAns = onValue(ansRef, (snapshot) => {
      setAnswers(snapshot.val() || {});
    });

    const unsubQ = onValue(qRef, (snapshot) => {
      const val = snapshot.val();
      if (val && Array.isArray(val) && val.length > 0) {
        setQuestions(val);
      }
    });

    const unsubWinner = onValue(winnerRef, (snapshot) => {
      setLuckyWinner(snapshot.val() || null);
    });

    return () => {
      unsubGame();
      unsubPart();
      unsubAns();
      unsubQ();
      unsubWinner();
    };
  }, [roomId]);

  useEffect(() => {
    if (!isAdminAuthed || game.status !== 'QUESTION') return;

    const interval = setInterval(() => {
      setGame((prev) => {
        if (prev.timeRemaining <= 1) {
          clearInterval(interval);
          update(ref(db, `rooms/${roomId}/game`), { status: 'REVEAL', timeRemaining: 0 });
          return { ...prev, status: 'REVEAL', timeRemaining: 0 };
        }
        const updatedTime = prev.timeRemaining - 1;
        update(ref(db, `rooms/${roomId}/game`), { timeRemaining: updatedTime });
        return { ...prev, timeRemaining: updatedTime };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAdminAuthed, game.status, roomId]);

  useEffect(() => {
    if (game.status === 'FINAL' || game.status === 'LUCKY_DRAW') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }, [game.status, luckyWinner]);

  useEffect(() => {
    setSelectedAnswer(null);
    setTypedAnswer("");
    setFoundWordIds([]);
    setPersistedLines([]);
    setParticipantDraftLine(null);

    const curr = activeQuestions[game.currentIndex];
    if (curr && curr.type === 'matchstick') {
      setUserSticks(curr.initialSticks || PUZZLE_1000_INITIAL);
      setStickInventory(0);
      setMovesCount(0);
    }
    if (curr && curr.type === 'jumble') {
      const letters = (curr.scrambledLetters || curr.targetWord || "").toUpperCase().split('');
      setJumbleBank(letters.map((char, i) => ({ id: `tile_${i}`, char, used: false })));
      setJumbleSlots([]);
    }
  }, [game.currentIndex, game.status, questions]);

  const handleFileUpload = (e, targetField) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (targetField === 'image1') setQImage1(dataUrl);
        else if (targetField === 'image2') setQImage2(dataUrl);
        else setQImageUrl(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fromForm = formData.get("adminPasscode");
    const entered = ((fromForm !== null && fromForm !== undefined && fromForm !== "") ? fromForm : adminPass)
      .toString()
      .trim();

    if (entered.toLowerCase() === "admin123") {
      setIsAdminAuthed(true);
      const roomRef = ref(db, `rooms/${roomId}`);
      get(roomRef)
        .then((snap) => {
          if (!snap.exists()) {
            set(roomRef, {
              game: {
                status: 'LOBBY',
                mode: 'INDIVIDUAL',
                currentIndex: 0,
                timeRemaining: 25,
                questionStartTime: Date.now()
              },
              questions: INITIAL_QUESTIONS,
              participants: {},
              answers: {}
            });
          }
        })
        .catch((err) => {
          console.warn("Room check warning:", err);
        });
    } else {
      alert("Incorrect passcode entered.");
    }
  };

  const startQuiz = () => {
    if (activeQuestions.length === 0) {
      alert("No active questions available. Please enable at least 1 question in the Question Bank.");
      return;
    }
    const firstQ = activeQuestions[0];
    update(ref(db, `rooms/${roomId}/game`), {
      status: 'QUESTION',
      currentIndex: 0,
      timeRemaining: firstQ.timeLimit || 45,
      questionStartTime: Date.now()
    });
    set(ref(db, `rooms/${roomId}/answers`), {});
    set(ref(db, `rooms/${roomId}/luckyWinner`), null);
  };

  const nextQuestion = () => {
    const nextIdx = game.currentIndex + 1;
    if (nextIdx >= activeQuestions.length) {
      update(ref(db, `rooms/${roomId}/game`), { status: 'FINAL' });
    } else {
      const q = activeQuestions[nextIdx];
      update(ref(db, `rooms/${roomId}/game`), {
        status: 'QUESTION',
        currentIndex: nextIdx,
        timeRemaining: q.timeLimit || 30,
        questionStartTime: Date.now()
      });
      set(ref(db, `rooms/${roomId}/answers`), {});
    }
  };

  const showLeaderboard = () => {
    update(ref(db, `rooms/${roomId}/game`), { status: 'LEADERBOARD' });
  };

  const triggerLuckyDraw = () => {
    if (participantList.length === 0) {
      alert("No participants have joined yet to pick a winner from!");
      return;
    }

    update(ref(db, `rooms/${roomId}/game`), { status: 'LUCKY_DRAW' });
    set(ref(db, `rooms/${roomId}/luckyWinner`), null);
    setIsSpinning(true);

    const names = participantList.map(p => p.name);
    let counter = 0;
    let speed = 60;

    const interval = setInterval(() => {
      const randomPick = names[Math.floor(Math.random() * names.length)];
      setAnimatedName(randomPick);
      counter++;

      if (counter > 30) {
        clearInterval(interval);
        const chosen = participantList[Math.floor(Math.random() * participantList.length)];
        setAnimatedName(chosen.name);
        setIsSpinning(false);
        set(ref(db, `rooms/${roomId}/luckyWinner`), chosen);
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
      }
    }, speed);
  };

  const resetRoom = () => {
    set(ref(db, `rooms/${roomId}/game`), {
      status: 'LOBBY',
      mode: game.mode,
      currentIndex: 0,
      timeRemaining: 20,
      questionStartTime: Date.now()
    });
    set(ref(db, `rooms/${roomId}/participants`), {});
    set(ref(db, `rooms/${roomId}/answers`), {});
    set(ref(db, `rooms/${roomId}/luckyWinner`), null);
  };

  const resetForm = () => {
    setEditingQId(null);
    setQType("matchstick");
    setQText("");
    setQOptions(["True", "False"]);
    setQCorrectIndex(0);
    setQTimeLimit(45);
    setQImageUrl("");
    setQImage1("");
    setQImage2("");
    setQExplanation("");
    setQAcceptedAnswers("");
    setQJumbleTarget("PLANET");
    setQJumbleScrambled("TNAPEL");
    setQTargetWords([
      { id: "w_1", word: "SUN", highlight: { x1: 20, y1: 25, x2: 45, y2: 25 } }
    ]);
    setActiveWordIndex(0);
    setBuilderDraftLine(null);
    setQMatchInitial(PUZZLE_1000_INITIAL);
    setQMatchSolution(PUZZLE_7887_SOLUTION);
    setQMatchMaxMoves(3);
    setMatchEditTarget('initial');
  };

  const handleEdit = (q) => {
    setEditingQId(q.id);
    setQType(q.type || "matchstick");
    setQText(q.question || "");
    setQOptions(q.options && q.options.length ? [...q.options] : ["True", "False"]);
    setQCorrectIndex(q.correctIndex || 0);
    setQTimeLimit(q.timeLimit || 45);
    setQImageUrl(q.imageUrl || "");
    setQImage1(q.image1 || "");
    setQImage2(q.image2 || "");
    setQExplanation(q.explanation || "");
    if (q.type === 'matchstick') {
      setQMatchPreset(q.preset || "digits");
      setQMatchInitial(q.initialSticks || PUZZLE_1000_INITIAL);
      setQMatchSolution(q.solutionSticks || PUZZLE_7887_SOLUTION);
      setQMatchMaxMoves(q.maxMoves || 3);
    }
    if (q.type === 'jumble') {
      setQJumbleTarget(q.targetWord || "PLANET");
      setQJumbleScrambled(q.scrambledLetters || shuffleWord(q.targetWord || "PLANET"));
    }
    if (q.type === 'wordsearch') {
      setQTargetWords(q.targetWords || []);
      setActiveWordIndex(0);
    }
    if (q.type === 'word') {
      setQAcceptedAnswers(Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers.join(", ") : "");
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleQuestion = (id) => {
    const updatedList = questions.map(q => {
      if (q.id === id) {
        return { ...q, enabled: q.enabled === false ? true : false };
      }
      return q;
    });
    setQuestions(updatedList);
    set(ref(db, `rooms/${roomId}/questions`), updatedList);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updated = [...questions];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setQuestions(updated);
    set(ref(db, `rooms/${roomId}/questions`), updated);
  };

  const handleMoveDown = (index) => {
    if (index === questions.length - 1) return;
    const updated = [...questions];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setQuestions(updated);
    set(ref(db, `rooms/${roomId}/questions`), updated);
  };

  const handleAddWordToBuilder = () => {
    if (!newWordInput.trim()) return;
    const newWordObj = {
      id: `w_${Date.now()}`,
      word: newWordInput.trim().toUpperCase(),
      highlight: null
    };
    const updated = [...qTargetWords, newWordObj];
    setQTargetWords(updated);
    setActiveWordIndex(updated.length - 1);
    setNewWordInput("");
  };

  const handleRemoveWordFromBuilder = (idx) => {
    const updated = qTargetWords.filter((_, i) => i !== idx);
    setQTargetWords(updated);
    setActiveWordIndex(Math.max(0, idx - 1));
  };

  const handleTypeSwitch = (type) => {
    setQType(type);
    if (type === 'boolean') {
      setQOptions(["True", "False"]);
      setQTimeLimit(15);
    } else if (type === 'jumble') {
      setQTimeLimit(30);
      if (!qText) setQText("UNSCRAMBLE: Tap the letters in the correct order to spell the mystery word!");
    } else if (type === 'wordsearch') {
      setQTimeLimit(45);
    } else if (type === 'word') {
      setQTimeLimit(25);
    } else if (type === 'matchstick') {
      setQTimeLimit(45);
      if (!qText) setQText("Move 3 sticks and make the highest 4-digit number from 1000!");
    }
  };

  const handleSaveQuestion = (e) => {
    e.preventDefault();
    if (!qText.trim()) {
      setStatusMessage("Error: Question prompt cannot be empty.");
      return;
    }

    if (qType === 'jumble' && !qJumbleTarget.trim()) {
      setStatusMessage("Error: Please provide the target word for Jumble.");
      return;
    }

    if (qType === 'matchstick' && qMatchInitial.length === 0) {
      setStatusMessage("Error: Initial matchstick state cannot be empty.");
      return;
    }

    if (qType === 'wordsearch') {
      if (!qImageUrl) {
        setStatusMessage("Error: Upload a puzzle image for Word Search.");
        return;
      }
      if (qTargetWords.length === 0) {
        setStatusMessage("Error: Add at least one word to find.");
        return;
      }
    }

    let finalOptions = qOptions;
    let accepted = [];

    if (qType === 'boolean') {
      finalOptions = ["True", "False"];
    } else if (qType === 'jumble') {
      finalOptions = [qJumbleTarget.trim().toUpperCase()];
    } else if (qType === 'wordsearch') {
      finalOptions = qTargetWords.map(w => w.word);
    } else if (qType === 'matchstick') {
      finalOptions = ["Matchstick Puzzle"];
    } else if (qType === 'word') {
      finalOptions = ["Typed Answer"];
      accepted = qAcceptedAnswers
        .split(',')
        .map(a => a.trim().toLowerCase())
        .filter(a => a.length > 0);
      if (accepted.length === 0) {
        setStatusMessage("Error: Provide at least one accepted answer for Guess the Word.");
        return;
      }
    } else {
      const cleanOptions = qOptions.map(opt => opt.trim());
      if (cleanOptions.some(opt => opt === "")) {
        setStatusMessage("Error: All choice options must be filled.");
        return;
      }
      finalOptions = cleanOptions;
    }

    const payload = {
      id: editingQId || `q_${Date.now()}`,
      type: qType,
      preset: qType === 'matchstick' ? qMatchPreset : null,
      enabled: true,
      question: qText.trim(),
      options: finalOptions,
      correctIndex: Number(qCorrectIndex),
      timeLimit: Number(qTimeLimit) || 45,
      imageUrl: qImageUrl.trim() || null,
      image1: qType === 'word' ? (qImage1.trim() || null) : null,
      image2: qType === 'word' ? (qImage2.trim() || null) : null,
      explanation: qExplanation.trim() || null,
      targetWord: qType === 'jumble' ? qJumbleTarget.trim().toUpperCase() : null,
      scrambledLetters: qType === 'jumble' ? (qJumbleScrambled.trim().toUpperCase() || shuffleWord(qJumbleTarget)) : null,
      targetWords: qType === 'wordsearch' ? qTargetWords : null,
      pointsPerWord: 100,
      acceptedAnswers: qType === 'word' ? accepted : null,
      initialSticks: qType === 'matchstick' ? qMatchInitial : null,
      solutionSticks: qType === 'matchstick' ? qMatchSolution : null,
      validSolutions: qType === 'matchstick' ? [qMatchSolution] : null,
      maxMoves: qType === 'matchstick' ? Number(qMatchMaxMoves) || 3 : null
    };

    let updatedList = [];
    if (editingQId) {
      updatedList = questions.map(q => q.id === editingQId ? { ...payload, enabled: q.enabled !== false } : q);
    } else {
      updatedList = [...questions, payload];
    }

    setQuestions(updatedList);
    set(ref(db, `rooms/${roomId}/questions`), updatedList);
    resetForm();
    setStatusMessage("Question successfully saved and synced to live quiz!");
    setTimeout(() => setStatusMessage(""), 4000);
  };

  const handleDelete = (id) => {
    if (questions.length <= 1) {
      alert("At least 1 question is required in the quiz.");
      return;
    }
    if (confirm("Delete this question from the quiz?")) {
      const updatedList = questions.filter(q => q.id !== id);
      setQuestions(updatedList);
      set(ref(db, `rooms/${roomId}/questions`), updatedList);
    }
  };

  const handleStickToggle = (segKey) => {
    if (selectedAnswer !== null || game.status !== 'QUESTION') return;
    const isCurrentlyActive = userSticks.includes(segKey);

    if (isCurrentlyActive) {
      setUserSticks(prev => prev.filter(id => id !== segKey));
      setStickInventory(prev => prev + 1);
      setMovesCount(prev => prev + 1);
    } else {
      if (stickInventory > 0) {
        setUserSticks(prev => [...prev, segKey]);
        setStickInventory(prev => prev - 1);
      }
    }
  };

  const submitMatchstickSolution = () => {
    if (selectedAnswer !== null || game.status !== 'QUESTION') return;
    const curr = activeQuestions[game.currentIndex];
    const participantId = playerName.trim().toLowerCase().replace(/\s+/g, '_');

    const sortedUser = [...userSticks].sort();
    let isCorrect = false;

    if (curr.solutionSticks && Array.isArray(curr.solutionSticks)) {
      const sortedSol = [...curr.solutionSticks].sort();
      isCorrect = JSON.stringify(sortedSol) === JSON.stringify(sortedUser);
    } else if (curr.validSolutions && Array.isArray(curr.validSolutions)) {
      isCorrect = curr.validSolutions.some(sol => {
        const sortedSol = [...sol].sort();
        return JSON.stringify(sortedSol) === JSON.stringify(sortedUser);
      });
    }

    setSelectedAnswer("MATCHSTICK_SUBMITTED");

    set(ref(db, `rooms/${roomId}/answers/${participantId}`), {
      answer: isCorrect ? "7887 (SOLVED)" : "SUBMITTED",
      isCorrect,
      timeRemaining: game.timeRemaining
    });

    if (isCorrect) {
      const addedPoints = 150 + (game.timeRemaining * 10);
      const currentScore = participants[participantId]?.score || 0;
      update(ref(db, `rooms/${roomId}/participants/${participantId}`), {
        score: currentScore + addedPoints
      });
    }
  };

  const handlePickJumbleTile = (tile) => {
    if (selectedAnswer !== null || game.status !== 'QUESTION' || tile.used) return;
    setJumbleSlots(prev => [...prev, tile]);
    setJumbleBank(prev => prev.map(t => t.id === tile.id ? { ...t, used: true } : t));
  };

  const handleReturnJumbleTile = (slotTile, index) => {
    if (selectedAnswer !== null || game.status !== 'QUESTION') return;
    setJumbleSlots(prev => prev.filter((_, i) => i !== index));
    setJumbleBank(prev => prev.map(t => t.id === slotTile.id ? { ...t, used: false } : t));
  };

  const handleResetJumble = () => {
    if (selectedAnswer !== null || game.status !== 'QUESTION') return;
    setJumbleSlots([]);
    setJumbleBank(prev => prev.map(t => ({ ...t, used: false })));
  };

  const submitJumbleWord = () => {
    if (selectedAnswer !== null || game.status !== 'QUESTION' || jumbleSlots.length === 0) return;
    const curr = activeQuestions[game.currentIndex];
    const participantId = playerName.trim().toLowerCase().replace(/\s+/g, '_');
    
    const assembledWord = jumbleSlots.map(s => s.char).join('');
    const isCorrect = assembledWord.toUpperCase() === (curr.targetWord || "").toUpperCase();

    setSelectedAnswer(assembledWord);

    set(ref(db, `rooms/${roomId}/answers/${participantId}`), {
      answer: assembledWord,
      isCorrect,
      timeRemaining: game.timeRemaining
    });

    if (isCorrect) {
      const addedPoints = 120 + (game.timeRemaining * 10);
      const currentScore = participants[participantId]?.score || 0;
      update(ref(db, `rooms/${roomId}/participants/${participantId}`), {
        score: currentScore + addedPoints
      });
    }
  };

  const handleParticipantCommitWordSearch = () => {
    if (!participantDraftLine || game.status !== 'QUESTION') return;
    const curr = activeQuestions[game.currentIndex];
    if (!curr || !curr.targetWords) return;

    const participantId = playerName.trim().toLowerCase().replace(/\s+/g, '_');
    const tol = 16;

    const hitWord = curr.targetWords.find(targetObj => {
      if (!targetObj.highlight || foundWordIds.includes(targetObj.id)) return false;
      const t = targetObj.highlight;

      const direct = 
        Math.hypot(participantDraftLine.x1 - t.x1, participantDraftLine.y1 - t.y1) < tol &&
        Math.hypot(participantDraftLine.x2 - t.x2, participantDraftLine.y2 - t.y2) < tol;

      const reverse = 
        Math.hypot(participantDraftLine.x1 - t.x2, participantDraftLine.y1 - t.y2) < tol &&
        Math.hypot(participantDraftLine.x2 - t.x1, participantDraftLine.y2 - t.y1) < tol;

      return direct || reverse;
    });

    if (hitWord) {
      const updatedFound = [...foundWordIds, hitWord.id];
      const updatedLines = [...persistedLines, hitWord.highlight];
      setFoundWordIds(updatedFound);
      setPersistedLines(updatedLines);

      const currentScore = participants[participantId]?.score || 0;
      const pts = (curr.pointsPerWord || 100) + Math.floor(game.timeRemaining * 2);
      update(ref(db, `rooms/${roomId}/participants/${participantId}`), {
        score: currentScore + pts
      });

      set(ref(db, `rooms/${roomId}/answers/${participantId}`), {
        answer: `${updatedFound.length} of ${curr.targetWords.length} words found`,
        isCorrect: true,
        timeRemaining: game.timeRemaining
      });
    }

    setParticipantDraftLine(null);
  };

  const submitWordAnswer = (e) => {
    e.preventDefault();
    if (!typedAnswer.trim() || selectedAnswer !== null || game.status !== 'QUESTION') return;
    const curr = activeQuestions[game.currentIndex];
    const participantId = playerName.trim().toLowerCase().replace(/\s+/g, '_');

    const cleanInput = typedAnswer.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    let isCorrect = false;

    if (curr.acceptedAnswers && Array.isArray(curr.acceptedAnswers)) {
      isCorrect = curr.acceptedAnswers.some(ans => {
        const cleanAns = ans.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanAns === cleanInput;
      });
    }

    setSelectedAnswer(typedAnswer.trim());

    set(ref(db, `rooms/${roomId}/answers/${participantId}`), {
      answer: typedAnswer.trim(),
      isCorrect,
      timeRemaining: game.timeRemaining
    });

    if (isCorrect) {
      const addedPoints = 120 + (game.timeRemaining * 10);
      const currentScore = participants[participantId]?.score || 0;
      update(ref(db, `rooms/${roomId}/participants/${participantId}`), {
        score: currentScore + addedPoints
      });
    }
  };

  const submitAnswer = (optionIdx) => {
    if (selectedAnswer !== null || game.status !== 'QUESTION') return;
    const participantId = playerName.trim().toLowerCase().replace(/\s+/g, '_');
    const currQ = activeQuestions[game.currentIndex];
    
    const isCorrect = optionIdx === currQ.correctIndex;
    setSelectedAnswer(optionIdx);

    set(ref(db, `rooms/${roomId}/answers/${participantId}`), {
      answer: optionIdx,
      isCorrect,
      timeRemaining: game.timeRemaining
    });

    if (isCorrect) {
      const addedPoints = 100 + (game.timeRemaining * 10);
      const currentScore = participants[participantId]?.score || 0;
      update(ref(db, `rooms/${roomId}/participants/${participantId}`), {
        score: currentScore + addedPoints
      });
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    const participantId = playerName.trim().toLowerCase().replace(/\s+/g, '_');
    set(ref(db, `rooms/${roomId}/participants/${participantId}`), {
      name: playerName.trim(),
      team: game.mode === 'TEAM' ? (teamName.trim() || 'Team Red') : null,
      score: 0
    });
    setHasJoined(true);
  };

  const getLeaderboard = () => {
    const list = Object.values(participants || {});
    if (game.mode === 'TEAM') {
      const teamMap = {};
      list.forEach((p) => {
        const t = p.team || 'Solo';
        teamMap[t] = (teamMap[t] || 0) + (p.score || 0);
      });
      return Object.entries(teamMap)
        .map(([name, score]) => ({ name, score, isTeam: true }))
        .sort((a, b) => b.score - a.score);
    }
    return list.sort((a, b) => (b.score || 0) - (a.score || 0));
  };

  const currQ = activeQuestions[game.currentIndex] || activeQuestions[0];
  const currentAnswerCount = Object.keys(answers).length;

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="inline-flex p-4 bg-indigo-600/20 text-indigo-400 rounded-3xl ring-1 ring-indigo-500/30">
            <Sparkles className="w-12 h-12 animate-pulse" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Live Interactive Quiz</h1>
            <p className="text-slate-400 mt-2">Matchstick Puzzles, Jumble, Word Search & Riddles</p>
          </div>

          <div className="space-y-4 pt-4">
            <button
              onClick={() => setRole('participant')}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/25 transition active:scale-[0.98]"
            >
              <Smartphone className="w-6 h-6" /> Join as Participant
            </button>
            <button
              onClick={() => setRole('admin')}
              className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition"
            >
              <Monitor className="w-6 h-6 text-slate-400" /> Host & Projector Panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'participant') {
    if (!hasJoined) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center p-6">
          <div className="max-w-sm mx-auto w-full space-y-6">
            <div className="text-center space-y-2">
              <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Room PIN: {roomId}</span>
              <h2 className="text-2xl font-bold">Join the Quiz</h2>
              <p className="text-slate-400 text-sm">Enter your details to join the live room</p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-medium text-slate-400 mb-1">Your Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Alex"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {game.mode === 'TEAM' && (
                <div>
                  <label className="block text-xs uppercase font-medium text-slate-400 mb-1">Select / Type Team</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Team Thunder"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl text-lg shadow-lg shadow-indigo-600/30 transition active:scale-[0.98]"
              >
                Enter Lobby
              </button>
            </form>
          </div>
        </div>
      );
    }

    if (game.status === 'LUCKY_DRAW') {
      const isWinner = luckyWinner && luckyWinner.name?.toLowerCase().trim() === playerName?.toLowerCase().trim();

      return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col justify-center items-center text-center">
          {luckyWinner ? (
            isWinner ? (
              <div className="space-y-4 animate-bounce-short">
                <div className="w-20 h-20 bg-yellow-400 text-black rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-yellow-500/50">
                  <Gift className="w-10 h-10 animate-pulse" />
                </div>
                <h1 className="text-3xl font-black text-yellow-400">🎉 CONGRATULATIONS!</h1>
                <p className="text-xl font-bold">You are the Lucky Draw Winner!</p>
                <div className="p-4 bg-yellow-950/60 border border-yellow-500/40 rounded-2xl">
                  <p className="text-xs text-yellow-200">Go claim your prize from the quiz host!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto" />
                <h2 className="text-2xl font-bold">Lucky Draw Winner</h2>
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                  <span className="text-xs text-slate-400 uppercase font-bold">The Winner is:</span>
                  <p className="text-3xl font-black text-amber-400 mt-1">{luckyWinner.name}</p>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <Dices className="w-16 h-16 text-indigo-400 mx-auto animate-spin" />
              <h2 className="text-2xl font-black">Drawing a Lucky Winner...</h2>
              <p className="text-sm text-slate-400">Watch the main screen!</p>
            </div>
          )}
        </div>
      );
    }

    if (game.status === 'LOBBY') {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-full animate-pulse mb-4">
            <Clock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold">You're in the Lobby!</h2>
          <p className="text-slate-400 mt-2">Welcome, <span className="text-indigo-400 font-semibold">{playerName}</span>.</p>
          {game.mode === 'TEAM' && <p className="text-sm text-slate-500 mt-1">Playing with: {teamName}</p>}
          <div className="mt-8 py-3 px-6 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-400">
            Waiting for the host to start the quiz...
          </div>
        </div>
      );
    }

    if (game.status === 'QUESTION' || game.status === 'REVEAL') {
      if (!currQ) {
        return (
          <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center text-center">
            <p className="text-slate-400">Waiting for next question...</p>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col p-4 pb-8 justify-between">
          <div>
            <div className="flex items-center justify-between py-2 border-b border-slate-800 mb-3">
              <span className="text-xs font-semibold text-slate-400">Q {game.currentIndex + 1} of {activeQuestions.length}</span>
              <div className={`px-3 py-1 rounded-full font-bold text-sm ${game.timeRemaining <= 5 ? 'bg-red-500/20 text-red-400 animate-bounce' : 'bg-slate-800 text-slate-200'}`}>
                ⏱ {game.timeRemaining}s
              </div>
            </div>

            <h3 className="text-base font-bold mb-3 leading-snug">{currQ.question}</h3>

            {/* 4-DIGIT MATCHSTICK ENGINE */}
            {currQ.type === 'matchstick' && (
              <div className="space-y-4 my-2">
                <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400">Sticks in Hand: </span>
                    <b className="text-amber-400 text-sm">{stickInventory}</b>
                  </div>
                  <div>
                    <span className="text-slate-400">Max Moves: </span>
                    <b className="text-indigo-400">{currQ.maxMoves || 3}</b>
                  </div>
                  <button
                    onClick={() => {
                      setUserSticks(currQ.initialSticks || PUZZLE_1000_INITIAL);
                      setStickInventory(0);
                      setMovesCount(0);
                    }}
                    disabled={selectedAnswer !== null}
                    className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg text-[11px]"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>

                <div className="flex justify-center">
              <MatchstickPuzzle
                    preset={currQ.preset || 'digits'}
                    actionType="MOVE"
                    currentSticks={userSticks}
                    solutionSticks={currQ.solutionSticks || []}
                    showSolution={game.status === 'REVEAL'}
                    isInteractive={selectedAnswer === null && game.status === 'QUESTION'}
                    onSticksChange={(newSticks) => {
                      if (newSticks.length < userSticks.length) {
                        setUserSticks(newSticks);
                        setStickInventory((prev) => prev + 1);
                        setMovesCount((prev) => prev + 1);
                      } else if (stickInventory > 0) {
                        setUserSticks(newSticks);
                        setStickInventory((prev) => prev - 1);
                      }
                    }}
                  />
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  Tap active matchsticks to pick them up. Tap dashed slots to place them down.
                </p>

                {selectedAnswer === null && game.status === 'QUESTION' && (
                  <button
                    onClick={submitMatchstickSolution}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white shadow-lg shadow-emerald-600/30 transition active:scale-[0.98]"
                  >
                    Lock In Matchstick Formation
                  </button>
                )}

                {selectedAnswer !== null && (
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center space-y-1 animate-fade-in">
                    <span className="text-xs text-slate-400 uppercase">Status:</span>
                    <p className="text-xl font-black text-indigo-400">Formation Submitted</p>
                  </div>
                )}
              </div>
            )}

            {/* JUMBLE ENGINE */}
            {currQ.type === 'jumble' && (
              <div className="space-y-5 my-2">
                <div className="space-y-1 text-center">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Your Assembled Word:</span>
                  <div className="flex flex-wrap gap-2 justify-center min-h-[58px] p-2 bg-slate-900/90 rounded-2xl border-2 border-dashed border-slate-700">
                    {jumbleSlots.length === 0 ? (
                      <span className="text-xs text-slate-600 italic self-center">Tap letters below in order</span>
                    ) : (
                      jumbleSlots.map((slotTile, idx) => (
                        <button
                          key={`slot_${idx}`}
                          disabled={selectedAnswer !== null || game.status !== 'QUESTION'}
                          onClick={() => handleReturnJumbleTile(slotTile, idx)}
                          className="w-12 h-12 rounded-xl bg-gradient-to-t from-indigo-700 to-indigo-500 text-white font-black text-xl flex items-center justify-center shadow-lg border border-indigo-300/40 active:scale-95 transition-transform"
                        >
                          {slotTile.char}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {selectedAnswer === null && game.status === 'QUESTION' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                      <span>Available Letters:</span>
                      <button
                        onClick={handleResetJumble}
                        className="text-indigo-400 hover:text-white flex items-center gap-1 text-[11px] bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800"
                      >
                        <RotateCcw className="w-3 h-3" /> Clear Word
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center">
                      {jumbleBank.map((tile) => (
                        <button
                          key={tile.id}
                          disabled={tile.used}
                          onClick={() => handlePickJumbleTile(tile)}
                          className={`w-12 h-12 rounded-xl font-black text-xl flex items-center justify-center shadow transition-all ${
                            tile.used
                              ? 'bg-slate-900 border border-slate-855 text-slate-700 scale-90 opacity-30 cursor-not-allowed'
                              : 'bg-slate-800 hover:bg-slate-750 border border-slate-600 text-amber-300 hover:scale-105 active:scale-95'
                          }`}
                        >
                          {tile.char}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={submitJumbleWord}
                      disabled={jumbleSlots.length === 0}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 font-black rounded-2xl text-base text-white shadow-lg shadow-emerald-600/30 transition active:scale-[0.98] mt-4"
                    >
                      Submit Word
                    </button>
                  </div>
                )}

                {selectedAnswer !== null && (
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center space-y-1 animate-fade-in">
                    <span className="text-xs text-slate-400 uppercase">You Submitted:</span>
                    <p className="text-3xl font-black text-indigo-400 tracking-wider">{selectedAnswer}</p>
                  </div>
                )}
              </div>
            )}

            {/* MULTI-WORD SEARCH */}
            {currQ.type === 'wordsearch' && currQ.imageUrl && (
              <div className="space-y-3 flex flex-col items-center">
                <div className="w-full bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Words to Find ({foundWordIds.length} / {currQ.targetWords?.length || 0}):</span>
                    <span className="text-[10px] text-emerald-400 font-bold">+100 pts each</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currQ.targetWords?.map((item) => {
                      const isFound = foundWordIds.includes(item.id);
                      return (
                        <span
                          key={item.id}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 transition ${isFound ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 line-through opacity-80' : 'bg-slate-800 border-slate-700 text-amber-300'}`}
                        >
                          {isFound && <Check className="w-3 h-3 text-emerald-400" />}
                          {item.word}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <MultiWordSearchCanvas
                  imageUrl={currQ.imageUrl}
                  persistedHighlights={persistedLines}
                  currentDraftLine={participantDraftLine}
                  onDraftChange={setParticipantDraftLine}
                  onDraftCommit={handleParticipantCommitWordSearch}
                  isInteractive={game.status === 'QUESTION'}
                  revealSolutions={game.status === 'REVEAL' ? (currQ.targetWords || []) : []}
                />
              </div>
            )}

            {/* GUESS THE WORD */}
            {currQ.type === 'word' && (
              <div className="space-y-4 my-2">
                <div className="flex items-center justify-center gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                  {currQ.image1 && (
                    <div className="flex-1 bg-white p-2 rounded-xl flex items-center justify-center aspect-square max-h-36 overflow-hidden">
                      <img src={currQ.image1} alt="Clue 1" className="max-h-full object-contain" />
                    </div>
                  )}
                  {currQ.image1 && currQ.image2 && <span className="text-2xl font-black text-indigo-400">+</span>}
                  {currQ.image2 && (
                    <div className="flex-1 bg-white p-2 rounded-xl flex items-center justify-center aspect-square max-h-36 overflow-hidden">
                      <img src={currQ.image2} alt="Clue 2" className="max-h-full object-contain" />
                    </div>
                  )}
                </div>

                {game.status === 'QUESTION' && selectedAnswer === null && (
                  <form onSubmit={submitWordAnswer} className="space-y-3">
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="Type your answer here..."
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      className="w-full text-center text-lg uppercase tracking-wider font-extrabold bg-slate-900 border-2 border-indigo-500/60 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-400 shadow-inner"
                    />
                    <button
                      type="submit"
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 font-extrabold rounded-2xl text-base text-white shadow-lg shadow-indigo-600/30 transition active:scale-[0.98]"
                    >
                      Submit Word
                    </button>
                  </form>
                )}

                {selectedAnswer !== null && (
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center space-y-1">
                    <span className="text-xs text-slate-400 uppercase">You Answered:</span>
                    <p className="text-2xl font-black text-indigo-400 tracking-wide">{selectedAnswer}</p>
                  </div>
                )}
              </div>
            )}

            {/* TRUE / FALSE */}
            {currQ.type === 'boolean' && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {currQ.options.map((opt, idx) => (
                  <button
                    key={idx}
                    disabled={selectedAnswer !== null || game.status !== 'QUESTION'}
                    onClick={() => submitAnswer(idx)}
                    className={`w-full py-4 px-5 rounded-2xl border text-center font-bold text-base transition ${
                      selectedAnswer === idx
                        ? 'bg-indigo-600 border-indigo-500 text-white ring-2 ring-indigo-400'
                        : 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-850'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* MCQ */}
            {currQ.type === 'mcq' && (
              <div className="grid grid-cols-1 gap-3 mt-4">
                {currQ.options.map((opt, idx) => (
                  <button
                    key={idx}
                    disabled={selectedAnswer !== null || game.status !== 'QUESTION'}
                    onClick={() => submitAnswer(idx)}
                    className={`w-full py-4 px-5 rounded-2xl border text-left font-semibold text-base transition flex items-center justify-between ${
                      selectedAnswer === idx
                        ? 'bg-indigo-600 border-indigo-500 text-white ring-2 ring-indigo-400'
                        : 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-850'
                    }`}
                  >
                    <span>{opt}</span>
                    {game.status === 'REVEAL' && idx === currQ.correctIndex && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {game.status === 'REVEAL' && (
            <div className="mt-4 p-4 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 animate-fade-in text-left">
              {currQ.type === 'matchstick' && (
                <div className="mb-2">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">Solved Formation:</span>
                  <p className="text-xl font-black text-white">7887</p>
                </div>
              )}
              {currQ.type === 'jumble' && (
                <div className="mb-2">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">Unscrambled Word:</span>
                  <p className="text-2xl font-black text-white uppercase tracking-wider">{currQ.targetWord}</p>
                </div>
              )}
              {currQ.type === 'word' && (
                <div className="mb-2">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">Correct Word:</span>
                  <p className="text-xl font-black text-white uppercase">{currQ.acceptedAnswers?.[0]}</p>
                </div>
              )}
              {currQ.explanation && (
                <div className="flex items-start gap-1.5 text-slate-300 text-xs">
                  <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <p>{currQ.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col justify-center text-center">
        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-3xl font-extrabold mb-2">Quiz Finished!</h2>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 my-6">
          <p className="text-slate-400 text-sm">Your Total Score</p>
          <p className="text-5xl font-black text-indigo-400 my-2">
            {participants[playerName.trim().toLowerCase().replace(/\s+/g, '_')]?.score || 0}
          </p>
          <p className="text-xs text-slate-500">Check the main projector screen for final rankings!</p>
        </div>
      </div>
    );
  }

  if (!isAdminAuthed) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <form onSubmit={handleAdminLogin} className="max-w-sm w-full space-y-5 bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 text-indigo-400">
            <ShieldCheck className="w-7 h-7" />
            <h2 className="text-xl font-bold text-white">Host Access</h2>
          </div>
          <p className="text-xs text-slate-400">Enter host passcode to continue</p>
          <input
            type="password"
            id="admin-passcode"
            name="adminPasscode"
            required
            autoComplete="current-password"
            placeholder="Enter passcode"
            value={adminPass}
            onChange={(e) => setAdminPass(e.target.value)}
            className="w-full bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl transition cursor-pointer"
          >
            Open Host Dashboard
          </button>
        </form>
      </div>
    );
  }

  const currentJoinUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Quiz Host Center</h1>
            <span className="text-xs text-slate-400">Room PIN: <b className="text-indigo-400">{roomId}</b></span>
          </div>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setAdminTab("live")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${adminTab === "live" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
          >
            <Monitor className="w-3.5 h-3.5" /> Projector & Live Game
          </button>
          <button
            onClick={() => setAdminTab("builder")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${adminTab === "builder" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
          >
            <Layers className="w-3.5 h-3.5" /> Question Bank ({activeQuestions.length}/{questions.length} Active)
          </button>
        </div>
      </header>

      {adminTab === "builder" && (
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                {editingQId ? <Edit3 className="w-5 h-5 text-amber-400" /> : <Plus className="w-5 h-5 text-indigo-400" />}
                {editingQId ? "Edit Question" : "Create New Question"}
              </h2>
              {editingQId && (
                <button 
                  onClick={resetForm} 
                  className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {statusMessage && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${statusMessage.startsWith('Error') ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                {statusMessage}
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Format</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    { id: 'matchstick', label: 'Matchstick' },
                    { id: 'jumble', label: 'Jumble' },
                    { id: 'wordsearch', label: 'Word Search' },
                    { id: 'word', label: 'Guess Word' },
                    { id: 'boolean', label: 'True/False' },
                    { id: 'mcq', label: 'MCQ' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTypeSwitch(tab.id)}
                      className={`py-2 rounded-xl border font-bold text-center text-[11px] transition ${qType === tab.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-white'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Question Prompt</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Enter question prompt..."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              {/* MATCHSTICK QUESTION BUILDER */}
              {qType === 'matchstick' && (
                <div className="p-3.5 bg-slate-850 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-amber-400 font-bold text-xs">Pattern Layout:</span>
                   <select
  value={qMatchPreset}
  onChange={(e) => {
    const selected = e.target.value;
    setQMatchPreset(selected);
    const tpl = MATCHSTICK_TEMPLATES[selected];
    if (tpl) {
      setQMatchInitial(tpl.initial || []);
      setQMatchSolution(tpl.solution || []);
      setQMatchMaxMoves(tpl.moves || 2);
    } else {
      setQMatchInitial([]);
      setQMatchSolution([]);
      setQMatchMaxMoves(2);
    }
  }}
  className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
>
                      <option value="glass">Free the Circle (Cocktail Glass)</option>
                      <option value="triangle">Triangles / Fish / Hexagon</option>
                      <option value="grid_2x2">2x2 Square Grid</option>
                      <option value="grid_3x3">3x3 Square Grid (24 sticks)</option>
                      <option value="grid_4x4">4x4 Square Grid (40 sticks)</option>
                      <option value="digits">4 Digits (Numeric 1000)</option>
                    </select>
                  </div>

                  <div className="flex gap-2 border-b border-slate-800 pb-2">
                    <button
                      type="button"
                      onClick={() => setMatchEditTarget('initial')}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-xs ${matchEditTarget === 'initial' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      1. Set Initial Sticks ({qMatchInitial.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchEditTarget('solution')}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-xs ${matchEditTarget === 'solution' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      2. Set Solution Sticks ({qMatchSolution.length})
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Click any stick to toggle it on or off for the <b>{matchEditTarget}</b> state:
                  </p>

                  <MatchstickPuzzle
                    preset={qMatchPreset}
                    actionType="MOVE"
                    currentSticks={matchEditTarget === 'initial' ? qMatchInitial : qMatchSolution}
                    onSticksChange={matchEditTarget === 'initial' ? setQMatchInitial : setQMatchSolution}
                    isInteractive={true}
                  />

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Max Matchstick Moves</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={qMatchMaxMoves}
                      onChange={(e) => setQMatchMaxMoves(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              )}

              {/* JUMBLE BUILDER */}
              {qType === 'jumble' && (
                <div className="p-3.5 bg-slate-850 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
                    <SpellCheck className="w-4 h-4 text-indigo-400" /> Jumble Letters Configuration:
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 font-semibold mb-1">Target Mystery Word:</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. PLANET"
                      value={qJumbleTarget}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setQJumbleTarget(val);
                        setQJumbleScrambled(shuffleWord(val));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono uppercase tracking-widest text-sm font-bold"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] text-slate-300 font-semibold">Scrambled Letters:</label>
                      <button
                        type="button"
                        onClick={() => setQJumbleScrambled(shuffleWord(qJumbleTarget))}
                        className="text-xs text-indigo-400 hover:text-white flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Re-shuffle
                      </button>
                    </div>
                    <input
                      required
                      type="text"
                      placeholder="e.g. TNAPEL"
                      value={qJumbleScrambled}
                      onChange={(e) => setQJumbleScrambled(e.target.value.toUpperCase())}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-amber-300 font-mono uppercase tracking-widest text-sm font-bold"
                    />
                  </div>
                </div>
              )}

              {/* WORD SEARCH BUILDER */}
              {qType === 'wordsearch' && (
                <div className="p-3.5 bg-slate-850 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
                    <Search className="w-4 h-4 text-indigo-400" /> Words to Find:
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add word (e.g. JUPITER)"
                      value={newWordInput}
                      onChange={(e) => setNewWordInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono uppercase text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddWordToBuilder}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-white text-xs"
                    >
                      + Add Word
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {qTargetWords.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        onClick={() => setActiveWordIndex(idx)}
                        className={`flex items-center gap-1.5 py-1 px-3 rounded-lg border cursor-pointer text-xs font-bold ${
                          activeWordIndex === idx ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      >
                        <span>{item.word}</span>
                        {item.highlight ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span className="text-[10px] text-amber-400">(no line)</span>}
                        {qTargetWords.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveWordFromBuilder(idx);
                            }}
                            className="ml-1 text-slate-400 hover:text-rose-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <label className="block text-[11px] text-slate-300 font-semibold">Upload Image:</label>
                    <label className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-750 border border-dashed border-slate-600 rounded-lg cursor-pointer text-indigo-300 text-xs font-semibold">
                      <Upload className="w-3.5 h-3.5" /> Upload File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'single')}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="Or paste URL..."
                      value={qImageUrl}
                      onChange={(e) => setQImageUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                    />
                  </div>

                  {qImageUrl && qTargetWords[activeWordIndex] && (
                    <div className="flex justify-center pt-2">
                      <MultiWordSearchCanvas
                        imageUrl={qImageUrl}
                        persistedHighlights={qTargetWords.filter((w, i) => i !== activeWordIndex && w.highlight).map(w => w.highlight)}
                        currentDraftLine={builderDraftLine || qTargetWords[activeWordIndex]?.highlight}
                        onDraftChange={setBuilderDraftLine}
                        onDraftCommit={() => {
                          if (builderDraftLine) {
                            const copy = [...qTargetWords];
                            copy[activeWordIndex] = { ...copy[activeWordIndex], highlight: builderDraftLine };
                            setQTargetWords(copy);
                            setBuilderDraftLine(null);
                          }
                        }}
                        isInteractive={true}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* GUESS WORD BUILDER */}
              {qType === 'word' && (
                <div className="p-3.5 bg-slate-850 border border-slate-800 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-300 font-semibold">Image 1:</label>
                      <label className="flex items-center justify-center gap-1 py-2 px-2 bg-slate-800 border border-dashed border-slate-600 rounded-lg cursor-pointer text-indigo-300 text-xs">
                        <Upload className="w-3 h-3" /> Upload 1
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image1')} className="hidden" />
                      </label>
                      {qImage1 && <img src={qImage1} alt="P1" className="h-16 w-full object-contain bg-white rounded" />}
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-300 font-semibold">Image 2:</label>
                      <label className="flex items-center justify-center gap-1 py-2 px-2 bg-slate-800 border border-dashed border-slate-600 rounded-lg cursor-pointer text-indigo-300 text-xs">
                        <Upload className="w-3 h-3" /> Upload 2
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image2')} className="hidden" />
                      </label>
                      {qImage2 && <img src={qImage2} alt="P2" className="h-16 w-full object-contain bg-white rounded" />}
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Accepted Answers (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. seesaw, see saw"
                      value={qAcceptedAnswers}
                      onChange={(e) => setQAcceptedAnswers(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              )}

              {/* TRUE / FALSE */}
              {qType === 'boolean' && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setQCorrectIndex(0)}
                    className={`py-3 rounded-xl border font-bold text-sm ${qCorrectIndex === 0 ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-850 border-slate-750 text-slate-400'}`}
                  >
                    True is Correct
                  </button>
                  <button
                    type="button"
                    onClick={() => setQCorrectIndex(1)}
                    className={`py-3 rounded-xl border font-bold text-sm ${qCorrectIndex === 1 ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-850 border-slate-750 text-slate-400'}`}
                  >
                    False is Correct
                  </button>
                </div>
              )}

             {/* MCQ */}
              {qType === 'mcq' && (
                <div className="space-y-2">
                  {qOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-850 p-1.5 rounded-xl border border-slate-800">
                      <span className="w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center bg-slate-700 text-slate-300">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        onChange={(e) => {
                          const updated = [...qOptions];
                          updated[i] = e.target.value;
                          setQOptions(updated);
                        }}
                        className="flex-1 bg-transparent border-none text-white focus:outline-none text-sm px-2"
                      />
                      <button
                        type="button"
                        onClick={() => setQCorrectIndex(i)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${qCorrectIndex === i ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                      >
                        {qCorrectIndex === i ? 'Correct' : 'Mark'}
                      </button>
                      {qOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = qOptions.filter((_, idx) => idx !== i);
                            setQOptions(updated);
                            if (qCorrectIndex >= updated.length || qCorrectIndex === i) {
                              setQCorrectIndex(0);
                            }
                          }}
                          className="px-2 py-1 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 text-xs font-bold transition"
                          title="Remove option"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  {qOptions.length < 6 && (
                    <button
                      type="button"
                      onClick={() => setQOptions([...qOptions, ''])}
                      className="w-full py-2 border border-dashed border-slate-750 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 rounded-xl font-bold text-xs transition"
                    >
                      + Add Choice
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Explanation / Solution Notes</label>
                <textarea
                  rows={2}
                  placeholder="Explain why this answer is correct (shown on reveal)..."
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Time Limit (Seconds)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={qTimeLimit}
                  onChange={(e) => setQTimeLimit(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white rounded-xl shadow-lg shadow-indigo-600/30 transition"
              >
                {editingQId ? "Update Question in Quiz Bank" : "Save Question to Quiz Bank"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Quiz Bank ({questions.length})</h2>
              <span className="text-xs text-indigo-400 font-semibold">{activeQuestions.length} Active</span>
            </div>

            <div className="space-y-3 max-h-[78vh] overflow-y-auto pr-2">
              {questions.map((q, idx) => {
                const isEnabled = q.enabled !== false;
                return (
                  <div 
                    key={q.id || idx} 
                    className={`border rounded-2xl p-4 flex gap-3 items-start transition ${isEnabled ? 'bg-slate-900 border-slate-800' : 'bg-slate-950/60 border-slate-850 opacity-60'}`}
                  >
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleMoveUp(idx)} disabled={idx === 0} className="p-1 text-slate-500 hover:text-indigo-400 disabled:opacity-20">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 h-7 rounded-xl border border-slate-700 bg-slate-800 text-xs font-black flex items-center justify-center text-indigo-400">
                        {idx + 1}
                      </span>
                      <button onClick={() => handleMoveDown(idx)} disabled={idx === questions.length - 1} className="p-1 text-slate-500 hover:text-indigo-400 disabled:opacity-20">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {q.type} • {q.timeLimit}s
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleQuestion(q.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${isEnabled ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                          >
                            {isEnabled ? 'Active' : 'Inactive'}
                          </button>
                          <button onClick={() => handleEdit(q)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-400">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(q.id)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="font-semibold text-sm leading-snug text-slate-200">{q.question}</p>

                      {q.type === 'matchstick' && (
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-amber-400">
                          <span>Initial: 4 Digits</span>
                          <span>Move Limit: {q.maxMoves || 3} sticks</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {adminTab === "live" && (
        <div className="flex-1 flex flex-col md:flex-row">
          <div className="w-full md:w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div className="bg-slate-800/60 p-4 rounded-xl space-y-2 border border-slate-700/50">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Players Joined:</span>
                  <span className="font-bold text-emerald-400">{participantList.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Submissions:</span>
                  <span className="font-bold text-amber-400">{currentAnswerCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Active Questions:</span>
                  <span className="font-bold text-indigo-400">{activeQuestions.length}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-700/50">
                  <span className="text-slate-400">Mode:</span>
                  <button 
                    onClick={() => {
                      const newMode = game.mode === 'INDIVIDUAL' ? 'TEAM' : 'INDIVIDUAL';
                      update(ref(db, `rooms/${roomId}/game`), { mode: newMode });
                    }}
                    className="text-xs bg-indigo-600/30 text-indigo-300 px-2 py-0.5 rounded font-semibold hover:bg-indigo-600/50"
                  >
                    {game.mode}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {game.status === 'LOBBY' && (
                  <button
                    onClick={startQuiz}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <Play className="w-4 h-4 fill-current" /> Start Quiz ({activeQuestions.length} Qs)
                  </button>
                )}

                {game.status === 'QUESTION' && (
                  <button
                    onClick={() => update(ref(db, `rooms/${roomId}/game`), { status: 'REVEAL', timeRemaining: 0 })}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold"
                  >
                    Reveal Solution
                  </button>
                )}

                {game.status === 'REVEAL' && (
                  <button
                    onClick={showLeaderboard}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Trophy className="w-4 h-4" /> Show Standings
                  </button>
                )}

                {game.status === 'LEADERBOARD' && (
                  <button
                    onClick={nextQuestion}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    Next Question <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={triggerLuckyDraw}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/25 transition active:scale-[0.98]"
                >
                  <Gift className="w-5 h-5 fill-current" /> Run Lucky Draw ({participantList.length} Players)
                </button>

                <button
                  onClick={resetRoom}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Session to Lobby
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 flex flex-col justify-center items-center bg-slate-950 overflow-y-auto">
            {game.status === 'LOBBY' && (
              <div className="max-w-xl w-full text-center space-y-5 my-auto">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">Join the Live Quiz!</h1>
                <div className="inline-block p-4 bg-white rounded-3xl shadow-2xl">
                  <QRCodeSVG value={currentJoinUrl} size={180} />
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Scan QR or visit on your mobile:</p>
                  <p className="text-lg md:text-xl font-mono font-bold text-indigo-400 bg-slate-900 py-1.5 px-5 rounded-xl inline-block border border-slate-800 shadow-inner">
                    {currentJoinUrl}
                  </p>
                </div>
              </div>
            )}

            {game.status === 'LUCKY_DRAW' && (
              <div className="max-w-xl w-full my-auto text-center space-y-6 animate-fade-in">
                <div className="w-20 h-20 bg-yellow-400 text-black rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-yellow-500/40">
                  <Gift className="w-10 h-10 animate-bounce" />
                </div>
                <h1 className="text-4xl font-black text-white">🎁 Live Lucky Draw!</h1>
                <div className="p-8 bg-slate-900 border-2 border-yellow-500/60 rounded-3xl shadow-2xl">
                  <p className="text-4xl md:text-5xl font-black text-yellow-400">
                    {animatedName || "..."}
                  </p>
                </div>
              </div>
            )}

            {(game.status === 'QUESTION' || game.status === 'REVEAL') && (
              <div className="max-w-3xl w-full my-auto space-y-6 text-center">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <span className="text-lg font-bold text-indigo-400">Question {game.currentIndex + 1} of {activeQuestions.length}</span>
                  <div className="flex items-center gap-2 text-3xl font-black text-amber-400">
                    <Clock className="w-8 h-8" /> {game.timeRemaining}s
                  </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold leading-snug">{currQ?.question}</h2>

                {currQ?.type === 'matchstick' && (
                  <div className="my-6 space-y-4">
                 <MatchstickPuzzle
                      preset={currQ?.preset || 'digits'}
                      currentSticks={currQ?.initialSticks || []}
                      solutionSticks={currQ?.solutionSticks || []}
                      showSolution={game.status === 'REVEAL'}
                      isInteractive={false}
                    />
                    {game.status === 'REVEAL' && (
                      <p className="text-emerald-400 font-bold tracking-wider text-base mt-2">
                        ✓ Highest 4-Digit Number: 7887
                      </p>
                    )}
                  </div>
                )}

                {currQ?.type === 'jumble' && (
                  <div className="my-6 space-y-4">
                    <div className="flex justify-center flex-wrap gap-3">
                      {(game.status === 'REVEAL' ? currQ.targetWord : (currQ.scrambledLetters || currQ.targetWord)).split('').map((char, i) => (
                        <div
                          key={i}
                          className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center font-black text-3xl md:text-4xl shadow-2xl ${
                            game.status === 'REVEAL'
                              ? 'bg-emerald-600 text-white border-2 border-emerald-400'
                              : 'bg-slate-900 border-2 border-indigo-500/50 text-amber-400'
                          }`}
                        >
                          {char}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {game.status === 'REVEAL' && currQ?.explanation && (
                  <div className="p-5 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 animate-fade-in text-left">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm uppercase tracking-wider mb-1">
                      <Info className="w-4 h-4 text-indigo-400" /> Explanation:
                    </div>
                    <p className="text-slate-200 text-base leading-relaxed">{currQ.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {(game.status === 'LEADERBOARD' || game.status === 'FINAL') && (
              <div className="max-w-xl w-full my-auto space-y-6">
                <Trophy className="w-14 h-14 text-yellow-400 mx-auto" />
                <h2 className="text-4xl font-black">{game.status === 'FINAL' ? "Final Podium" : "Current Standings"}</h2>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {getLeaderboard().slice(0, 5).map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <span className="font-bold text-lg">{idx + 1}. {entry.name}</span>
                      <span className="text-indigo-400 font-extrabold text-xl">{entry.score || 0} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}