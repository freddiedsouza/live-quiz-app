import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, set, update, onValue, get } from 'firebase/database';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { 
  Trophy, Clock, CheckCircle2, Play, 
  ChevronRight, RefreshCw, Smartphone, Monitor, ShieldCheck, Sparkles, Plus, 
  Trash2, Edit3, Layers, Check, X, Info, RotateCcw, Type
} from 'lucide-react';

const PUZZLE_14_INITIAL = [
  "H_0_0", "H_0_1",
  "V_0_0", "V_0_1", "V_0_2",
  "H_1_0", "H_1_1",
  "V_1_0", "V_1_1", "V_1_2",
  "H_2_0", "H_2_1"
];

const PUZZLE_14_SOLUTION = [
  "H_0_0", "H_0_1",
  "V_0_0", "V_0_1", "V_0_2",
  "H_1_0",
  "V_1_0", "V_1_2",
  "H_2_0", "H_2_1"
];

const INITIAL_QUESTIONS = [
  {
    id: "q_word_1",
    type: "word",
    question: "GUESS THE WORD: Look at the visual clues (👀 + 🪚) and type the word!",
    imageUrl: "https://i.ibb.co/vzjKj5T/seesaw-clue.png", // or custom image
    acceptedAnswers: ["seesaw", "see saw", "see-saw"],
    timeLimit: 25,
    explanation: "Two eyes represent 'SEE' and the tool represents 'SAW' = SEESAW!"
  },
  {
    id: "q_match_1",
    type: "matchstick",
    question: "Remove 2 matchsticks to leave exactly 2 squares! Tap matches to remove.",
    timeLimit: 45,
    maxMoves: 2,
    initialSticks: PUZZLE_14_INITIAL,
    validSolutions: [
      PUZZLE_14_SOLUTION,
      ["H_0_0", "H_0_1", "V_0_0", "V_0_2", "H_1_1", "V_1_0", "V_1_1", "V_1_2", "H_2_0", "H_2_1"]
    ],
    explanation: "Removing one internal dividing stick and one outer branch eliminates two small squares while preserving the large and remaining perimeter squares."
  },
  {
    id: "q_1",
    type: "boolean",
    question: "Sound travels faster in water than in air.",
    options: ["True", "False"],
    correctIndex: 0,
    timeLimit: 15,
    explanation: "True! Water particles are packed much more densely than air molecules, allowing vibrations to transmit roughly 4.3 times faster."
  },
  {
    id: "q_2",
    type: "mcq",
    question: "Which planet in our solar system has the most moons?",
    options: ["Jupiter", "Saturn", "Uranus", "Neptune"],
    correctIndex: 1,
    timeLimit: 20,
    explanation: "Saturn has 146 confirmed moons, overtaking Jupiter's 95 moons."
  }
];

function MatchstickBoard({ currentSticks, onStickToggle, isInteractive = true, selectedStick = null }) {
  const horizontalSlots = [
    { id: "H_0_0", x: 40, y: 30, width: 90, height: 14 },
    { id: "H_0_1", x: 150, y: 30, width: 90, height: 14 },
    { id: "H_1_0", x: 40, y: 140, width: 90, height: 14 },
    { id: "H_1_1", x: 150, y: 140, width: 90, height: 14 },
    { id: "H_2_0", x: 40, y: 250, width: 90, height: 14 },
    { id: "H_2_1", x: 150, y: 250, width: 90, height: 14 }
  ];

  const verticalSlots = [
    { id: "V_0_0", x: 30, y: 40, width: 14, height: 90 },
    { id: "V_0_1", x: 140, y: 40, width: 14, height: 90 },
    { id: "V_0_2", x: 250, y: 40, width: 14, height: 90 },
    { id: "V_1_0", x: 30, y: 150, width: 14, height: 90 },
    { id: "V_1_1", x: 140, y: 150, width: 14, height: 90 },
    { id: "V_1_2", x: 250, y: 150, width: 14, height: 90 }
  ];

  return (
    <div className="flex justify-center items-center w-full py-2 select-none">
      <svg viewBox="0 0 300 300" className="w-full max-w-[260px] sm:max-w-[280px] aspect-square bg-slate-900/90 rounded-2xl border border-slate-800 p-2 shadow-inner">
        {horizontalSlots.map((slot) => {
          const isActive = currentSticks.includes(slot.id);
          const isSelected = selectedStick === slot.id;
          return (
            <g 
              key={slot.id} 
              onClick={() => isInteractive && onStickToggle(slot.id)}
              className={isInteractive ? "cursor-pointer transition-transform hover:scale-[1.02]" : ""}
            >
              <rect
                x={slot.x}
                y={slot.y}
                width={slot.width}
                height={slot.height}
                rx={6}
                className={isActive ? "hidden" : "fill-slate-800/40 stroke-dashed stroke-slate-700 stroke-[1.5]"}
              />
              {isActive && (
                <>
                  <rect
                    x={slot.x}
                    y={slot.y}
                    width={slot.width}
                    height={slot.height}
                    rx={4}
                    className={`transition ${isSelected ? "fill-amber-300 stroke-2 stroke-amber-400" : "fill-[#F4C430]"}`}
                  />
                  <circle cx={slot.x + slot.width - 6} cy={slot.y + 7} r={6} className="fill-red-700" />
                </>
              )}
            </g>
          );
        })}

        {verticalSlots.map((slot) => {
          const isActive = currentSticks.includes(slot.id);
          const isSelected = selectedStick === slot.id;
          return (
            <g 
              key={slot.id} 
              onClick={() => isInteractive && onStickToggle(slot.id)}
              className={isInteractive ? "cursor-pointer transition-transform hover:scale-[1.02]" : ""}
            >
              <rect
                x={slot.x}
                y={slot.y}
                width={slot.width}
                height={slot.height}
                rx={6}
                className={isActive ? "hidden" : "fill-slate-800/40 stroke-dashed stroke-slate-700 stroke-[1.5]"}
              />
              {isActive && (
                <>
                  <rect
                    x={slot.x}
                    y={slot.y}
                    width={slot.width}
                    height={slot.height}
                    rx={4}
                    className={`transition ${isSelected ? "fill-amber-300 stroke-2 stroke-amber-400" : "fill-[#F4C430]"}`}
                  />
                  <circle cx={slot.x + 7} cy={slot.y + 6} r={6} className="fill-red-700" />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [roomId, setRoomId] = useState("QUIZ1");

  // Admin states
  const [adminPass, setAdminPass] = useState("");
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [adminTab, setAdminTab] = useState("live");
  const [questions, setQuestions] = useState(INITIAL_QUESTIONS);

  // Question Form Builder state
  const [editingQId, setEditingQId] = useState(null);
  const [qType, setQType] = useState("word");
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState(["True", "False"]);
  const [qCorrectIndex, setQCorrectIndex] = useState(0);
  const [qTimeLimit, setQTimeLimit] = useState(25);
  const [qImageUrl, setQImageUrl] = useState("");
  const [qTargetCoords, setQTargetCoords] = useState("30,30,70,70");
  const [qExplanation, setQExplanation] = useState("");
  const [qAcceptedAnswers, setQAcceptedAnswers] = useState("seesaw, see saw");
  const [qMatchInitial, setQMatchInitial] = useState(PUZZLE_14_INITIAL);
  const [qMatchSolution, setQMatchSolution] = useState(PUZZLE_14_SOLUTION);
  const [statusMessage, setStatusMessage] = useState("");

  // Room / Game synchronized state
  const [game, setGame] = useState({
    status: 'LOBBY',
    mode: 'INDIVIDUAL',
    currentIndex: 0,
    timeRemaining: 20,
    questionStartTime: 0
  });

  const [participants, setParticipants] = useState({});
  const [answers, setAnswers] = useState({});

  // Participant local state
  const [playerName, setPlayerName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [tapCoords, setTapCoords] = useState(null);

  // Participant Matchstick interactive state
  const [userSticks, setUserSticks] = useState(PUZZLE_14_INITIAL);
  const [stickInventory, setStickInventory] = useState(0);

  // Sync with Firebase
  useEffect(() => {
    if (!roomId) return;

    const gameRef = ref(db, `rooms/${roomId}/game`);
    const partRef = ref(db, `rooms/${roomId}/participants`);
    const ansRef = ref(db, `rooms/${roomId}/answers`);
    const qRef = ref(db, `rooms/${roomId}/questions`);

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

    return () => {
      unsubGame();
      unsubPart();
      unsubAns();
      unsubQ();
    };
  }, [roomId]);

  // Admin live countdown timer
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
    if (game.status === 'FINAL') {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }
  }, [game.status]);

  useEffect(() => {
    setSelectedAnswer(null);
    setTypedAnswer("");
    setTapCoords(null);
    const curr = questions[game.currentIndex];
    if (curr && curr.type === 'matchstick') {
      setUserSticks(curr.initialSticks || PUZZLE_14_INITIAL);
      setStickInventory(0);
    }
  }, [game.currentIndex, game.status]);

  // Admin Actions
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPass === "admin123") {
      setIsAdminAuthed(true);
      const roomRef = ref(db, `rooms/${roomId}`);
      get(roomRef).then((snap) => {
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
      });
    } else {
      alert("Incorrect passcode. Try: admin123");
    }
  };

  const startQuiz = () => {
    const firstQ = questions[0];
    update(ref(db, `rooms/${roomId}/game`), {
      status: 'QUESTION',
      currentIndex: 0,
      timeRemaining: firstQ.timeLimit || 20,
      questionStartTime: Date.now()
    });
    set(ref(db, `rooms/${roomId}/answers`), {});
  };

  const nextQuestion = () => {
    const nextIdx = game.currentIndex + 1;
    if (nextIdx >= questions.length) {
      update(ref(db, `rooms/${roomId}/game`), { status: 'FINAL' });
    } else {
      const q = questions[nextIdx];
      update(ref(db, `rooms/${roomId}/game`), {
        status: 'QUESTION',
        currentIndex: nextIdx,
        timeRemaining: q.timeLimit || 20,
        questionStartTime: Date.now()
      });
      set(ref(db, `rooms/${roomId}/answers`), {});
    }
  };

  const showLeaderboard = () => {
    update(ref(db, `rooms/${roomId}/game`), { status: 'LEADERBOARD' });
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
  };

  // Question Management Form Handlers
  const resetForm = () => {
    setEditingQId(null);
    setQType("word");
    setQText("");
    setQOptions(["True", "False"]);
    setQCorrectIndex(0);
    setQTimeLimit(25);
    setQImageUrl("");
    setQTargetCoords("30,30,70,70");
    setQExplanation("");
    setQAcceptedAnswers("");
    setQMatchInitial(PUZZLE_14_INITIAL);
    setQMatchSolution(PUZZLE_14_SOLUTION);
  };

  const handleEdit = (q) => {
    setEditingQId(q.id);
    setQType(q.type || "mcq");
    setQText(q.question || "");
    setQOptions(q.options && q.options.length ? [...q.options] : ["True", "False"]);
    setQCorrectIndex(q.correctIndex || 0);
    setQTimeLimit(q.timeLimit || 20);
    setQImageUrl(q.imageUrl || "");
    setQExplanation(q.explanation || "");
    if (q.type === 'word') {
      setQAcceptedAnswers(Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers.join(", ") : "");
    }
    if (q.type === 'matchstick') {
      setQMatchInitial(q.initialSticks || PUZZLE_14_INITIAL);
      setQMatchSolution(q.validSolutions?.[0] || PUZZLE_14_SOLUTION);
    }
    if (q.target) {
      setQTargetCoords(`${q.target.xMin},${q.target.yMin},${q.target.xMax},${q.target.yMax}`);
    } else {
      setQTargetCoords("30,30,70,70");
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOptionChange = (idx, value) => {
    const updated = [...qOptions];
    updated[idx] = value;
    setQOptions(updated);
  };

  const addOptionField = () => {
    if (qOptions.length < 6) {
      setQOptions([...qOptions, ""]);
    }
  };

  const removeOptionField = (idx) => {
    if (qOptions.length > 2) {
      const updated = qOptions.filter((_, i) => i !== idx);
      setQOptions(updated);
      if (qCorrectIndex >= updated.length) {
        setQCorrectIndex(0);
      }
    }
  };

  const handleTypeSwitch = (type) => {
    setQType(type);
    if (type === 'boolean') {
      setQOptions(["True", "False"]);
      if (qCorrectIndex > 1) setQCorrectIndex(0);
    } else if (type === 'mcq' && qOptions.length < 4) {
      setQOptions(["", "", "", ""]);
    } else if (type === 'word') {
      setQTimeLimit(25);
    } else if (type === 'matchstick') {
      setQTimeLimit(45);
    }
  };

  const handleSaveQuestion = (e) => {
    e.preventDefault();
    if (!qText.trim()) {
      setStatusMessage("Error: Question prompt cannot be empty.");
      return;
    }

    let finalOptions = qOptions;
    let accepted = [];

    if (qType === 'boolean') {
      finalOptions = ["True", "False"];
    } else if (qType === 'diagram') {
      finalOptions = ["Target Spot on Image"];
    } else if (qType === 'matchstick') {
      finalOptions = ["Interactive Matchstick Grid"];
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

    let parsedTarget = null;
    if (qType === 'diagram') {
      const nums = qTargetCoords.split(',').map(n => Number(n.trim()));
      parsedTarget = {
        xMin: nums[0] || 25,
        yMin: nums[1] || 25,
        xMax: nums[2] || 75,
        yMax: nums[3] || 75
      };
    }

    const payload = {
      id: editingQId || `q_${Date.now()}`,
      type: qType,
      question: qText.trim(),
      options: finalOptions,
      correctIndex: Number(qCorrectIndex),
      timeLimit: Number(qTimeLimit) || 20,
      imageUrl: qImageUrl.trim() || null,
      explanation: qExplanation.trim() || null,
      acceptedAnswers: qType === 'word' ? accepted : null,
      target: parsedTarget,
      initialSticks: qType === 'matchstick' ? qMatchInitial : null,
      validSolutions: qType === 'matchstick' ? [qMatchSolution] : null
    };

    let updatedList = [];
    if (editingQId) {
      updatedList = questions.map(q => q.id === editingQId ? payload : q);
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

  // Participant Matchstick Actions
  const handleStickToggle = (slotId) => {
    if (selectedAnswer !== null || game.status !== 'QUESTION') return;
    const isCurrentlyActive = userSticks.includes(slotId);

    if (isCurrentlyActive) {
      setUserSticks(prev => prev.filter(id => id !== slotId));
      setStickInventory(prev => prev + 1);
    } else {
      if (stickInventory > 0) {
        setUserSticks(prev => [...prev, slotId]);
        setStickInventory(prev => prev - 1);
      }
    }
  };

  const submitMatchstickSolution = () => {
    if (selectedAnswer !== null || game.status !== 'QUESTION') return;
    const curr = questions[game.currentIndex];
    const participantId = playerName.trim().toLowerCase().replace(/\s+/g, '_');

    const sortedUser = [...userSticks].sort();
    let isCorrect = false;

    if (curr.validSolutions && Array.isArray(curr.validSolutions)) {
      isCorrect = curr.validSolutions.some(sol => {
        const sortedSol = [...sol].sort();
        return JSON.stringify(sortedSol) === JSON.stringify(sortedUser);
      });
    }

    setSelectedAnswer("MATCHSTICK_SUBMITTED");

    set(ref(db, `rooms/${roomId}/answers/${participantId}`), {
      answer: "MATCHSTICK",
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

  // Submit Typed Word Riddle
  const submitWordAnswer = (e) => {
    e.preventDefault();
    if (!typedAnswer.trim() || selectedAnswer !== null || game.status !== 'QUESTION') return;
    const curr = questions[game.currentIndex];
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

  const submitAnswer = (optionIdx, coords = null) => {
    if (selectedAnswer !== null || game.status !== 'QUESTION') return;
    const participantId = playerName.trim().toLowerCase().replace(/\s+/g, '_');
    const curr = questions[game.currentIndex];
    
    let isCorrect = false;
    if (curr.type === 'diagram' && coords && curr.target) {
      isCorrect = 
        coords.x >= currQ.target.xMin && 
        coords.x <= currQ.target.xMax && 
        coords.y >= currQ.target.yMin && 
        coords.y <= currQ.target.yMax;
      setTapCoords(coords);
    } else {
      isCorrect = optionIdx === currQ.correctIndex;
    }

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

  const currQ = questions[game.currentIndex] || questions[0];
  const participantList = Object.values(participants);
  const currentAnswerCount = Object.keys(answers).length;

  // View: Landing Screen
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="inline-flex p-4 bg-indigo-600/20 text-indigo-400 rounded-3xl ring-1 ring-indigo-500/30">
            <Sparkles className="w-12 h-12 animate-pulse" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Live Interactive Quiz</h1>
            <p className="text-slate-400 mt-2">Trivia, Word Riddles, Matchsticks & Visuals</p>
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

  // View: Participant Mobile Screen
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
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col p-4 pb-8 justify-between">
          <div>
            <div className="flex items-center justify-between py-2 border-b border-slate-800 mb-3">
              <span className="text-xs font-semibold text-slate-400">Q {game.currentIndex + 1} of {questions.length}</span>
              <div className={`px-3 py-1 rounded-full font-bold text-sm ${game.timeRemaining <= 5 ? 'bg-red-500/20 text-red-400 animate-bounce' : 'bg-slate-800 text-slate-200'}`}>
                ⏱ {game.timeRemaining}s
              </div>
            </div>

            <h3 className="text-base font-bold mb-3 leading-snug">{currQ.question}</h3>

            {/* GUESS THE WORD: IMAGE DISPLAY */}
            {currQ.type === 'word' && currQ.imageUrl && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-slate-800 flex justify-center bg-black">
                <img src={currQ.imageUrl} alt="Clue" className="max-h-48 object-contain" />
              </div>
            )}

            {/* GUESS THE WORD: TEXT ENTRY BOX */}
            {currQ.type === 'word' && (
              <div className="space-y-4 my-2">
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

            {/* MATCHSTICK INTERACTIVE BOARD */}
            {currQ.type === 'matchstick' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400">Sticks in Hand: <b className="text-amber-400 text-sm">{stickInventory}</b></span>
                  <button
                    onClick={() => {
                      setUserSticks(currQ.initialSticks || PUZZLE_14_INITIAL);
                      setStickInventory(0);
                    }}
                    disabled={selectedAnswer !== null}
                    className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Board
                  </button>
                </div>

                <MatchstickBoard
                  currentSticks={game.status === 'REVEAL' ? (currQ.validSolutions?.[0] || PUZZLE_14_SOLUTION) : userSticks}
                  onStickToggle={handleStickToggle}
                  isInteractive={selectedAnswer === null && game.status === 'QUESTION'}
                />

                {selectedAnswer === null && game.status === 'QUESTION' && (
                  <button
                    onClick={submitMatchstickSolution}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white shadow-lg shadow-emerald-600/30 transition active:scale-[0.98]"
                  >
                    Submit Matchstick Arrangement
                  </button>
                )}
              </div>
            )}

            {/* TRUE / FALSE */}
            {currQ.type === 'boolean' && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {currQ.options.map((opt, idx) => {
                  let btnStyle = "bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-850";
                  if (selectedAnswer === idx) {
                    btnStyle = "bg-indigo-600 border-indigo-500 text-white ring-2 ring-indigo-400";
                  }
                  if (game.status === 'REVEAL') {
                    if (idx === currQ.correctIndex) {
                      btnStyle = "bg-emerald-600 border-emerald-500 text-white font-bold";
                    } else if (selectedAnswer === idx) {
                      btnStyle = "bg-rose-600 border-rose-500 text-white";
                    } else {
                      btnStyle = "bg-slate-900/40 border-slate-900 text-slate-600";
                    }
                  }
                  return (
                    <button
                      key={idx}
                      disabled={selectedAnswer !== null || game.status !== 'QUESTION'}
                      onClick={() => submitAnswer(idx)}
                      className={`w-full py-4 px-5 rounded-2xl border text-center font-bold text-base transition ${btnStyle}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* MCQ */}
            {currQ.type === 'mcq' && (
              <div className="grid grid-cols-1 gap-3 mt-4">
                {currQ.options.map((opt, idx) => {
                  let btnStyle = "bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-850";
                  if (selectedAnswer === idx) {
                    btnStyle = "bg-indigo-600 border-indigo-500 text-white ring-2 ring-indigo-400";
                  }
                  if (game.status === 'REVEAL') {
                    if (idx === currQ.correctIndex) {
                      btnStyle = "bg-emerald-600 border-emerald-500 text-white font-bold";
                    } else if (selectedAnswer === idx) {
                      btnStyle = "bg-rose-600 border-rose-500 text-white";
                    } else {
                      btnStyle = "bg-slate-900/40 border-slate-900 text-slate-600";
                    }
                  }
                  return (
                    <button
                      key={idx}
                      disabled={selectedAnswer !== null || game.status !== 'QUESTION'}
                      onClick={() => submitAnswer(idx)}
                      className={`w-full py-4 px-5 rounded-2xl border text-left font-semibold text-base transition flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {game.status === 'REVEAL' && idx === currQ.correctIndex && (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            {game.status === 'REVEAL' && (
              <div className="mt-4 p-4 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 animate-fade-in text-left">
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

            {selectedAnswer !== null && game.status === 'QUESTION' && (
              <p className="text-center text-sm text-emerald-400 mt-4 animate-fade-in">
                ✓ Answer submitted! Waiting for countdown...
              </p>
            )}
          </div>
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

  // View: Admin Login
  if (!isAdminAuthed) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <form onSubmit={handleAdminLogin} className="max-w-sm w-full space-y-5 bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 text-indigo-400">
            <ShieldCheck className="w-7 h-7" />
            <h2 className="text-xl font-bold text-white">Host Access</h2>
          </div>
          <p className="text-xs text-slate-400">Default passcode is <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300">admin123</code></p>
          <input
            type="password"
            placeholder="Enter passcode"
            value={adminPass}
            onChange={(e) => setAdminPass(e.target.value)}
            className="w-full bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl transition"
          >
            Open Host Dashboard
          </button>
        </form>
      </div>
    );
  }

  const currentJoinUrl = window.location.origin;

  // View: Host Admin Dashboard
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
            <Layers className="w-3.5 h-3.5" /> Question Bank ({questions.length})
          </button>
        </div>
      </header>

      {/* QUESTION BANK BUILDER (2-COLUMN: FORM + LIST) */}
      {adminTab === "builder" && (
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Creator Form */}
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'word', label: 'Guess Word' },
                    { id: 'boolean', label: 'True / False' },
                    { id: 'mcq', label: 'Multiple Choice' },
                    { id: 'matchstick', label: 'Matchstick' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTypeSwitch(tab.id)}
                      className={`py-2 rounded-xl border font-bold text-center transition ${qType === tab.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-white'}`}
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
                  placeholder={qType === 'word' ? "e.g. Look at the two pictures and guess the compound word!" : "Enter question prompt..."}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              {/* GUESS THE WORD: ACCEPTED WORDS INPUT */}
              {qType === 'word' && (
                <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl space-y-1">
                  <label className="block text-indigo-300 font-bold flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5" /> Accepted Answers (Comma-separated):
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. seesaw, see saw, see-saw"
                    value={qAcceptedAnswers}
                    onChange={(e) => setQAcceptedAnswers(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none text-xs font-mono"
                  />
                  <p className="text-[10px] text-slate-500">
                    Matches are case-insensitive and ignore spaces or hyphens automatically.
                  </p>
                </div>
              )}

              {/* TRUE / FALSE SELECTION */}
              {qType === 'boolean' && (
                <div className="space-y-2">
                  <label className="block text-slate-400 font-semibold">Mark Correct Answer</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setQCorrectIndex(0)}
                      className={`py-3.5 rounded-xl border font-bold text-sm transition flex items-center justify-center gap-2 ${qCorrectIndex === 0 ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30' : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-white'}`}
                    >
                      {qCorrectIndex === 0 && <Check className="w-4 h-4" />} True is Correct
                    </button>
                    <button
                      type="button"
                      onClick={() => setQCorrectIndex(1)}
                      className={`py-3.5 rounded-xl border font-bold text-sm transition flex items-center justify-center gap-2 ${qCorrectIndex === 1 ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30' : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-white'}`}
                    >
                      {qCorrectIndex === 1 && <Check className="w-4 h-4" />} False is Correct
                    </button>
                  </div>
                </div>
              )}

              {/* MCQ CHOICES WITH MARK BUTTON */}
              {qType === 'mcq' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-slate-400 font-semibold">Options (Click Mark to choose correct)</label>
                    {qOptions.length < 6 && (
                      <button 
                        type="button" 
                        onClick={addOptionField} 
                        className="text-indigo-400 hover:text-indigo-300 font-bold text-[11px]"
                      >
                        + Add Choice
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {qOptions.map((opt, i) => {
                      const isCorrect = qCorrectIndex === i;
                      return (
                        <div 
                          key={i} 
                          className={`flex items-center gap-2 p-1.5 rounded-xl border transition ${isCorrect ? 'border-emerald-500 bg-emerald-950/20' : 'border-slate-800 bg-slate-850'}`}
                        >
                          <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${isCorrect ? 'bg-emerald-500 text-black font-black' : 'bg-slate-700 text-slate-300'}`}>
                            {String.fromCharCode(65 + i)}
                          </span>

                          <input
                            required
                            type="text"
                            placeholder={`Option ${String.fromCharCode(65 + i)} text`}
                            value={opt}
                            onChange={(e) => handleOptionChange(i, e.target.value)}
                            className="flex-1 bg-transparent border-none text-white focus:outline-none text-sm px-2"
                          />

                          <button
                            type="button"
                            onClick={() => setQCorrectIndex(i)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${isCorrect ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-750'}`}
                          >
                            {isCorrect ? <Check className="w-3.5 h-3.5" /> : null}
                            {isCorrect ? 'Correct' : 'Mark'}
                          </button>

                          {qOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOptionField(i)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MATCHSTICK PUZZLE PREVIEW IN BUILDER */}
              {qType === 'matchstick' && (
                <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-amber-400 font-bold">Initial Matchstick Grid (2x2)</span>
                    <button
                      type="button"
                      onClick={() => setQMatchInitial(PUZZLE_14_INITIAL)}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Reset to Default Grid
                    </button>
                  </div>
                  <MatchstickBoard
                    currentSticks={qMatchInitial}
                    onStickToggle={(slotId) => {
                      if (qMatchInitial.includes(slotId)) {
                        setQMatchInitial(qMatchInitial.filter(id => id !== slotId));
                      } else {
                        setQMatchInitial([...qMatchInitial, slotId]);
                      }
                    }}
                    isInteractive={true}
                  />
                  <p className="text-[10px] text-slate-500">Tap sticks above to toggle which sticks start on the board.</p>
                </div>
              )}

              {/* REASON / EXPLANATION FIELD */}
              <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl space-y-1">
                <label className="block text-indigo-300 font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Explanation for Participants:
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain the clue / solution (shown on Reveal)..."
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                />
              </div>

              {/* IMAGE URL */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Image URL (Clue Picture)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={qImageUrl}
                  onChange={(e) => setQImageUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none"
                />
                {qImageUrl && (
                  <div className="mt-2 p-1 bg-black rounded-lg border border-slate-800 flex justify-center">
                    <img src={qImageUrl} alt="Preview" className="h-24 object-contain" />
                  </div>
                )}
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

          {/* Question List (Right Column) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Quiz Bank Questions ({questions.length})</h2>
              <span className="text-xs text-slate-500">Live synced with participants</span>
            </div>

            <div className="space-y-3 max-h-[78vh] overflow-y-auto pr-2">
              {questions.map((q, idx) => (
                <div key={q.id || idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-3 items-start hover:border-slate-700 transition">
                  <span className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black flex items-center justify-center text-indigo-400 flex-shrink-0">
                    {idx + 1}
                  </span>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {q.type} • {q.timeLimit}s
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(q)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-400 transition"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="font-semibold text-sm leading-snug">{q.question}</p>

                    {q.type === 'word' && (
                      <div className="text-xs text-indigo-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                        <b>Accepted:</b> {Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers.join(", ") : ""}
                      </div>
                    )}

                    {q.imageUrl && (
                      <img src={q.imageUrl} alt="Clue" className="h-16 w-28 object-contain rounded-lg border border-slate-800 bg-black" />
                    )}

                    {q.type === 'matchstick' && (
                      <div className="p-2 bg-black/40 rounded-xl border border-slate-800 flex items-center gap-3">
                        <div className="w-16 h-16 flex-shrink-0">
                          <MatchstickBoard currentSticks={q.initialSticks || PUZZLE_14_INITIAL} isInteractive={false} />
                        </div>
                        <div className="text-[11px] text-slate-400">
                          <p className="text-amber-400 font-bold">Interactive Matchstick Board</p>
                        </div>
                      </div>
                    )}

                    {q.type === 'boolean' && (
                      <div className="flex items-center gap-2 pt-1 text-xs">
                        <span className="text-slate-400">Answer:</span>
                        <span className="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                          {q.correctIndex === 0 ? "True" : "False"}
                        </span>
                      </div>
                    )}

                    {q.type === 'mcq' && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {q.options.map((opt, oIdx) => (
                          <span
                            key={oIdx}
                            className={`text-xs px-2.5 py-1 rounded-lg border truncate flex items-center gap-1.5 ${oIdx === q.correctIndex ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 font-bold' : 'bg-slate-950/40 border-slate-800 text-slate-400'}`}
                          >
                            <span className="text-[10px] opacity-60">{String.fromCharCode(65 + oIdx)}.</span>
                            <span className="truncate">{opt}</span>
                            {oIdx === q.correctIndex && <Check className="w-3 h-3 text-emerald-400 ml-auto flex-shrink-0" />}
                          </span>
                        ))}
                      </div>
                    )}

                    {q.explanation && (
                      <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <span><b className="text-slate-300">Reason:</b> {q.explanation}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LIVE PROJECTOR & HOST VIEW */}
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
                    <Play className="w-4 h-4 fill-current" /> Start Quiz
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

                <div className="pt-4 border-t border-slate-850 w-full">
                  <div className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-3">
                    Connected Participants ({participantList.length})
                  </div>
                  
                  {participantList.length === 0 ? (
                    <p className="text-slate-600 text-sm italic">Waiting for players to join...</p>
                  ) : (
                    <div className="flex flex-wrap gap-2.5 justify-center max-h-44 overflow-y-auto px-2">
                      {participantList.map((p, i) => (
                        <span 
                          key={i} 
                          className="bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-sm font-semibold px-3.5 py-1.5 rounded-xl shadow-sm flex items-center gap-2 animate-fade-in"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          {p.name || 'Anonymous'} {p.team ? `[${p.team}]` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(game.status === 'QUESTION' || game.status === 'REVEAL') && (
              <div className="max-w-3xl w-full my-auto space-y-6 text-center">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <span className="text-lg font-bold text-indigo-400">Question {game.currentIndex + 1} of {questions.length}</span>
                  <div className="flex items-center gap-2 text-3xl font-black text-amber-400">
                    <Clock className="w-8 h-8" /> {game.timeRemaining}s
                  </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold leading-snug">{currQ.question}</h2>

                {/* Guess the Word Projector View */}
                {currQ.type === 'word' && currQ.imageUrl && (
                  <div className="max-h-80 overflow-hidden rounded-2xl border border-slate-800 flex justify-center bg-black">
                    <img src={currQ.imageUrl} alt="Clue" className="max-h-80 object-contain" />
                  </div>
                )}

                {/* Word Answer on Reveal */}
                {game.status === 'REVEAL' && currQ.type === 'word' && (
                  <div className="p-6 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500 text-center animate-bounce-short">
                    <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Answer:</span>
                    <p className="text-4xl font-black text-white mt-1 tracking-wider uppercase">
                      {currQ.acceptedAnswers?.[0]}
                    </p>
                  </div>
                )}

                {/* Matchstick Projector View */}
                {currQ.type === 'matchstick' && (
                  <div className="flex flex-col items-center">
                    <MatchstickBoard
                      currentSticks={game.status === 'REVEAL' ? (currQ.validSolutions?.[0] || PUZZLE_14_SOLUTION) : (currQ.initialSticks || PUZZLE_14_INITIAL)}
                      isInteractive={false}
                    />
                    {game.status === 'REVEAL' && (
                      <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold mt-2">
                        ✓ Correct Resulting Matchstick Configuration
                      </span>
                    )}
                  </div>
                )}

                {currQ.type === 'boolean' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {currQ.options.map((opt, i) => {
                      let cardStyle = "bg-slate-900 border-slate-800 text-slate-300";
                      if (game.status === 'REVEAL') {
                        if (i === currQ.correctIndex) {
                          cardStyle = "bg-emerald-600/20 border-emerald-500 text-emerald-300 font-black scale-[1.02]";
                        } else {
                          cardStyle = "bg-slate-900/40 border-slate-900 text-slate-600";
                        }
                      }
                      return (
                        <div key={i} className={`p-4 rounded-xl border text-lg font-bold flex items-center justify-between transition-all ${cardStyle}`}>
                          <span>{opt}</span>
                          {game.status === 'REVEAL' && i === currQ.correctIndex && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {currQ.type === 'mcq' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {currQ.options.map((opt, i) => {
                      let cardStyle = "bg-slate-900 border-slate-800 text-slate-300";
                      if (game.status === 'REVEAL') {
                        if (i === currQ.correctIndex) {
                          cardStyle = "bg-emerald-600/20 border-emerald-500 text-emerald-300 font-black scale-[1.02]";
                        } else {
                          cardStyle = "bg-slate-900/40 border-slate-900 text-slate-600";
                        }
                      }
                      return (
                        <div key={i} className={`p-4 rounded-xl border text-lg font-bold flex items-center justify-between transition-all ${cardStyle}`}>
                          <span>{opt}</span>
                          {game.status === 'REVEAL' && i === currQ.correctIndex && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {game.status === 'REVEAL' && currQ.explanation && (
                  <div className="p-5 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 animate-fade-in text-left">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm uppercase tracking-wider mb-1">
                      <Info className="w-4 h-4 text-indigo-400" /> Explanation / Clue Breakdown:
                    </div>
                    <p className="text-slate-200 text-base leading-relaxed">{currQ.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {(game.status === 'LEADERBOARD' || game.status === 'FINAL') && (
              <div className="max-w-xl w-full my-auto space-y-6">
                <div className="text-center space-y-2">
                  <Trophy className="w-14 h-14 text-yellow-400 mx-auto" />
                  <h2 className="text-4xl font-black">{game.status === 'FINAL' ? "Final Podium" : "Current Standings"}</h2>
                  <p className="text-slate-400 text-sm">Sorted by total points scored</p>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {getLeaderboard().slice(0, 5).map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-400 text-black' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          {idx + 1}
                        </span>
                        <span className="font-bold text-lg">{entry.name}</span>
                      </div>
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