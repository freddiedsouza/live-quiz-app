import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, set, update, onValue, get } from 'firebase/database';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { 
  Users, Trophy, Clock, CheckCircle2, Play, 
  ChevronRight, RefreshCw, Smartphone, Monitor, ShieldCheck, Sparkles, Plus, 
  Trash2, Edit3, Layers, Check, X, Info
} from 'lucide-react';

const INITIAL_QUESTIONS = [
  {
    id: "q_1",
    type: "mcq",
    question: "Which planet in our solar system has the most moons?",
    options: ["Jupiter", "Saturn", "Uranus", "Neptune"],
    correctIndex: 1,
    timeLimit: 20,
    explanation: "Saturn has 146 confirmed moons, overtaking Jupiter's 95 moons."
  },
  {
    id: "q_2",
    type: "boolean",
    question: "Sound travels faster in water than in air.",
    options: ["True", "False"],
    correctIndex: 0,
    timeLimit: 15,
    explanation: "True! Water particles are packed much more densely than air molecules, allowing sound vibrations to transmit roughly 4.3 times faster."
  },
  {
    id: "q_3",
    type: "diagram",
    question: "Spot the hidden Queen Bee in the honeycomb pattern! (Tap on the image)",
    imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80",
    target: { xMin: 40, xMax: 60, yMin: 40, yMax: 60 },
    options: ["Visual Target"],
    correctIndex: 0,
    timeLimit: 30,
    explanation: "The Queen Bee is situated right in the center with a longer thorax and distinct amber abdomen."
  },
  {
    id: "q_4",
    type: "mcq",
    question: "Matchstick Puzzle: Move 1 stick to fix 6 + 4 = 4. What is the correct equation?",
    options: ["0 + 4 = 4", "5 + 4 = 9", "8 - 4 = 4", "6 - 4 = 2"],
    correctIndex: 0,
    timeLimit: 25,
    explanation: "By taking the middle vertical stick from '6', it transforms into a '0', making 0 + 4 = 4 valid."
  }
];

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
  const [qType, setQType] = useState("boolean");
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState(["True", "False"]);
  const [qCorrectIndex, setQCorrectIndex] = useState(0);
  const [qTimeLimit, setQTimeLimit] = useState(20);
  const [qImageUrl, setQImageUrl] = useState("");
  const [qTargetCoords, setQTargetCoords] = useState("30,30,70,70");
  const [qExplanation, setQExplanation] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Room / Game state
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
  const [tapCoords, setTapCoords] = useState(null);

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
    setTapCoords(null);
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
              timeRemaining: 20,
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

  // Question Form Management
  const resetForm = () => {
    setEditingQId(null);
    setQType("boolean");
    setQText("");
    setQOptions(["True", "False"]);
    setQCorrectIndex(0);
    setQTimeLimit(20);
    setQImageUrl("");
    setQTargetCoords("30,30,70,70");
    setQExplanation("");
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
    }
  };

  const handleSaveQuestion = (e) => {
    e.preventDefault();
    if (!qText.trim()) {
      setStatusMessage("Error: Question prompt cannot be empty.");
      return;
    }

    let finalOptions = qOptions;
    if (qType === 'boolean') {
      finalOptions = ["True", "False"];
    } else if (qType === 'diagram') {
      finalOptions = ["Target Spot on Image"];
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
      target: parsedTarget
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

  // Participant actions
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

  const submitAnswer = (optionIdx, coords = null) => {
    if (selectedAnswer !== null || game.status !== 'QUESTION') return;
    const participantId = playerName.trim().toLowerCase().replace(/\s+/g, '_');
    const currQ = questions[game.currentIndex];
    
    let isCorrect = false;
    if (currQ.type === 'diagram' && coords && currQ.target) {
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
            <p className="text-slate-400 mt-2">Real-time mobile trivia, puzzles & visual challenges</p>
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

  // View: Participant Portal (Mobile phone)
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
            <div className="flex items-center justify-between py-2 border-b border-slate-800 mb-4">
              <span className="text-xs font-semibold text-slate-400">Q {game.currentIndex + 1} of {questions.length}</span>
              <div className={`px-3 py-1 rounded-full font-bold text-sm ${game.timeRemaining <= 5 ? 'bg-red-500/20 text-red-400 animate-bounce' : 'bg-slate-800 text-slate-200'}`}>
                ⏱ {game.timeRemaining}s
              </div>
            </div>

            <h3 className="text-lg font-bold mb-4 leading-snug">{currQ.question}</h3>

            {currQ.type === 'diagram' && currQ.imageUrl && (
              <div className="relative mb-4 rounded-xl overflow-hidden border border-slate-800">
                <img
                  src={currQ.imageUrl}
                  alt="Find the target"
                  onClick={(e) => {
                    if (selectedAnswer !== null || game.status !== 'QUESTION') return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    submitAnswer(999, { x, y });
                  }}
                  className="w-full h-auto cursor-crosshair select-none"
                />
                {tapCoords && (
                  <div 
                    className="absolute w-6 h-6 border-2 border-indigo-400 bg-indigo-500/40 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-ping"
                    style={{ left: `${tapCoords.x}%`, top: `${tapCoords.y}%` }}
                  />
                )}
              </div>
            )}

            {/* Answer Options Buttons */}
            {currQ.type !== 'diagram' && (
              <div className={`grid gap-3 my-auto ${currQ.type === 'boolean' ? 'grid-cols-2 mt-4' : 'grid-cols-1'}`}>
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

          {/* Reveal & Reason box on Mobile */}
          <div>
            {game.status === 'REVEAL' && currQ.explanation && (
              <div className="mt-4 p-4 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 animate-fade-in text-left">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider mb-1">
                  <Info className="w-4 h-4 text-indigo-400" /> Explanation / Reason:
                </div>
                <p className="text-slate-200 text-sm leading-relaxed">{currQ.explanation}</p>
              </div>
            )}

            {selectedAnswer !== null && game.status === 'QUESTION' && (
              <p className="text-center text-sm text-emerald-400 mt-4 animate-fade-in">
                ✓ Answer submitted! Waiting for time to expire...
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

  // View: Admin Dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
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

      {/* QUESTION BANK BUILDER */}
      {adminTab === "builder" && (
        <div className="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Creator Form */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
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
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'boolean', label: 'True / False' },
                    { id: 'mcq', label: 'Multiple Choice' },
                    { id: 'diagram', label: 'Spot On Diagram' }
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
                  placeholder={qType === 'boolean' ? "e.g. Lightning never strikes the same place twice." : "Enter your question here..."}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              {/* Boolean True / False Selection */}
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

              {/* Explanation / Reason field */}
              <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl space-y-1">
                <label className="block text-indigo-300 font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Reason / Explanation for Participants:
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain why it is True or False (shown to participants when answer is revealed)"
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                />
              </div>

              {/* MCQ Options */}
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

              {/* Diagram Target Box */}
              {qType === 'diagram' && (
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-1">
                  <label className="block text-indigo-300 font-semibold">Target Box (xMin, yMin, xMax, yMax in %)</label>
                  <input
                    type="text"
                    value={qTargetCoords}
                    onChange={(e) => setQTargetCoords(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
              )}

              {/* Optional Image */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={qImageUrl}
                  onChange={(e) => setQImageUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none"
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

          {/* Question List */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Quiz Bank Questions ({questions.length})</h2>
              <span className="text-xs text-slate-500">Live synced with participants</span>
            </div>

            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-2">
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
                        <span className="line-clamp-2"><b className="text-slate-300">Reason:</b> {q.explanation}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LIVE PROJECTOR & GAME VIEW */}
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
                    Reveal Correct Answer
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

          {/* Projector Screen */}
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
              <div className="max-w-3xl w-full my-auto space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <span className="text-lg font-bold text-indigo-400">Question {game.currentIndex + 1} of {questions.length}</span>
                  <div className="flex items-center gap-2 text-3xl font-black text-amber-400">
                    <Clock className="w-8 h-8" /> {game.timeRemaining}s
                  </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold leading-snug">{currQ.question}</h2>

                {currQ.type === 'diagram' && currQ.imageUrl && (
                  <div className="max-h-80 overflow-hidden rounded-2xl border border-slate-800 flex justify-center bg-black">
                    <img src={currQ.imageUrl} alt="Diagram" className="max-h-80 object-contain" />
                  </div>
                )}

                <div className={`grid gap-3 pt-2 ${currQ.type === 'boolean' ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
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

                {/* Explanation Card on Reveal (Projector) */}
                {game.status === 'REVEAL' && currQ.explanation && (
                  <div className="p-5 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 animate-fade-in text-left">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm uppercase tracking-wider mb-1">
                      <Info className="w-4 h-4 text-indigo-400" /> Explanation / Reason:
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