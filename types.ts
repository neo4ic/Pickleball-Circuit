
export type ScoringType = 'TRADITIONAL' | 'POINTS_FOR' | 'WIN_DIFF';

export interface Player {
  name: string;
}

export interface Team {
  id: string;
  name: string;
  player1: string;
  player2: string;
}

export enum MatchStatus {
  PENDING = 'pending',
  COMPLETE = 'complete'
}

export interface Match {
  id: string;
  courtNumber: number;
  waveNumber?: number;
  teamAId: string;
  teamBId: string; // "BYE" if odd teams
  scoreA: number | null;
  scoreB: number | null;
  status: MatchStatus;
  winnerId?: string;
  submittedAt?: number;
  lastEditedAt?: number;
  isPlayoff?: boolean;
}

export enum RoundStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  STOPPED = 'stopped',
  SUBMITTED = 'submitted'
}

export interface Round {
  id: string;
  roundNumber: number | string; // e.g., 1, 2 or "Semi-Final"
  status: RoundStatus;
  startTimestamp?: number;
  elapsedSeconds: number;
  matches: Match[];
}

export interface Event {
  id: string;
  name: string;
  createdAt: number;
  hostToken: string;
  hostPasscode: string;
  numberOfTeams: number;
  numberOfCourts: number;
  pointsPerGame: number;
  winBy2: boolean;
  scoringType: ScoringType;
  teams: Team[];
  rounds: Round[];
  playoffRounds?: Round[];
}

export interface StandingRow {
  rank: number;
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  gamesPlayed: number;
  byeCount: number;
}
