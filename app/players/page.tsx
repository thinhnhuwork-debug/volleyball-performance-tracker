"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { useAuth } from "../../components/auth-provider";
import { PageHeader } from "../../components/ui";
import { createBrowserClient } from "../../lib/supabase/client";

type PlayerRow = {
  id: string;
  full_name: string;
  jersey_number: number;
  position: string;
  avatar_url: string | null;
  height_cm: number | null;
  is_active: boolean;
};

const positionLabels: Record<string, string> = {
  setter: "Chuyền 2 / Setter",
  outside_hitter: "Chủ công / Outside Hitter",
  opposite: "Đối chuyền / Opposite",
  middle_blocker: "Phụ công / Middle Blocker",
  libero: "Libero",
  defensive_specialist: "Chuyên gia phòng thủ / Defensive Specialist",
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(-2).toUpperCase();
}

export default function PlayersPage() {
  const { session } = useAuth();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("all");
  const [requestId, setRequestId] = useState(0);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    const currentUserId = userId;
    let cancelled = false;

    async function loadPlayers() {
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

      const { data, error: playersError } = await supabase
        .from("players")
        .select("id, full_name, jersey_number, position, avatar_url, height_cm, is_active")
        .eq("team_id", membership.team_id)
        .order("jersey_number", { ascending: true });

      if (cancelled) return;
      if (playersError) {
        setError(`Không thể đọc danh sách players: ${playersError.message}`);
        setLoading(false);
        return;
      }

      setPlayers((data ?? []) as PlayerRow[]);
      setError("");
      setLoading(false);
    }

    void loadPlayers();
    return () => { cancelled = true; };
  }, [requestId, userId]);

  const visiblePlayers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    return players.filter(player => {
      const matchesPosition = position === "all" || player.position === position;
      const matchesSearch = !query || player.full_name.toLocaleLowerCase("vi").includes(query) || String(player.jersey_number).includes(query);
      return matchesPosition && matchesSearch;
    });
  }, [players, position, search]);

  function retry() {
    setLoading(true);
    setError("");
    setRequestId(value => value + 1);
  }

  return <AppShell><div className="page">
    <PageHeader eyebrow="ĐỘI HÌNH / ROSTER" title="Cầu thủ" description="Danh sách cầu thủ của đội từ Supabase." action={<button className="primary-btn">＋ Thêm cầu thủ</button>}/>
    <div className="toolbar">
      <div className="search"><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Tìm theo tên hoặc số áo…" aria-label="Tìm cầu thủ"/></div>
      <select className="filter-select" value={position} onChange={event=>setPosition(event.target.value)} aria-label="Lọc theo vị trí">
        <option value="all">Tất cả vị trí / All positions</option>
        {Object.entries(positionLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}
      </select>
    </div>

    {loading && <section className="panel auth-loading" style={{minHeight:240}} aria-live="polite"><span className="auth-spinner"/><p>Đang tải danh sách cầu thủ từ Supabase…</p></section>}
    {!loading && error && <section className="panel"><div className="login-error" role="alert"><strong>Không tải được dữ liệu cầu thủ</strong><br/>{error}</div><button className="secondary-btn" type="button" onClick={retry} style={{marginTop:14}}>Thử lại / Retry</button></section>}
    {!loading && !error && <table className="data-table">
      <thead><tr><th>CẦU THỦ / PLAYER</th><th>ID</th><th>VỊ TRÍ / POSITION</th><th>CHIỀU CAO / HEIGHT</th><th>TRẠNG THÁI / STATUS</th></tr></thead>
      <tbody>
        {visiblePlayers.map(player=><tr key={player.id}>
          <td><Link href={`/players/${player.id}`} className="player-cell">
            <span className="player-avatar sm" role="img" aria-label={`Ảnh ${player.full_name}`} style={{backgroundColor:"#7157ff",backgroundImage:player.avatar_url?`url(${player.avatar_url})`:undefined,backgroundSize:"cover",backgroundPosition:"center"}}>{player.avatar_url?"":initials(player.full_name)}</span>
            <div><strong>#{player.jersey_number} {player.full_name}</strong><small>{player.avatar_url ? "Có ảnh đại diện / Avatar available" : "Chưa có ảnh đại diện / No avatar"}</small></div>
          </Link></td>
          <td><small title={player.id}>{player.id}</small></td>
          <td><span className="position-tag">{positionLabels[player.position] ?? player.position}</span></td>
          <td>{player.height_cm ? `${player.height_cm} cm` : "—"}</td>
          <td><span className="position-tag" style={player.is_active?undefined:{background:"#f0f0f4",color:"#74788a"}}>{player.is_active ? "Đang hoạt động / Active" : "Ngừng hoạt động / Inactive"}</span></td>
        </tr>)}
        {visiblePlayers.length===0 && <tr><td colSpan={5} style={{textAlign:"center",color:"var(--muted)",padding:32}}>Không có cầu thủ phù hợp.</td></tr>}
      </tbody>
    </table>}
  </div></AppShell>;
}
