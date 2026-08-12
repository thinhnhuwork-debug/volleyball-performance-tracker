"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { useAuth } from "../../components/auth-provider";
import { PageHeader } from "../../components/ui";
import { createBrowserClient } from "../../lib/supabase/client";
import { MatchFormModal, type MatchFormPayload, type MatchPlayerOption } from "../../components/match-form-modal";

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
  const [team,setTeam]=useState<{id:string;name:string;abbreviation:string}|null>(null);
  const [seasonId,setSeasonId]=useState<string|null>(null);
  const [players,setPlayers]=useState<MatchPlayerOption[]>([]);
  const [showCreate,setShowCreate]=useState(false);
  const [success,setSuccess]=useState("");

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

      const [{data:teamData,error:teamError},{data:seasonData,error:seasonError},{data:playersData,error:playersError}]=await Promise.all([
        supabase.from("teams").select("id, name, abbreviation").eq("id",membership.team_id).single(),
        supabase.from("seasons").select("id").eq("team_id",membership.team_id).eq("is_active",true).order("starts_on",{ascending:false}).limit(1).maybeSingle(),
        supabase.from("players").select("id, full_name, jersey_number, position").eq("team_id",membership.team_id).eq("is_active",true).order("jersey_number"),
      ]);
      const setupError=teamError??seasonError??playersError;
      if(setupError){setError(`Không thể đọc thông tin đội: ${setupError.message}`);setLoading(false);return}
      setTeam(teamData as unknown as {id:string;name:string;abbreviation:string});setSeasonId((seasonData as unknown as {id:string}|null)?.id??null);setPlayers((playersData??[]) as MatchPlayerOption[]);

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

  async function generateMatchCode(playedAt:string){const supabase=createBrowserClient();if(!supabase||!team)return null;const day=playedAt.slice(0,10).replaceAll("-","");const prefix=`${team.abbreviation.toUpperCase()}-${day}`;for(let suffix=1;suffix<=999;suffix++){const code=`${prefix}-${String(suffix).padStart(3,"0")}`;const {data,error}=await supabase.from("matches").select("id").eq("match_code",code).maybeSingle();if(error)throw new Error(error.message);if(!data)return code}throw new Error("Không thể tạo match code trong ngày đã chọn.")}
  async function createMatch(payload:MatchFormPayload){const supabase=createBrowserClient();if(!supabase||!team)return "Không thể xác định Supabase hoặc đội hiện tại.";let code:string|null=null;try{code=await generateMatchCode(payload.match.played_at)}catch(reason){return `Không thể tạo match code: ${reason instanceof Error?reason.message:"Lỗi không xác định."}`}const matchPayload={team_id:team.id,season_id:seasonId,match_code:code,played_at:new Date(payload.match.played_at).toISOString(),competition:payload.match.competition||null,venue:payload.match.venue||null,home_team_name:payload.match.home_team_name,away_team_name:payload.match.away_team_name,is_home:payload.match.is_home,best_of:payload.match.best_of,home_sets:0,away_sets:0,status:payload.match.status,notes:payload.match.notes||null};const {data:created,error:createError}=await supabase.from("matches").insert(matchPayload as never).select("id").single();if(createError||!created)return createError?.code==="23505"?"Match code vừa bị trùng. Vui lòng lưu lại để tạo hậu tố mới.":`Không thể tạo trận: ${createError?.message??"Không lấy được match id."}`;const newMatchId=(created as {id:string}).id;if(payload.sets.length){const rows=payload.sets.map(set=>({match_id:newMatchId,set_number:set.set_number,home_score:set.home_score,away_score:set.away_score}));const {error:setError}=await supabase.from("match_sets").upsert(rows as never,{onConflict:"match_id,set_number",defaultToNull:false});if(setError)return `Trận đã tạo; lưu tỷ số từng set thất bại: ${setError.message}` }if(payload.roster.length){const validIds=new Set(players.map(player=>player.id));const rows=payload.roster.filter(item=>validIds.has(item.player_id)).map(item=>({match_id:newMatchId,player_id:item.player_id,starter:item.starter,sets_played:item.sets_played}));const {error:rosterError}=await supabase.from("match_players").upsert(rows as never,{onConflict:"match_id,player_id"});if(rosterError)return `Trận và tỷ số đã lưu; lưu roster thất bại: ${rosterError.message}` }const {error:scoreError}=await supabase.from("matches").update({home_sets:payload.home_sets,away_sets:payload.away_sets} as never).eq("id",newMatchId).eq("team_id",team.id);if(scoreError)return `Trận đã lưu; cập nhật tỷ số trận thất bại: ${scoreError.message}`;setShowCreate(false);setSuccess(`Đã tạo trận ${code}.`);setRequestId(current=>current+1);return null}

  return <AppShell><div className="page">
    <PageHeader eyebrow="MATCH CENTER" title="Trận đấu" description="Quản lý lịch thi đấu, kết quả và dữ liệu sau trận." action={<button className="primary-btn" onClick={()=>{setSuccess("");setShowCreate(true)}}>＋ Thêm trận đấu</button>}/>
    {success&&<div className="notice" style={{background:"#e5f7f1",color:"#167d62"}}>{success}</div>}
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
    {showCreate&&team&&<MatchFormModal mode="create" teamName={team.name} players={players} onClose={()=>setShowCreate(false)} onSave={createMatch}/>}
  </div></AppShell>;
}
