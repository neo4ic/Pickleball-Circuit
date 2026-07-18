
import { Event, StandingRow, MatchStatus, RoundStatus, ColorStats, Match } from '../types';

export function computeColorStats(event: Event): ColorStats {
  const stats: ColorStats = { blackWins: 0, whiteWins: 0 };
  const teamColorMap: Record<string, 'BLACK' | 'WHITE'> = {};
  
  event.teams.forEach(t => {
    if (t.color) teamColorMap[t.id] = t.color;
  });

  const allRounds = [...event.rounds, ...(event.playoffRounds || [])];
  
  allRounds.forEach(round => {
    round.matches.forEach(match => {
      if (match.status === MatchStatus.COMPLETE && match.scoreA !== null && match.scoreB !== null) {
        if (match.scoreA > match.scoreB) {
          if (match.teamAId === 'BLACK') stats.blackWins++;
          else if (match.teamAId === 'WHITE') stats.whiteWins++;
          else {
            const winnerColor = teamColorMap[match.teamAId];
            if (winnerColor === 'BLACK') stats.blackWins++;
            else if (winnerColor === 'WHITE') stats.whiteWins++;
          }
        } else if (match.scoreB > match.scoreA) {
          if (match.teamBId === 'BLACK') stats.blackWins++;
          else if (match.teamBId === 'WHITE') stats.whiteWins++;
          else {
            const winnerColor = teamColorMap[match.teamBId];
            if (winnerColor === 'BLACK') stats.blackWins++;
            else if (winnerColor === 'WHITE') stats.whiteWins++;
          }
        }
      }
    });
  });

  return stats;
}

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
          const teamAIds = event.mode === 'INDIVIDUAL_6V_6' ? (match.playerAIds || []) : [match.teamAId];
          const teamBIds = event.mode === 'INDIVIDUAL_6V_6' ? (match.playerBIds || []) : [match.teamBId];

          teamAIds.forEach(id => {
            const player = standings[id];
            if (player) {
              player.gamesPlayed++;
              player.pointsFor += match.scoreA!;
              player.pointsAgainst += match.scoreB!;
              if (match.scoreA! > match.scoreB!) player.wins++;
              else if (match.scoreB! > match.scoreA!) player.losses++;
            }
          });

          teamBIds.forEach(id => {
            const player = standings[id];
            if (player) {
              player.gamesPlayed++;
              player.pointsFor += match.scoreB!;
              player.pointsAgainst += match.scoreA!;
              if (match.scoreB! > match.scoreA!) player.wins++;
              else if (match.scoreA! > match.scoreB!) player.losses++;
            }
          });
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

export function computePlayoffStandings(event: Event, rrStandings: StandingRow[]): StandingRow[] {
  if (!event.playoffRounds || event.playoffRounds.length === 0) return [];

  // Default standings list from Top 4 rrStandings
  const top4Ids = rrStandings.slice(0, 4).map(s => s.teamId);
  const playoffStandingsMap: Record<string, StandingRow> = {};

  // Initialize playoff stats using rrStandings/event.teams
  top4Ids.forEach((teamId, index) => {
    const team = event.teams.find(t => t.id === teamId);
    playoffStandingsMap[teamId] = {
      rank: index + 1,
      teamId,
      teamName: team?.name || `Team ${index + 1}`,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
      gamesPlayed: 0,
      byeCount: 0
    };
  });

  // Collect all stats from playoff rounds
  event.playoffRounds.forEach(round => {
    round.matches.forEach(match => {
      if (match.status === MatchStatus.COMPLETE && match.scoreA !== null && match.scoreB !== null) {
        const pA = playoffStandingsMap[match.teamAId];
        const pB = playoffStandingsMap[match.teamBId];

        if (pA && pB) {
          pA.gamesPlayed++;
          pB.gamesPlayed++;
          pA.pointsFor += match.scoreA;
          pA.pointsAgainst += match.scoreB;
          pB.pointsFor += match.scoreB;
          pB.pointsAgainst += match.scoreA;

          if (match.scoreA > match.scoreB) {
            pA.wins++;
            pB.losses++;
          } else if (match.scoreB > match.scoreA) {
            pB.wins++;
            pA.losses++;
          }
        }
      }
    });
  });

  // Now determine the specific rank order from bracket results
  const finalsRound = event.playoffRounds.find(r => r.roundNumber === 'FINALS');

  let goldWinnerId: string | null = null;
  let goldLoserId: string | null = null;
  let bronzeWinnerId: string | null = null;
  let bronzeLoserId: string | null = null;

  if (finalsRound && finalsRound.status === RoundStatus.SUBMITTED) {
    const goldMatch = finalsRound.matches.find(m => m.id === 'match-f-gold');
    const bronzeMatch = finalsRound.matches.find(m => m.id === 'match-f-bronze');

    if (goldMatch && goldMatch.status === MatchStatus.COMPLETE && goldMatch.scoreA !== null && goldMatch.scoreB !== null) {
      if (goldMatch.scoreA > goldMatch.scoreB) {
        goldWinnerId = goldMatch.teamAId;
        goldLoserId = goldMatch.teamBId;
      } else {
        goldWinnerId = goldMatch.teamBId;
        goldLoserId = goldMatch.teamAId;
      }
    }

    if (bronzeMatch && bronzeMatch.status === MatchStatus.COMPLETE && bronzeMatch.scoreA !== null && bronzeMatch.scoreB !== null) {
      if (bronzeMatch.scoreA > bronzeMatch.scoreB) {
        bronzeWinnerId = bronzeMatch.teamAId;
        bronzeLoserId = bronzeMatch.teamBId;
      } else {
        bronzeWinnerId = bronzeMatch.teamBId;
        bronzeLoserId = bronzeMatch.teamAId;
      }
    }
  }

  // Generate ranks
  const sorted = Object.values(playoffStandingsMap).sort((a, b) => {
    // If Gold/Bronze match is finalized, sort according to strict bracket placement
    if (goldWinnerId || goldLoserId || bronzeWinnerId || bronzeLoserId) {
      const getRankValue = (teamId: string) => {
        if (teamId === goldWinnerId) return 1;
        if (teamId === goldLoserId) return 2;
        if (teamId === bronzeWinnerId) return 3;
        if (teamId === bronzeLoserId) return 4;
        return 5;
      };
      
      const rankA = getRankValue(a.teamId);
      const rankB = getRankValue(b.teamId);
      if (rankA !== rankB) return rankA - rankB;
    }

    // Fall back to wins / ratio
    if (b.wins !== a.wins) return b.wins - a.wins;
    const diffA = a.pointsFor - a.pointsAgainst;
    const diffB = b.pointsFor - b.pointsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    return b.pointsFor - a.pointsFor;
  });

  return sorted.map((s, i) => ({ ...s, rank: i + 1 }));
}

