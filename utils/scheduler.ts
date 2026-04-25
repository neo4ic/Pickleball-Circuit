
import { Team, Round, Match, MatchStatus, RoundStatus } from '../types';

export function generateSchedule(
  teams: Team[],
  numberOfCourts: number
): Round[] {
  const blackTeams = teams.filter(t => t.color === 'BLACK').map(t => t.id);
  const whiteTeams = teams.filter(t => t.color === 'WHITE').map(t => t.id);

  // If no colors are assigned, fall back to default logic
  if (blackTeams.length === 0 || whiteTeams.length === 0) {
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

        if (teamA !== 'BYE' && teamB !== 'BYE') {
          roundMatches.push({
            id: `round-${r}-match-${i}`,
            courtNumber: 0, 
            teamAId: teamA,
            teamBId: teamB,
            scoreA: null,
            scoreB: null,
            status: MatchStatus.PENDING,
          });
        }
      }

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

      const last = teamIds.pop();
      if (last) {
        teamIds.splice(1, 0, last);
      }
    }
    return rounds;
  }

  // Black vs White matching logic
  // Pad the smaller group with BYEs to make them equal size
  const maxLen = Math.max(blackTeams.length, whiteTeams.length);
  while (blackTeams.length < maxLen) blackTeams.push('BYE');
  while (whiteTeams.length < maxLen) whiteTeams.push('BYE');

  const numRounds = maxLen;
  const rounds: Round[] = [];

  for (let r = 0; r < numRounds; r++) {
    const roundMatches: Match[] = [];

    for (let i = 0; i < maxLen; i++) {
      const teamA = blackTeams[i];
      // Rotate white teams: for round r, team A[i] plays B[(i + r) % maxLen]
      const teamB = whiteTeams[(i + r) % maxLen];

      if (teamA !== 'BYE' && teamB !== 'BYE') {
        roundMatches.push({
          id: `round-${r}-match-${i}`,
          courtNumber: 0,
          teamAId: teamA,
          teamBId: teamB,
          scoreA: null,
          scoreB: null,
          status: MatchStatus.PENDING,
        });
      }
    }

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
  }

  return rounds;
}
