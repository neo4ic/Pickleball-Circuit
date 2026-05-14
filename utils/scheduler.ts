
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

export function generate6v6Schedule(
  teams: Team[],
  numberOfCourts: number
): Round[] {
  const blackPlayers = teams.filter(t => t.color === 'BLACK');
  const whitePlayers = teams.filter(t => t.color === 'WHITE');

  // Balanced Doubles rotation for 6 players (5 rounds)
  const rotations = [
    [[0, 5], [1, 4], [2, 3]],
    [[0, 1], [2, 5], [3, 4]],
    [[0, 2], [1, 3], [4, 5]],
    [[0, 3], [4, 2], [5, 1]],
    [[0, 4], [5, 3], [1, 2]]
  ];

  const rounds: Round[] = [];

  for (let r = 0; r < 5; r++) {
    const roundMatches: Match[] = [];
    const rotation = rotations[r];

    for (let i = 0; i < 3; i++) {
      const bIdx = rotation[i];
      // Rotate the white teams opponent selection in each round
      const wIdx = rotation[(i + r) % 3];

      const pA1 = blackPlayers[bIdx[0]];
      const pA2 = blackPlayers[bIdx[1]];
      const pB1 = whitePlayers[wIdx[0]];
      const pB2 = whitePlayers[wIdx[1]];

      if (pA1 && pA2 && pB1 && pB2) {
        roundMatches.push({
          id: `6v6-r${r}-m${i}`,
          courtNumber: (i % numberOfCourts) + 1,
          waveNumber: Math.floor(i / numberOfCourts) + 1,
          teamAId: 'BLACK',
          teamBId: 'WHITE',
          playerAIds: [pA1.id, pA2.id],
          playerBIds: [pB1.id, pB2.id],
          scoreA: null,
          scoreB: null,
          status: MatchStatus.PENDING,
        });
      }
    }

    rounds.push({
      id: `round-6v6-${r}`,
      roundNumber: r + 1,
      status: RoundStatus.NOT_STARTED,
      elapsedSeconds: 0,
      matches: roundMatches
    });
  }

  return rounds;
}
