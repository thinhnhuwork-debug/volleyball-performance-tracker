import type { MatchSummary, Player, SetterLine } from "./types";

export const players: Player[] = [
  { id: "thinh", name: "Thịnh", number: 17, position: "Setter", initials: "TT", color: "#7157ff" },
  { id: "minh", name: "Minh", number: 10, position: "Outside Hitter", initials: "NM", color: "#ff7a59" },
  { id: "nam", name: "Nam", number: 7, position: "Middle Blocker", initials: "VN", color: "#25b99a" },
  { id: "hoang", name: "Hoàng", number: 5, position: "Opposite", initials: "HH", color: "#f0a51a" },
  { id: "long", name: "Long", number: 3, position: "Libero", initials: "DL", color: "#3388ff" },
  { id: "duc", name: "Đức", number: 11, position: "Outside Hitter", initials: "PD", color: "#e4549b" },
];

export const matches: MatchSummary[] = [
  { id: "m5", date: "10 Thg 8, 2026", opponent: "Thunder VC", competition: "Hanoi Open", venue: "Nhà thi đấu Cầu Giấy", score: "3–1", sets: ["25–19", "21–25", "25–22", "25–20"], result: "W", kills: 48, aces: 9, blocks: 8, digs: 51, assists: 44, errors: 17 },
  { id: "m4", date: "03 Thg 8, 2026", opponent: "Bắc Ninh United", competition: "Hanoi Open", venue: "Nhà thi đấu Tây Hồ", score: "3–0", sets: ["25–21", "25–18", "25–23"], result: "W", kills: 43, aces: 7, blocks: 10, digs: 39, assists: 40, errors: 12 },
  { id: "m3", date: "27 Thg 7, 2026", opponent: "Skyline Club", competition: "Friendly", venue: "HVC Arena", score: "2–3", sets: ["25–20", "22–25", "25–21", "19–25", "12–15"], result: "L", kills: 54, aces: 5, blocks: 7, digs: 58, assists: 48, errors: 24 },
  { id: "m2", date: "20 Thg 7, 2026", opponent: "Phoenix Team", competition: "Friendly", venue: "HVC Arena", score: "3–1", sets: ["25–17", "23–25", "25–18", "25–16"], result: "W", kills: 50, aces: 11, blocks: 9, digs: 46, assists: 45, errors: 15 },
  { id: "m1", date: "13 Thg 7, 2026", opponent: "Lotus VC", competition: "Hanoi Open", venue: "Nhà thi đấu Thanh Xuân", score: "1–3", sets: ["20–25", "25–23", "18–25", "22–25"], result: "L", kills: 41, aces: 6, blocks: 6, digs: 49, assists: 38, errors: 22 },
];

export const setterTrend: SetterLine[] = [
  { match: "LOT", touches: 74, perfect: 41, playable: 18, bad: 8, errors: 4, assists: 22 },
  { match: "PHX", touches: 80, perfect: 49, playable: 18, bad: 6, errors: 2, assists: 27 },
  { match: "SKY", touches: 91, perfect: 53, playable: 20, bad: 9, errors: 3, assists: 30 },
  { match: "BNU", touches: 68, perfect: 43, playable: 15, bad: 5, errors: 1, assists: 25 },
  { match: "THU", touches: 82, perfect: 52, playable: 19, bad: 5, errors: 3, assists: 28 },
];
