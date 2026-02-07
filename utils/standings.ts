
import { Event, StandingRow, MatchStatus, RoundStatus } from '../types';

export function computeStandings(event: Event): StandingRow[] {
  const standings: Record<string, StandingRow> = {};

  // Initialize
  event.teams.forEach(team => {
    standings[team.id] = {
      rank: 0,
      teamId: team.id,
      teamName: team.name,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
      gamesPlayed: 0,
      byeCount: 0
    };
  });

  // Process all matches that are complete, regardless of round submission status
  // This allows for real-time leaderboard updates as scores are entered.
  const processRounds = (rounds: any[]) => {
    rounds.forEach(round => {
      round.matches.forEach(match => {
        if (match.status === MatchStatus.COMPLETE && match.scoreA !== null && match.scoreB !== null) {
          const tA = standings[match.teamAId];
          const tB = standings[match.teamBId];

          if (tA && tB) {
            tA.gamesPlayed++;
            tB.gamesPlayed++;
            tA.pointsFor += match.scoreA;
            tA.pointsAgainst += match.scoreB;
            tB.pointsFor += match.scoreB;
            tB.pointsAgainst += match.scoreA;

            if (match.scoreA > match.scoreB) {
              tA.wins++;
              tB.losses++;
            } else if (match.scoreB > match.scoreA) {
              tB.wins++;
              tA.losses++;
            }
          }
        }
      });
    });
  };

  processRounds(event.rounds);
  if (event.playoffRounds) {
    processRounds(event.playoffRounds);
  }

  // Calculate differentials
  Object.values(standings).forEach(s => {
    s.diff = s.pointsFor - s.pointsAgainst;
  });

  // Sort with tie-breakers
  const sorted = Object.values(standings).sort((a, b) => {
    // 1. Wins
    if (b.wins !== a.wins) return b.wins - a.wins;
    // 2. Point Diff
    if (b.diff !== a.diff) return b.diff - a.diff;
    // 3. Points For
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    // Stability
    return a.teamName.localeCompare(b.teamName);
  });

  // Assign ranks
  return sorted.map((s, i) => ({ ...s, rank: i + 1 }));
}
