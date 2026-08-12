"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { useAuth } from "../../components/auth-provider";
import { PageHeader } from "../../components/ui";
import { createBrowserClient } from "../../lib/supabase/client";

type MatchRow = {
  id: string;
  played_at: string;
  competition: string | null;
  venue: string | null;
  home_team_name: string;
  away_team_name: string;
  is_home: boolean;
  home_sets: number;
  away_sets: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
};

type Filter = "all" | "completed" | "upcoming";

const statusLabels: Record<MatchRow["status"], string> = {
  scheduled: "Sắp diễn ra / Scheduled",
  in_progress: "Đang thi đấu / In progress",
  completed: "Đã kết thúc / Completed",
  cancelled: "Đã hủy / Cancelled",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function resultFor(match: MatchRow) {
  if (match.status !== "completed") return { label: "–", className: "w" };
  const teamSets = match.is_home ? match.home_sets : match.away_sets;
  const opponentSets = match.is_home ? match.away_sets : match.home_sets;
  if (teamSets === opponentSets) return { label: "D", className: "w" };
  return teamSets > opponentSets ? { label: "W", className: "w" } : { label: "L", className: "l" };
}

export default function MatchesPage() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const currentUserId = userId;
    let cancelled = false;

    async function loadMatches() {
      const supabase = createBrowserClient();
      if (!supabase) {
        if (!cancelled) {
          setError("Supabase chưa được cấu hình cho môi trường này.");
          setLoading(false);
        }
        return;
      }

      const { data: membershipData, error: membershipError } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (membershipError) {
        setError(`Không thể đọc team_members: ${membershipError.message}`);
        setLoading(false);
        return;
      }

      const membership = membershipData as { team_id: string } | null;
      if (!membership) {
        setError("Tài khoản hiện tại chưa thuộc đội nào. Hãy kiểm tra dữ liệu team_members và chính sách RLS.");
        setLoading(false);
        return;
      }

      const { data, error: matchesError } = await supabase
        .from("matches")
        .select("id, played_at, competition, venue, home_team_name, away_team_name, is_home, home_sets, away_sets, status")
        .eq("team_id", membership.team_id)
        .order("played_at", { ascending: false });

      if (cancelled) return;
      if (matchesError) {
        setError(`Không thể đọc danh sách matches: ${matchesError.message}`);
        setLoading(false);
        return;
      }

      setMatches((data ?? []) as MatchRow[]);
      setError("");
      setLoading(false);
    }

    void loadMatches();
    return () => { cancelled = true; };
  }, [requestId, userId]);

  const visibleMatches = useMemo(() => matches.filter(match => {
    if (filter === "completed") return match.status === "completed";
    if (filter === "upcoming") return match.status === "scheduled" || match.status === "in_progress";
    return true;
  }), [filter, matches]);

  function retry() {
    setLoading(true);
    setError("");
    setRequestId(value => value + 1);
  }

  return <AppShell><div className="page">
    <PageHeader eyebrow="MATCH CENTER" title="Trận đấu" description="Quản lý lịch thi đấu, kết quả và dữ liệu sau trận." action={<button className="primary-btn">＋ Tạo trận đấu</button>}/>
    <div className="tabs">
      <button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>Tất cả</button>
      <button className={filter==="completed"?"active":""} onClick={()=>setFilter("completed")}>Đã kết thúc</button>
      <button className={filter==="upcoming"?"active":""} onClick={()=>setFilter("upcoming")}>Sắp tới</button>
    </div>

    {loading && <section className="panel auth-loading" style={{minHeight:240}} aria-live="polite"><span className="auth-spinner"/><p>Đang tải danh sách trận đấu từ Supabase…</p></section>}
    {!loading && error && <section className="panel"><div className="login-error" role="alert"><strong>Không tải được dữ liệu trận đấu</strong><br/>{error}</div><button className="secondary-btn" type="button" onClick={retry} style={{marginTop:14}}>Thử lại / Retry</button></section>}
    {!loading && !error && <section className="panel">
      {visibleMatches.map(match => {
        const result = resultFor(match);
        const opponent = match.is_home ? match.away_team_name : match.home_team_name;
        return <Link href={`/matches/${match.id}`} className="match-row" key={match.id}>
          <span className={`result ${result.className}`}>{result.label}</span>
          <div><strong>{match.is_home ? match.home_team_name : match.away_team_name} vs {opponent}</strong><small>{formatDate(match.played_at)} · {match.competition ?? "Chưa có giải đấu"} · {match.venue ?? "Chưa có địa điểm"}</small></div>
          <div style={{textAlign:"right"}}><b>{match.home_sets}–{match.away_sets}</b><small>{statusLabels[match.status]}</small></div>
        </Link>;
      })}
      {visibleMatches.length===0 && <div style={{textAlign:"center",color:"var(--muted)",padding:32}}>Không có trận đấu phù hợp.</div>}
    </section>}
  </div></AppShell>;
}
