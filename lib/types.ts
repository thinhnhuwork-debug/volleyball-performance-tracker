export type Position = "Setter" | "Outside Hitter" | "Opposite" | "Middle Blocker" | "Libero" | "Defensive Specialist";

export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;
  initials: string;
  color: string;
}

export interface MatchSummary {
  id: string;
  date: string;
  opponent: string;
  competition: string;
  venue: string;
  score: string;
  sets: string[];
  result: "W" | "L";
  kills: number;
  aces: number;
  blocks: number;
  digs: number;
  assists: number;
  errors: number;
}

export interface SetterLine {
  match: string;
  touches: number;
  perfect: number;
  playable: number;
  bad: number;
  errors: number;
  assists: number;
}

export interface GeneralStatsInput {
  serveAttempts: number;
  aces: number;
  serveErrors: number;
  attackAttempts: number;
  kills: number;
  attackErrors: number;
  soloBlocks: number;
  blockAssists: number;
  digs: number;
  digErrors: number;
  receptionAttempts: number;
  perfectReceptions: number;
  goodReceptions: number;
  poorReceptions: number;
  receptionErrors: number;
}
