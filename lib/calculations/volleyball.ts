import type { GeneralStatsInput, SetterLine } from "../types";

export const percentage = (value: number, total: number) => total > 0 ? (value / total) * 100 : 0;
export const formatPercent = (value: number) => `${value.toFixed(1)}%`;
export const setAttempts = (s: Pick<SetterLine, "perfect" | "playable" | "bad" | "errors">) => s.perfect + s.playable + s.bad + s.errors;
export const settingAccuracy = (s: SetterLine) => percentage(s.perfect + s.playable, setAttempts(s));
export const attackEfficiency = (s: Pick<GeneralStatsInput, "kills" | "attackErrors" | "attackAttempts">) => percentage(s.kills - s.attackErrors, s.attackAttempts);
export const receptionEfficiency = (s: Pick<GeneralStatsInput, "perfectReceptions" | "goodReceptions" | "receptionAttempts">) => percentage((s.perfectReceptions * 2) + s.goodReceptions, s.receptionAttempts * 2);

export function validateGeneralStats(stats: GeneralStatsInput): string[] {
  const errors: string[] = [];
  if (stats.kills > stats.attackAttempts) errors.push("Kills không thể lớn hơn Attack Attempts.");
  if (stats.aces > stats.serveAttempts) errors.push("Ace không thể lớn hơn Serve Attempts.");
  const receptions = stats.perfectReceptions + stats.goodReceptions + stats.poorReceptions + stats.receptionErrors;
  if (receptions > stats.receptionAttempts) errors.push("Tổng phân loại reception vượt Reception Attempts.");
  return errors;
}
