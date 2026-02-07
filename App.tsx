
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  Share2, 
  Trophy, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  QrCode, 
  X, 
  Copy, 
  Check, 
  Mail,
  Heart, 
  AlertTriangle,
  Info,
  Medal,
  CheckCircle2
} from 'lucide-react';
import { nanoid } from 'nanoid';
import QRCode from 'qrcode';
import { Event, Team, Round, Match, RoundStatus, MatchStatus, StandingRow } from './types';
import { generateSchedule } from './utils/scheduler';
import { computeStandings } from './utils/standings';
import { saveEvent, getEvent, setHostToken, getHostToken, getStoredEvents, generateEventShareUrl, deleteEvent } from './utils/persistence';
import { NagaiBackground } from './constants';

// --- Reusable UI Components ---

const Button: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  className?: string;
  disabled?: boolean;
}> = ({ onClick, children, variant = 'primary', className = '', disabled }) => {
  const baseClasses = "px-4 py-3 font-bold transition-all flex items-center justify-center gap-2 active:invert uppercase tracking-widest text-[10px] sharp-button shrink-0";
  const variants = {
    primary: "bg-white text-black border border-white",
    outline: "bg-transparent text-white border border-[#a5a5a5]",
    ghost: "bg-transparent text-white/50 border border-[#a5a5a5]/10",
    danger: "bg-transparent text-red-500 border border-red-500/30 hover:border-red-500"
  };
  
  return (
    <button onClick={onClick} className={`${baseClasses} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

const Modal: React.FC<{ title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }> = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 animate-in fade-in duration-200">
    <div className="border border-[#a5a5a5] w-full max-w-sm p-6 flex flex-col items-center text-center bg-black shadow-[0_0_50px_rgba(0,0,0,1)]">
      <div className="w-full flex justify-end mb-4">
        <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors"><X size={24} /></button>
      </div>
      <h2 className="text-lg font-black mb-1 italic tracking-widest uppercase">{title}</h2>
      {subtitle && <p className="text-white/40 text-[9px] mb-6 uppercase tracking-[0.2em]">{subtitle}</p>}
      {children}
    </div>
  </div>
);

const ConfirmResetModal: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => (
  <Modal title="RESTART EVENT?" subtitle="Destructive Protocol" onClose={onCancel}>
    <div className="bg-red-500/10 p-5 border border-red-500/30 mb-8">
      <AlertTriangle className="text-red-500 mx-auto mb-3" size={32} />
      <p className="text-[10px] text-white/90 leading-relaxed font-bold uppercase tracking-widest">
        This will permanently purge this event from the local node and return you to the home circuit.
      </p>
    </div>
    <div className="w-full space-y-3">
      <Button onClick={onConfirm} variant="danger" className="w-full py-4">
        CONFIRM RESET
      </Button>
      <Button onClick={onCancel} variant="outline" className="w-full py-4">
        BACK TO EVENT
      </Button>
    </div>
  </Modal>
);

const DonateModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Modal title="Support the growth of pickleball" subtitle="Select a donation method" onClose={onClose}>
    <div className="w-full space-y-3">
      <Button onClick={() => window.open('https://www.paypal.com/ncp/payment/2WK9TA2WDCJTU', '_blank')} variant="outline" className="w-full py-4 text-[11px]">
        PayPal
      </Button>
      <Button onClick={() => window.open('https://venmo.com/nate-khouli', '_blank')} variant="outline" className="w-full py-4 text-[11px]">
        Venmo
      </Button>
      <p className="text-[8px] text-[#a5a5a5] uppercase tracking-widest pt-4 leading-relaxed font-bold">
        Donations will buy pickleball equipment for lower income families.
      </p>
    </div>
  </Modal>
);

const QRModal: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
  const [qrData, setQrData] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { 
      width: 400, 
      margin: 1, 
      color: { dark: '#000000', light: '#ffffff' } 
    }).then(setQrData);
  }, [url]);

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal title="Share Node" subtitle="Real-time observer access" onClose={onClose}>
      <div className="bg-white p-2 mb-6">
        {qrData ? <img src={qrData} alt="QR Code" className="w-48 h-48" /> : <div className="w-48 h-48 bg-white/10" />}
      </div>
      <div className="w-full space-y-4">
        <button 
          onClick={copyLink}
          className="w-full flex items-center justify-between p-3 border border-[#a5a5a5] text-[9px] mono uppercase tracking-widest transition-colors hover:bg-white/5"
        >
          <span className="truncate mr-4 text-white/50 text-left">{url}</span>
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
        </button>
        <Button onClick={onClose} variant="primary" className="w-full">CLOSE</Button>
      </div>
    </Modal>
  );
};

// --- View Components ---

const LandingView: React.FC<{ onCreate: () => void; onResume: (id: string) => void }> = ({ onCreate, onResume }) => {
  const [showDonate, setShowDonate] = useState(false);
  const history = Object.values(getStoredEvents()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  
  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({ 
        title: 'Pickle Circuit', 
        text: 'Elite Pickleball Event Tracking Node.', 
        url: window.location.origin 
      });
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full px-6 py-12 text-center page-transition overflow-hidden justify-between">
      {showDonate && <DonateModal onClose={() => setShowDonate(false)} />}
      
      <div className="flex-1 flex flex-col justify-center gap-12">
        <div>
          <h1 className="text-[12vw] sm:text-[80px] font-black leading-none mb-4 italic tracking-tighter">PICKLE.<br/>CIRCUIT</h1>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.4em] max-w-xs mx-auto">Run Pickleball events for free.</p>
        </div>

        <div className="w-full max-w-xs mx-auto space-y-3">
          <Button onClick={onCreate} className="w-full py-4">Initialize Event</Button>
          <Button onClick={handleShareApp} variant="outline" className="w-full">Share App</Button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="w-full max-w-xs mx-auto text-left mb-8">
          <h2 className="text-white/20 font-black mb-4 uppercase tracking-[0.4em] text-[9px] border-b border-[#a5a5a5] pb-2">Active Nodes</h2>
          <div className="space-y-3 overflow-y-auto max-h-[20vh] no-scrollbar">
            {history.map(ev => (
              <button 
                key={ev.id} 
                onClick={() => onResume(ev.id)}
                className="w-full flex items-center justify-between group hover:pl-1 transition-all"
              >
                <div className="text-left">
                  <div className="font-black text-[12px] uppercase tracking-widest group-hover:text-white/60">{ev.name}</div>
                  <div className="text-[8px] text-white/30 font-bold tracking-widest uppercase">{ev.numberOfTeams} Teams</div>
                </div>
                <ChevronRight size={14} className="text-white/20" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="w-full flex flex-col items-center gap-4">
        <p className="text-[8px] text-[#a5a5a5] uppercase tracking-widest font-bold">
          Donations will buy pickleball equipment for lower income families
        </p>
        <div className="flex justify-center gap-8">
          <button onClick={() => window.location.href = 'mailto:nate@neo4ic.com'} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors">
            <Mail size={14} /> Contact
          </button>
          <button onClick={() => setShowDonate(true)} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors">
            <Heart size={14} /> Donate
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateView: React.FC<{ onCreated: (ev: Event) => void; onBack: () => void }> = ({ onCreated, onBack }) => {
  const [name, setName] = useState('PROTO-01');
  const [teams, setTeams] = useState(6);
  const [courts, setCourts] = useState(3);
  const [pts, setPts] = useState(11);

  const projection = useMemo(() => {
    const totalRounds = teams % 2 === 0 ? teams - 1 : teams;
    const matchesPerRound = Math.floor(teams / 2);
    const wavesPerRound = Math.ceil(matchesPerRound / courts);
    const byes = teams % 2 !== 0 ? 1 : 0;
    const totalMatches = (teams * (teams - 1)) / 2;
    
    return {
      totalRounds,
      matchesPerRound,
      wavesPerRound,
      byes,
      totalMatches
    };
  }, [teams, courts]);

  const handleCreate = () => {
    const hostToken = nanoid();
    const event: Event = {
      id: nanoid(10),
      name,
      createdAt: Date.now(),
      hostToken,
      hostPasscode: '0000',
      numberOfTeams: teams,
      numberOfCourts: courts,
      pointsPerGame: pts,
      winBy2: true,
      scoringType: 'TRADITIONAL',
      teams: [],
      rounds: []
    };
    setHostToken(event.id, hostToken);
    onCreated(event);
  };

  return (
    <div className="max-w-md mx-auto p-6 page-transition h-[100dvh] overflow-y-auto no-scrollbar">
      <header className="flex items-center gap-4 mb-8 mt-6">
        <button onClick={onBack} className="p-2 border border-[#a5a5a5] hover:bg-white/5 transition-colors"><ChevronLeft size={18} /></button>
        <h1 className="text-sm font-black uppercase tracking-widest italic">Create your game</h1>
      </header>

      <div className="space-y-8 pb-12">
        <div className="space-y-3">
          <label className="block text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Event Name:</label>
          <input 
            type="text" 
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-transparent border-b border-[#a5a5a5] py-2 outline-none font-black text-xl uppercase tracking-tighter"
          />
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="block text-[9px] font-black text-white/30 uppercase tracking-[0.4em] mb-3">Teams: {teams}</label>
            <input 
              type="range" min="4" max="24" value={teams} 
              onChange={e => setTeams(parseInt(e.target.value))}
              className="w-full accent-white" 
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-white/30 uppercase tracking-[0.4em] mb-3">Courts: {courts}</label>
            <input 
              type="range" min="1" max="12" value={courts} 
              onChange={e => setCourts(parseInt(e.target.value))}
              className="w-full accent-white" 
            />
          </div>
        </div>

        <div className="bg-white/5 border border-[#a5a5a5] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50 flex items-center gap-2">
              <span className="flex items-center gap-1"><Info size={10} /> Round Robin Sequence</span>
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            <div>
              <div className="text-[7px] font-black uppercase text-white/30 tracking-widest mb-1">Total Rounds</div>
              <div className="text-xl font-black italic">{projection.totalRounds}</div>
            </div>
            <div>
              <div className="text-[7px] font-black uppercase text-white/30 tracking-widest mb-1">Total Games</div>
              <div className="text-xl font-black italic">{projection.totalMatches}</div>
            </div>
            <div>
              <div className="text-[7px] font-black uppercase text-white/30 tracking-widest mb-1">Byes/Round</div>
              <div className="text-xl font-black italic">{projection.byes}</div>
            </div>
            <div>
              <div className="text-[7px] font-black uppercase text-white/30 tracking-widest mb-1">Waves/Round</div>
              <div className={`text-xl font-black italic ${projection.wavesPerRound > 1 ? 'text-orange-400' : 'text-white'}`}>
                {projection.wavesPerRound}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-black text-white/30 uppercase tracking-[0.4em] mb-4">Target Points</label>
          <div className="flex">
            {[11, 15, 21].map(v => (
              <button 
                key={v}
                onClick={() => setPts(v)}
                className={`flex-1 py-3 font-black transition-all border border-[#a5a5a5] ${pts === v ? 'bg-white text-black border-white' : 'bg-transparent text-white'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleCreate} className="w-full py-5 mt-4">
          Generate Schedule
        </Button>
      </div>
    </div>
  );
};

const TeamSetupView: React.FC<{ event: Event; onConfirm: (teams: Team[]) => void; onBack: () => void }> = ({ event, onConfirm, onBack }) => {
  const [teams, setTeams] = useState<Team[]>(
    Array.from({ length: event.numberOfTeams }, (_, i) => ({
      id: nanoid(),
      name: `TEAM ${i + 1}`,
      player1: '',
      player2: ''
    }))
  );

  const updateTeam = (idx: number, field: keyof Team, val: string) => {
    const next = [...teams];
    next[idx] = { ...next[idx], [field]: val };
    setTeams(next);
  };

  const isTeamReady = (team: Team) => team.player1.trim() !== '' && team.player2.trim() !== '';
  const readyCount = teams.filter(isTeamReady).length;
  const isAllReady = readyCount === event.numberOfTeams;
  const progressPercent = (readyCount / event.numberOfTeams) * 100;

  return (
    <div className="max-w-md mx-auto p-6 page-transition h-[100dvh] flex flex-col">
      <header className="mb-4 mt-6 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onBack} className="p-2 border border-[#a5a5a5] hover:bg-white/5 transition-colors"><ChevronLeft size={18} /></button>
          <div className="text-right">
            {!isAllReady ? (
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                {event.numberOfTeams - readyCount} TEAMS REQUIRED
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest text-green-500 flex items-center justify-end gap-2">
                ALL TEAMS READY <Check size={12} strokeWidth={3} />
              </span>
            )}
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">ADD PLAYER NAMES</h1>
        </div>
      </header>

      {/* Progress Bar Container */}
      <div className="w-full h-1.5 bg-white/10 mb-8 shrink-0 relative">
        <div 
          className="absolute top-0 left-0 h-full bg-[#adada3] transition-all duration-500 ease-in-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll space-y-8 mb-4 pr-3">
        {teams.map((team, i) => {
          const ready = isTeamReady(team);
          return (
            <div key={team.id} className="border-t border-[#a5a5a5] pt-6 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[9px] font-black tracking-[0.4em] transition-colors ${ready ? 'text-green-500' : 'text-white/30'}`}>
                  0{i + 1}
                </span>
                <span className={`text-right font-black text-xs uppercase tracking-widest transition-colors ${ready ? 'text-green-500' : 'text-[#adada3]'}`}>
                  {team.name}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <input 
                  type="text" placeholder="Player 1" 
                  value={team.player1}
                  onChange={e => updateTeam(i, 'player1', e.target.value)}
                  className="boxed-input"
                />
                <input 
                  type="text" placeholder="Player 2" 
                  value={team.player2}
                  onChange={e => updateTeam(i, 'player2', e.target.value)}
                  className="boxed-input"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-6 shrink-0 bg-black border-t border-[#a5a5a5] pb-safe">
        <Button onClick={() => onConfirm(teams)} className="w-full py-5" disabled={!isAllReady}>
          Begin Tournament
        </Button>
      </div>
    </div>
  );
};

// --- Specialized Rankings Table Component ---
const RankingsTable: React.FC<{ 
  standings: StandingRow[]; 
  teams: Team[]; 
  isFinalPlayoff?: boolean;
}> = ({ standings, teams, isFinalPlayoff }) => {
  return (
    <div className="border border-[#a5a5a5] overflow-x-auto no-scrollbar">
      <table className="w-full text-left table-fixed min-w-[340px]">
        <thead>
          <tr className="bg-white/5 text-white/30 text-[7px] font-black uppercase tracking-[0.2em] border-b border-[#a5a5a5]">
            <th className="w-[35px] px-2 py-3 text-center">RK</th>
            <th className="px-2 py-3">SQUAD</th>
            <th className="w-[50px] px-2 py-3 text-center">W-L</th>
            <th className="w-[45px] px-2 py-3 text-center">PTS</th>
            <th className="w-[50px] px-2 py-3 text-center">+/-</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#a5a5a5]/30">
          {standings.map((row, idx) => {
            const team = teams.find(t => t.id === row.teamId);
            let textColorClass = 'text-[#adada3]';
            
            if (isFinalPlayoff) {
              if (idx === 0) textColorClass = 'text-yellow-500'; // Gold
              else if (idx === 1) textColorClass = 'text-slate-400'; // Silver
              else if (idx === 2) textColorClass = 'text-amber-700'; // Bronze
            }

            return (
              <tr key={row.teamId} className="hover:bg-white/[0.02] transition-colors">
                <td className={`px-2 py-5 font-black text-[10px] text-center italic ${isFinalPlayoff ? textColorClass : ''}`}>#{row.rank}</td>
                <td className="px-2 py-5 truncate">
                  <div className={`font-bold text-[9px] uppercase tracking-widest leading-tight truncate ${textColorClass}`}>
                    {team?.player1} & {team?.player2}
                  </div>
                  <div className="text-[7px] opacity-30 font-black uppercase mt-0.5">{team?.name}</div>
                </td>
                <td className={`px-2 py-5 text-center font-bold text-[10px] tabular-nums whitespace-nowrap ${isFinalPlayoff ? textColorClass : ''}`}>
                  {row.wins}-{row.losses}
                </td>
                <td className={`px-2 py-5 text-center font-black text-[10px] tabular-nums ${isFinalPlayoff ? textColorClass : ''}`}>
                  {row.pointsFor}
                </td>
                <td className={`px-2 py-5 text-center font-black text-[10px] tabular-nums ${row.diff > 0 ? 'text-green-500' : row.diff < 0 ? 'text-red-500' : ''} ${isFinalPlayoff && idx < 3 ? '' : ''}`}>
                  {row.diff > 0 ? `+${row.diff}` : row.diff}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const Dashboard: React.FC<{ 
  event: Event; 
  onUpdate: (ev: Event) => void;
  isHost: boolean;
  onResetEventTrigger: () => void;
  onGoHome: () => void;
}> = ({ event, onUpdate, isHost, onResetEventTrigger, onGoHome }) => {
  const [activeRoundIdx, setActiveRoundIdx] = useState(0);
  const [showStandings, setShowStandings] = useState(false);
  const [standingsTab, setStandingsTab] = useState<'RR' | 'PLAYOFFS'>('RR');
  const [showQR, setShowQR] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const roundScrollRef = useRef<HTMLDivElement>(null);

  // Rankings specifically for Round Robin only
  const rrStandings = useMemo(() => {
    const rrOnly = { ...event, playoffRounds: [] };
    return computeStandings(rrOnly);
  }, [event]);

  // Rankings specifically for Playoff stats
  const playoffStandings = useMemo(() => {
    if (!event.playoffRounds || event.playoffRounds.length === 0) return [];
    
    // Create a virtual event with just playoff rounds
    const pOnly = { ...event, rounds: event.playoffRounds || [] };
    const allStats = computeStandings(pOnly);
    
    // Filter to only include the top 4 teams that qualified for playoffs
    const playoffTeamIds = new Set(event.playoffRounds.flatMap(r => r.matches.flatMap(m => [m.teamAId, m.teamBId])));
    return allStats.filter(s => playoffTeamIds.has(s.teamId));
  }, [event]);

  const allRounds = useMemo(() => {
    return [...event.rounds, ...(event.playoffRounds || [])];
  }, [event.rounds, event.playoffRounds]);

  const currentRound = allRounds[activeRoundIdx];
  const isPlayoffRound = activeRoundIdx >= event.rounds.length;

  // Identify Bye Teams for current round
  const roundTeamIds = new Set(currentRound?.matches.flatMap(m => [m.teamAId, m.teamBId]));
  const byeTeams = event.teams.filter(t => !roundTeamIds.has(t.id));

  // Count pending team scores (matches not marked COMPLETE)
  const pendingScoresCount = currentRound?.matches.filter(m => m.status !== MatchStatus.COMPLETE).length || 0;

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (roundScrollRef.current) {
      const activeButton = roundScrollRef.current.children[activeRoundIdx] as HTMLElement;
      if (activeButton) {
        roundScrollRef.current.scrollTo({
          left: activeButton.offsetLeft - (roundScrollRef.current.offsetWidth / 2) + (activeButton.offsetWidth / 2),
          behavior: 'smooth'
        });
      }
    }
  }, [activeRoundIdx]);

  const getTimerDisplay = (round: Round) => {
    if (!round) return "00:00";
    let seconds = round.elapsedSeconds;
    if (round.status === RoundStatus.IN_PROGRESS && round.startTimestamp) {
      seconds += Math.floor((currentTime - round.startTimestamp) / 1000);
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRound = () => {
    if (!isHost) return;
    const nextEvent = { ...event };
    if (isPlayoffRound) {
      const pIdx = activeRoundIdx - event.rounds.length;
      const nextPlayoffs = [...(event.playoffRounds || [])];
      nextPlayoffs[pIdx] = { ...nextPlayoffs[pIdx], status: RoundStatus.IN_PROGRESS, startTimestamp: Date.now() };
      nextEvent.playoffRounds = nextPlayoffs;
    } else {
      const nextRounds = [...event.rounds];
      nextRounds[activeRoundIdx] = { ...nextRounds[activeRoundIdx], status: RoundStatus.IN_PROGRESS, startTimestamp: Date.now() };
      nextEvent.rounds = nextRounds;
    }
    onUpdate(nextEvent);
  };

  const handlePauseRound = () => {
    if (!isHost) return;
    const round = currentRound;
    const elapsedSinceStart = round.startTimestamp ? Math.floor((Date.now() - round.startTimestamp) / 1000) : 0;
    const nextEvent = { ...event };
    
    if (isPlayoffRound) {
      const pIdx = activeRoundIdx - event.rounds.length;
      const nextPlayoffs = [...(event.playoffRounds || [])];
      nextPlayoffs[pIdx] = { 
        ...nextPlayoffs[pIdx], 
        status: RoundStatus.STOPPED, 
        elapsedSeconds: round.elapsedSeconds + elapsedSinceStart,
        startTimestamp: undefined 
      };
      nextEvent.playoffRounds = nextPlayoffs;
    } else {
      const nextRounds = [...event.rounds];
      nextRounds[activeRoundIdx] = { 
        ...nextRounds[activeRoundIdx], 
        status: RoundStatus.STOPPED, 
        elapsedSeconds: round.elapsedSeconds + elapsedSinceStart,
        startTimestamp: undefined 
      };
      nextEvent.rounds = nextRounds;
    }
    onUpdate(nextEvent);
  };

  const handleResetRoundTimer = () => {
    if (!isHost) return;
    if (!confirm('RESET CLOCK? This returns the timer to 00:00 and stops it.')) return;
    
    const nextEvent = { ...event };
    const resetTimerData = (r: Round): Round => ({
      ...r,
      status: RoundStatus.NOT_STARTED,
      elapsedSeconds: 0,
      startTimestamp: undefined,
    });

    if (isPlayoffRound) {
      const pIdx = activeRoundIdx - event.rounds.length;
      const nextPlayoffs = [...(event.playoffRounds || [])];
      nextPlayoffs[pIdx] = resetTimerData(nextPlayoffs[pIdx]);
      nextEvent.playoffRounds = nextPlayoffs;
    } else {
      const nextRounds = [...event.rounds];
      nextRounds[activeRoundIdx] = resetTimerData(nextRounds[activeRoundIdx]);
      nextEvent.rounds = nextRounds;
    }
    onUpdate(nextEvent);
  };

  const handleWinnerSelect = (matchId: string, teamId: string) => {
    if (!isHost || currentRound.status === RoundStatus.SUBMITTED) return;
    const nextEvent = { ...event };
    const updateMatches = (matches: Match[]) => matches.map(m => m.id === matchId ? { ...m, winnerId: teamId } : m);

    if (isPlayoffRound) {
      const pIdx = activeRoundIdx - event.rounds.length;
      const nextPlayoffs = [...(event.playoffRounds || [])];
      nextPlayoffs[pIdx].matches = updateMatches(nextPlayoffs[pIdx].matches);
      nextEvent.playoffRounds = nextPlayoffs;
    } else {
      const nextRounds = [...event.rounds];
      nextRounds[activeRoundIdx].matches = updateMatches(nextRounds[activeRoundIdx].matches);
      nextEvent.rounds = nextRounds;
    }
    onUpdate(nextEvent);
  };

  const handleScoreChange = (matchId: string, team: 'A' | 'B', val: string) => {
    if (!isHost) return;
    const cleanVal = val.replace(/[^0-9]/g, '').slice(0, 2);
    const score = cleanVal === '' ? null : parseInt(cleanVal);
    
    const nextEvent = { ...event };
    const updateMatches = (matches: Match[]) => matches.map(m => {
        if (m.id !== matchId) return m;
        if (!m.winnerId) return m;
        const updated = { ...m };
        if (team === 'A') updated.scoreA = score;
        else updated.scoreB = score;
        updated.status = (updated.scoreA !== null && updated.scoreB !== null) ? MatchStatus.COMPLETE : MatchStatus.PENDING;
        updated.lastEditedAt = Date.now();
        return updated;
    });

    if (isPlayoffRound) {
      const pIdx = activeRoundIdx - event.rounds.length;
      const nextPlayoffs = [...(event.playoffRounds || [])];
      nextPlayoffs[pIdx].matches = updateMatches(nextPlayoffs[pIdx].matches);
      nextEvent.playoffRounds = nextPlayoffs;
    } else {
      const nextRounds = [...event.rounds];
      nextRounds[activeRoundIdx].matches = updateMatches(nextRounds[activeRoundIdx].matches);
      nextEvent.rounds = nextRounds;
    }
    onUpdate(nextEvent);
  };

  const handleSubmitScores = () => {
    if (!isHost) return;
    const nextEvent = { ...event };
    
    if (isPlayoffRound) {
      const pIdx = activeRoundIdx - event.rounds.length;
      const nextPlayoffs = [...(event.playoffRounds || [])];
      const currentPRound = nextPlayoffs[pIdx];
      currentPRound.status = RoundStatus.SUBMITTED;

      // Logic for SF -> Finals/Bronze
      if (currentPRound.roundNumber === 'SF') {
        const m1 = currentPRound.matches[0];
        const m2 = currentPRound.matches[1];

        const w1 = m1.winnerId;
        const l1 = m1.winnerId === m1.teamAId ? m1.teamBId : m1.teamAId;
        const w2 = m2.winnerId;
        const l2 = m2.winnerId === m2.teamAId ? m2.teamBId : m2.teamAId;

        if (w1 && w2) {
          nextPlayoffs.push({
            id: 'round-finals',
            roundNumber: 'FINALS',
            status: RoundStatus.NOT_STARTED,
            elapsedSeconds: 0,
            matches: [
              { id: 'match-f-gold', courtNumber: 1, teamAId: w1, teamBId: w2, scoreA: null, scoreB: null, status: MatchStatus.PENDING, isPlayoff: true },
              { id: 'match-f-bronze', courtNumber: 2, teamAId: l1, teamBId: l2, scoreA: null, scoreB: null, status: MatchStatus.PENDING, isPlayoff: true }
            ]
          });
        }
      }
      nextEvent.playoffRounds = nextPlayoffs;
    } else {
      const nextRounds = [...event.rounds];
      nextRounds[activeRoundIdx].status = RoundStatus.SUBMITTED;
      nextEvent.rounds = nextRounds;
    }
    
    onUpdate(nextEvent);
    // If we just generated a new round, move to it
    if (isPlayoffRound && nextEvent.playoffRounds && nextEvent.playoffRounds.length > (event.playoffRounds?.length || 0)) {
       setActiveRoundIdx(allRounds.length);
    }
  };

  const handleInitializePlayoffs = () => {
    if (!isHost) return;
    const top4 = rrStandings.slice(0, 4);
    if (top4.length < 4) return;

    const playoffRounds: Round[] = [{
      id: 'round-sf',
      roundNumber: 'SF',
      status: RoundStatus.NOT_STARTED,
      elapsedSeconds: 0,
      matches: [
        { id: 'match-sf-1', courtNumber: 1, teamAId: top4[0].teamId, teamBId: top4[3].teamId, scoreA: null, scoreB: null, status: MatchStatus.PENDING, isPlayoff: true },
        { id: 'match-sf-2', courtNumber: 2, teamAId: top4[1].teamId, teamBId: top4[2].teamId, scoreA: null, scoreB: null, status: MatchStatus.PENDING, isPlayoff: true }
      ]
    }];
    
    onUpdate({ ...event, playoffRounds });
    setActiveRoundIdx(event.rounds.length);
  };

  const allRRSubmitted = event.rounds.every(r => r.status === RoundStatus.SUBMITTED);
  const isTourneyFinished = useMemo(() => {
    return event.playoffRounds?.some(r => r.roundNumber === 'FINALS' && r.status === RoundStatus.SUBMITTED);
  }, [event.playoffRounds]);

  const getOriginalSeed = (teamId: string) => {
    const found = rrStandings.find(s => s.teamId === teamId);
    return found ? found.rank : '?';
  };

  if (showStandings) {
    return (
      <div className="max-w-md mx-auto p-6 min-h-[100dvh] flex flex-col bg-black overflow-hidden">
        <header className="flex items-center justify-between mb-8 mt-4 shrink-0">
          <h1 className="text-2xl font-black italic tracking-tighter uppercase">RANKINGS</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowStandings(false)} className="p-2 border border-[#a5a5a5] active:bg-white active:text-black transition-all"><X size={20} /></button>
          </div>
        </header>

        <div className="flex border border-[#a5a5a5] mb-8 shrink-0">
          <button onClick={() => setStandingsTab('RR')} className={`flex-1 py-3 text-[9px] font-black tracking-widest uppercase ${standingsTab === 'RR' ? 'bg-white text-black' : 'text-white/40'}`}>ROUND ROBIN</button>
          <button onClick={() => setStandingsTab('PLAYOFFS')} className={`flex-1 py-3 text-[9px] font-black tracking-widest uppercase ${standingsTab === 'PLAYOFFS' ? 'bg-white text-black' : 'text-white/40'}`}>PLAYOFFS</button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-12">
          {standingsTab === 'RR' ? (
            <div className="space-y-4">
              <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] pl-1">Round Robin Leaderboard</h3>
              <RankingsTable standings={rrStandings} teams={event.teams} />
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {playoffStandings.length > 0 ? (
                <div className="space-y-4">
                   <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] pl-1">Playoff Standings</h3>
                   <RankingsTable 
                    standings={playoffStandings} 
                    teams={event.teams} 
                    isFinalPlayoff={isTourneyFinished}
                   />
                </div>
              ) : (
                <div className="text-center p-12 text-white/20 text-[9px] uppercase tracking-widest border border-dashed border-white/10">Playoffs not yet initialized</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden page-transition bg-black">
      {showQR && <QRModal url={generateEventShareUrl(event)} onClose={() => setShowQR(false)} />}
      
      <header className="px-6 py-3 border-b border-[#a5a5a5] flex items-center justify-between bg-black z-[100] shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onGoHome} className="p-2 border border-[#a5a5a5] active:bg-white active:text-black"><ChevronLeft size={16} /></button>
          <div className="flex flex-col"><h1 className="text-[10px] font-black italic tracking-tighter uppercase">{event.name}</h1></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowQR(true)} className="p-2 border border-[#a5a5a5] active:bg-white active:text-black"><QrCode size={12} /></button>
          <button onClick={() => setShowStandings(true)} className="p-2 border border-[#a5a5a5] active:bg-white active:text-black"><Trophy size={12} /></button>
          <button onClick={onResetEventTrigger} className="px-3 py-1.5 border border-red-500 text-red-500 text-[8px] font-black uppercase tracking-widest">RESET</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32 no-scrollbar">
        <div className="px-2 mb-6">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[7px] font-black text-white/20 uppercase">Chronometer</div>
          </div>
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-4">
                <div className="text-4xl font-black italic tracking-tighter tabular-nums">{getTimerDisplay(currentRound)}</div>
                <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest border border-orange-400/20 px-2 py-1 bg-orange-400/5">
                  Pending: {pendingScoresCount}
                </div>
             </div>
             {isHost && (
              <div className="flex gap-1.5">
                <button 
                  onClick={currentRound?.status === RoundStatus.IN_PROGRESS ? handlePauseRound : handleStartRound} 
                  className="p-3 border border-[#a5a5a5] flex items-center justify-center min-w-[44px]"
                >
                  {currentRound?.status === RoundStatus.IN_PROGRESS ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
                </button>
                <button 
                  onClick={handleResetRoundTimer} 
                  className="p-3 border border-[#a5a5a5] flex items-center justify-center min-w-[44px]"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
             )}
          </div>
        </div>

        {allRRSubmitted && !event.playoffRounds && isHost && (
          <div className="px-2 mb-12"><Button onClick={handleInitializePlayoffs} className="w-full py-6 bg-yellow-500 text-black border-yellow-500">Generate Playoff Bracket</Button></div>
        )}

        <div className="space-y-4">
          <div className="px-2 pb-2">
            <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">{currentRound?.roundNumber === 'SF' ? 'Semi-Final Brackets' : currentRound?.roundNumber === 'FINALS' ? 'Championship Round' : `Round ${currentRound?.roundNumber}`}</h2>
          </div>
          {currentRound?.matches.map(match => {
            const teamA = event.teams.find(t => t.id === match.teamAId);
            const teamB = event.teams.find(t => t.id === match.teamBId);
            const isWinnerA = match.winnerId === match.teamAId;
            const isWinnerB = match.winnerId === match.teamBId;
            const seedA = match.isPlayoff ? getOriginalSeed(match.teamAId) : null;
            const seedB = match.isPlayoff ? getOriginalSeed(match.teamBId) : null;
            
            const matchLabel = match.id.includes('gold') ? 'GOLD MATCH' : match.id.includes('bronze') ? 'BRONZE MATCH' : `COURT ${match.courtNumber}`;

            return (
              <div key={match.id} className="page-transition border-b border-[#a5a5a5]/20 pb-4">
                <header className="flex items-center gap-2 mb-2 px-1">
                  <span className={`text-[8px] font-black uppercase tracking-widest ${match.id.includes('gold') ? 'text-yellow-500' : 'text-orange-400'}`}>
                    {matchLabel}
                  </span>
                  <div className="h-[1px] flex-1 bg-white/10" />
                </header>
                
                <div className="flex flex-col gap-0 relative">
                  {/* Team A Row */}
                  <div className={`flex items-center justify-between p-3 transition-all duration-300 ${isWinnerA ? 'bg-green-500/10' : ''}`}>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isWinnerA ? 'text-green-500' : 'text-[#adada3]'}`}>
                          {teamA?.player1}
                        </div>
                        {seedA !== null && (
                          <span className="bg-white/5 border border-white/10 px-1 text-[7px] font-black text-white/40">S{seedA}</span>
                        )}
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isWinnerA ? 'text-green-500' : 'text-[#adada3]'}`}>
                        {teamA?.player2}
                      </div>
                      <div className="text-[7px] text-[#adada3]/30 font-black tracking-[0.3em] uppercase mt-1">{teamA?.name}</div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {isHost && currentRound.status !== RoundStatus.SUBMITTED && (
                        <button 
                          onClick={() => handleWinnerSelect(match.id, match.teamAId)}
                          className={`p-2 border transition-colors ${isWinnerA ? 'bg-green-500 border-green-500 text-black' : 'border-[#a5a5a5]/20 text-white/10'}`}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <input 
                        type="text" inputMode="numeric" placeholder="-"
                        value={match.scoreA ?? ''} 
                        onChange={e => handleScoreChange(match.id, 'A', e.target.value)} 
                        disabled={!isHost || currentRound.status === RoundStatus.SUBMITTED || !match.winnerId} 
                        className={`score-input ${isWinnerA ? 'border-green-500 text-green-500' : 'opacity-40'}`} 
                      />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative h-[1px] w-full bg-[#a5a5a5]/30">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black border border-[#a5a5a5]/30 rounded-full px-1.5 py-0.5 text-[6px] font-black italic text-[#a5a5a5] uppercase">VS</div>
                  </div>

                  {/* Team B Row */}
                  <div className={`flex items-center justify-between p-3 transition-all duration-300 ${isWinnerB ? 'bg-green-500/10' : ''}`}>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isWinnerB ? 'text-green-500' : 'text-[#adada3]'}`}>
                          {teamB?.player1}
                        </div>
                        {seedB !== null && (
                          <span className="bg-white/5 border border-white/10 px-1 text-[7px] font-black text-white/40">S{seedB}</span>
                        )}
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isWinnerB ? 'text-green-500' : 'text-[#adada3]'}`}>
                        {teamB?.player2}
                      </div>
                      <div className="text-[7px] text-[#adada3]/30 font-black tracking-[0.3em] uppercase mt-1">{teamB?.name}</div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {isHost && currentRound.status !== RoundStatus.SUBMITTED && (
                        <button 
                          onClick={() => handleWinnerSelect(match.id, match.teamBId)}
                          className={`p-2 border transition-colors ${isWinnerB ? 'bg-green-500 border-green-500 text-black' : 'border-[#a5a5a5]/20 text-white/10'}`}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <input 
                        type="text" inputMode="numeric" placeholder="-"
                        value={match.scoreB ?? ''} 
                        onChange={e => handleScoreChange(match.id, 'B', e.target.value)} 
                        disabled={!isHost || currentRound.status === RoundStatus.SUBMITTED || !match.winnerId} 
                        className={`score-input ${isWinnerB ? 'border-green-500 text-green-500' : 'opacity-40'}`} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* BYE Section */}
          {byeTeams.length > 0 && (
            <div className="mt-8 page-transition">
              <header className="flex items-center gap-2 mb-3 px-1">
                <span className="text-[8px] font-black text-[#a5a5a5] uppercase tracking-[0.3em]">BYE</span>
                <div className="h-[1px] flex-1 bg-[#a5a5a5]/20" />
              </header>
              <div className="bg-[#a5a5a5]/5 p-4 space-y-2">
                {byeTeams.map(t => (
                  <div key={t.id} className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[#adada3]/50">
                    <span>{t.player1} & {t.player2}</span>
                    <span className="text-[7px] font-black opacity-30">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-black border-t border-[#a5a5a5] z-[200] pb-safe shrink-0">
        {isHost && currentRound?.status !== RoundStatus.SUBMITTED && (
           <button onClick={handleSubmitScores} disabled={currentRound?.status === RoundStatus.IN_PROGRESS} className="w-full py-5 text-[9px] font-black uppercase tracking-[0.4em] bg-white text-black active:invert disabled:opacity-50">Submit Scores</button>
        )}
        <div ref={roundScrollRef} className="px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory bg-black">
          {allRounds.map((r, idx) => (
            <button key={r.id} onClick={() => setActiveRoundIdx(idx)} className={`flex-shrink-0 w-12 h-12 flex items-center justify-center transition-all border border-[#a5a5a5] snap-center relative ${activeRoundIdx === idx ? 'bg-white text-black border-white' : (idx >= event.rounds.length ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-transparent text-white/30 border-[#a5a5a5]/20')}`}>
              <span className="text-[11px] font-black italic tabular-nums">{r.roundNumber}</span>
              {r.status === RoundStatus.SUBMITTED && <div className="absolute top-0 right-0 bg-white text-black p-0.5"><Check size={6} strokeWidth={5} /></div>}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<'LANDING' | 'CREATE' | 'TEAM_SETUP' | 'DASHBOARD'>('LANDING');
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/event/')) {
        const id = hash.replace('#/event/', '');
        const ev = getEvent(id);
        if (ev) {
          setActiveEvent(ev);
          setView('DASHBOARD');
        } else {
           window.location.hash = '';
           setView('LANDING');
        }
      } else {
        setView('LANDING');
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleEventUpdate = (updated: Event) => {
    setActiveEvent(updated);
    saveEvent(updated);
  };

  const handleResetEverything = () => {
    if (activeEvent) deleteEvent(activeEvent.id);
    window.location.hash = '';
    setActiveEvent(null);
    setView('LANDING');
    setShowResetConfirm(false);
  };

  const isHost = activeEvent ? getHostToken(activeEvent.id) === activeEvent.hostToken : false;

  return (
    <div className="min-h-screen relative text-white selection:bg-white selection:text-black bg-black overflow-hidden">
      <NagaiBackground />
      <div className="relative z-10 h-full">
        {showResetConfirm && <ConfirmResetModal onConfirm={handleResetEverything} onCancel={() => setShowResetConfirm(false)} />}
        {view === 'LANDING' && <LandingView onCreate={() => setView('CREATE')} onResume={(id) => window.location.hash = `#/event/${id}`} />}
        {view === 'CREATE' && <CreateView onCreated={(ev) => { setActiveEvent(ev); setView('TEAM_SETUP'); }} onBack={() => setView('LANDING')} />}
        {view === 'TEAM_SETUP' && activeEvent && <TeamSetupView event={activeEvent} onConfirm={(teams) => { const rounds = generateSchedule(teams, activeEvent.numberOfCourts); const updated = { ...activeEvent, teams, rounds }; setActiveEvent(updated); saveEvent(updated); window.location.hash = `#/event/${updated.id}`; setView('DASHBOARD'); }} onBack={() => setView('CREATE')} />}
        {view === 'DASHBOARD' && activeEvent && <Dashboard event={activeEvent} onUpdate={handleEventUpdate} isHost={isHost} onResetEventTrigger={() => setShowResetConfirm(true)} onGoHome={() => { window.location.hash = ''; setActiveEvent(null); setView('LANDING'); }} />}
      </div>
    </div>
  );
}
