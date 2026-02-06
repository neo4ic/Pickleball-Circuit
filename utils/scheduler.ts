
import { Team, Round, Match, MatchStatus, RoundStatus } from '../types';

export function generateSchedule(
  teams: Team[],
  numberOfCourts: number
): Round[] {
  const teamIds = teams.map(t => t.id);
  const isOdd = teamIds.length % 2 !== 0;
  if (isOdd) {
    teamIds.push('BYE');
  }

  const numTeams = teamIds.length;
  const numRounds = numTeams - 1;
  const half = numTeams / 2;

  const rounds: Round[] = [];

  for (let r = 0; r < numRounds; r++) {
    const roundMatches: Match[] = [];
    
    for (let i = 0; i < half; i++) {
      const teamA = teamIds[i];
      const teamB = teamIds[numTeams - 1 - i];

      // Exclude true BYEs from the match list
      if (teamA !== 'BYE' && teamB !== 'BYE') {
        roundMatches.push({
          id: `round-${r}-match-${i}`,
          courtNumber: 0, 
          teamAId: teamA,
          teamBId: teamB,
          scoreA: null, // Initialize as null to remove default 0
          scoreB: null, // Initialize as null to remove default 0
          status: MatchStatus.PENDING,
        });
      }
    }

    // Assign courts and waves
    roundMatches.forEach((match, index) => {
      match.courtNumber = (index % numberOfCourts) + 1;
      match.waveNumber = Math.floor(index / numberOfCourts) + 1;
    });

    rounds.push({
      id: `round-${r}`,
      roundNumber: r + 1,
      status: RoundStatus.NOT_STARTED,
      elapsedSeconds: 0,
      matches: roundMatches
    });

    // Rotate circle
    const last = teamIds.pop();
    if (last) {
      teamIds.splice(1, 0, last);
    }
  }

  return rounds;
}
