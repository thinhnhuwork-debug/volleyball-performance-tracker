"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/app-shell";
import { useAuth } from "../components/auth-provider";
import { Avatar, MetricCard, PageHeader, Progress } from "../components/ui";
import { createBrowserClient } from "../lib/supabase/client";

type Team = { id: string; name: string; abbreviation: string };
type Season = { id: string; name: string };
type Match = { id:string; season_id:string|null; played_at:string; competition:string|null; home_team_name:string; away_team_name:string; is_home:boolean; home_sets:number; away_sets:number; status:string };
type Player = { id:string; full_name:string; jersey_number:number; position:string };
type GeneralStat = { match_id:string; player_id:string; attack_attempts:number; kills:number; attack_errors:number; aces:number; serve_errors:number; solo_blocks:number; block_assists:number; dig_errors:number; reception_errors:number };
type SetterStat = { match_id:string; player_id:string; perfect_sets:number; playable_sets:number; bad_sets:number; set_errors:number; assists:number };

type DashboardData = { team:Team; season:Season|null; matches:Match[]; players:Player[]; generalStats:GeneralStat[]; setterStats:SetterStat[] };

const positionLabels:Record<string,string>={setter:"Chuyền 2 / Setter",outside_hitter:"Chủ công / Outside Hitter",opposite:"Đối chuyền / Opposite",middle_blocker:"Phụ công / Middle Blocker",libero:"Libero",defensive_specialist:"Chuyên gia phòng thủ / Defensive Specialist"};
const colors=["#7157ff","#ff7a59","#25b99a","#f0a51a","#3388ff","#e4549b"];
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).map(part=>part[0]).join("").slice(-2).toUpperCase();
const percent=(value:number,total:number)=>total>0?value/total*100:0;
const formatDate=(value:string)=>new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value));

function teamScore(match:Match){return match.is_home?match.home_sets:match.away_sets}
function opponentScore(match:Match){return match.is_home?match.away_sets:match.home_sets}
function opponent(match:Match){return match.is_home?match.away_team_name:match.home_team_name}
function result(match:Match){return teamScore(match)>opponentScore(match)?"W":"L"}

export default function DashboardPage(){
  const {session}=useAuth();
  const userId=session?.user.id;
  const [data,setData]=useState<DashboardData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [requestId,setRequestId]=useState(0);

  useEffect(()=>{
    if(!userId)return;
    const currentUserId=userId;
    let cancelled=false;
    async function load(){
      const supabase=createBrowserClient();
      if(!supabase){if(!cancelled){setError("Supabase chưa được cấu hình cho môi trường này.");setLoading(false)}return}

      const {data:membershipData,error:membershipError}=await supabase.from("team_members").select("team_id").eq("user_id",currentUserId).order("created_at",{ascending:true}).limit(1).maybeSingle();
      if(cancelled)return;
      if(membershipError){setError(`Không thể đọc team_members: ${membershipError.message}`);setLoading(false);return}
      const membership=membershipData as {team_id:string}|null;
      if(!membership){setError("Tài khoản hiện tại chưa thuộc đội nào. Hãy kiểm tra team_members và RLS.");setLoading(false);return}

      const [{data:teamData,error:teamError},{data:seasonData,error:seasonError}]=await Promise.all([
        supabase.from("teams").select("id, name, abbreviation").eq("id",membership.team_id).single(),
        supabase.from("seasons").select("id, name").eq("team_id",membership.team_id).eq("is_active",true).order("starts_on",{ascending:false}).limit(1).maybeSingle(),
      ]);
      if(cancelled)return;
      if(teamError||seasonError){setError(`Không thể đọc thông tin đội/mùa giải: ${(teamError??seasonError)?.message}`);setLoading(false);return}
      const team=teamData as Team;
      const season=seasonData as Season|null;

      let matchesQuery=supabase.from("matches").select("id, season_id, played_at, competition, home_team_name, away_team_name, is_home, home_sets, away_sets, status").eq("team_id",membership.team_id).order("played_at",{ascending:false});
      if(season)matchesQuery=matchesQuery.eq("season_id",season.id);
      const {data:matchesData,error:matchesError}=await matchesQuery;
      if(cancelled)return;
      if(matchesError){setError(`Không thể đọc matches: ${matchesError.message}`);setLoading(false);return}
      const matches=(matchesData??[]) as Match[];
      const matchIds=matches.map(match=>match.id);

      const playersPromise=supabase.from("players").select("id, full_name, jersey_number, position").eq("team_id",membership.team_id).eq("is_active",true).order("jersey_number");
      if(matchIds.length===0){
        const {data:playersData,error:playersError}=await playersPromise;
        if(cancelled)return;
        if(playersError){setError(`Không thể đọc players: ${playersError.message}`);setLoading(false);return}
        setData({team,season,matches,players:(playersData??[]) as Player[],generalStats:[],setterStats:[]});setError("");setLoading(false);return;
      }

      const [{data:playersData,error:playersError},{data:generalData,error:generalError},{data:setterData,error:setterError}]=await Promise.all([
        playersPromise,
        supabase.from("player_match_stats").select("match_id, player_id, attack_attempts, kills, attack_errors, aces, serve_errors, solo_blocks, block_assists, dig_errors, reception_errors").in("match_id",matchIds),
        supabase.from("setter_match_stats").select("match_id, player_id, perfect_sets, playable_sets, bad_sets, set_errors, assists").in("match_id",matchIds),
      ]);
      if(cancelled)return;
      const queryError=playersError??generalError??setterError;
      if(queryError){setError(`Không thể đọc dữ liệu hiệu suất: ${queryError.message}`);setLoading(false);return}
      setData({team,season,matches,players:(playersData??[]) as Player[],generalStats:(generalData??[]) as GeneralStat[],setterStats:(setterData??[]) as SetterStat[]});setError("");setLoading(false);
    }
    void load();return()=>{cancelled=true};
  },[requestId,userId]);

  const computed=useMemo(()=>{
    if(!data)return null;
    const completed=data.matches.filter(match=>match.status==="completed");
    const wins=completed.filter(match=>teamScore(match)>opponentScore(match)).length;
    const setWins=completed.reduce((sum,match)=>sum+teamScore(match),0);
    const setLosses=completed.reduce((sum,match)=>sum+opponentScore(match),0);
    const recent=data.matches.slice(0,5);
    const recentIds=new Set(recent.map(match=>match.id));
    const recentGeneral=data.generalStats.filter(stat=>recentIds.has(stat.match_id));
    const recentSetter=data.setterStats.filter(stat=>recentIds.has(stat.match_id));
    const chart=recent.map(match=>{
      const general=recentGeneral.filter(stat=>stat.match_id===match.id);
      return {match,kills:general.reduce((sum,stat)=>sum+stat.kills,0),errors:general.reduce((sum,stat)=>sum+stat.attack_errors+stat.serve_errors+stat.dig_errors+stat.reception_errors,0),hasData:general.length>0};
    });
    const playerTotals=data.players.map(player=>{
      const stats=recentGeneral.filter(stat=>stat.player_id===player.id);
      const setter=recentSetter.filter(stat=>stat.player_id===player.id);
      const kills=stats.reduce((sum,stat)=>sum+stat.kills,0),aces=stats.reduce((sum,stat)=>sum+stat.aces,0),blocks=stats.reduce((sum,stat)=>sum+stat.solo_blocks+stat.block_assists,0),attempts=stats.reduce((sum,stat)=>sum+stat.attack_attempts,0);
      const setAttempts=setter.reduce((sum,stat)=>sum+stat.perfect_sets+stat.playable_sets+stat.bad_sets+stat.set_errors,0),goodSets=setter.reduce((sum,stat)=>sum+stat.perfect_sets+stat.playable_sets,0);
      return {player,kills,aces,blocks,attempts,points:kills+aces+blocks,setAccuracy:percent(goodSets,setAttempts),assists:setter.reduce((sum,stat)=>sum+stat.assists,0),setErrors:setter.reduce((sum,stat)=>sum+stat.set_errors,0),hasGeneral:stats.length>0,hasSetter:setter.length>0};
    });
    const withGeneral=playerTotals.filter(item=>item.hasGeneral);
    const withSetter=playerTotals.filter(item=>item.hasSetter);
    return {completed,wins,setWins,setLosses,recent,chart,topScorer:withGeneral.sort((a,b)=>b.points-a.points)[0],topAttacker:[...withGeneral].filter(item=>item.attempts>0).sort((a,b)=>b.kills/b.attempts-a.kills/a.attempts)[0],topBlocker:[...withGeneral].sort((a,b)=>b.blocks-a.blocks)[0],topSetter:withSetter.sort((a,b)=>b.setAccuracy-a.setAccuracy)[0],totals:{kills:data.generalStats.reduce((sum,stat)=>sum+stat.kills,0),aces:data.generalStats.reduce((sum,stat)=>sum+stat.aces,0),blocks:data.generalStats.reduce((sum,stat)=>sum+stat.solo_blocks+stat.block_assists,0),errors:data.generalStats.reduce((sum,stat)=>sum+stat.attack_errors+stat.serve_errors+stat.dig_errors+stat.reception_errors,0)+data.setterStats.reduce((sum,stat)=>sum+stat.set_errors,0)},hasGeneral:data.generalStats.length>0};
  },[data]);

  function retry(){setLoading(true);setError("");setRequestId(value=>value+1)}
  if(loading)return <AppShell><div className="page"><section className="panel auth-loading" style={{minHeight:360}} aria-live="polite"><span className="auth-spinner"/><p>Đang tải Dashboard từ Supabase…</p></section></div></AppShell>;
  if(error)return <AppShell><div className="page"><PageHeader title="Tổng quan hiệu suất" description="Không thể tải dữ liệu Dashboard."/><section className="panel"><div className="login-error" role="alert"><strong>Lỗi tải Dashboard</strong><br/>{error}</div><button className="secondary-btn" onClick={retry} style={{marginTop:14}}>Thử lại / Retry</button></section></div></AppShell>;
  if(!data||!computed)return null;

  const seasonLabel=data.season?.name??"Tất cả mùa giải";
  const competition=data.matches.find(match=>match.competition)?.competition??"Chưa có giải đấu";
  const chartHasData=computed.chart.some(item=>item.hasData);
  const chartMax=Math.max(1,...computed.chart.flatMap(item=>[item.kills,item.errors]));
  const leaderCards=[
    {item:computed.topScorer,label:"TOP SCORER",value:computed.topScorer?.points,unit:"điểm",sub:computed.topScorer?`${computed.topScorer.kills} kills · ${computed.topScorer.aces} aces`:"Chưa có thống kê",progress:computed.topScorer?Math.min(computed.topScorer.points,100):0},
    {item:computed.topAttacker,label:"TOP ATTACKER",value:computed.topAttacker?`${percent(computed.topAttacker.kills,computed.topAttacker.attempts).toFixed(1)}%`:undefined,unit:"kill rate",sub:computed.topAttacker?`${computed.topAttacker.kills} kills / ${computed.topAttacker.attempts} attempts`:"Chưa có thống kê",progress:computed.topAttacker?percent(computed.topAttacker.kills,computed.topAttacker.attempts):0},
    {item:computed.topBlocker,label:"TOP BLOCKER",value:computed.topBlocker?.blocks,unit:"blocks",sub:computed.topBlocker?`${computed.topBlocker.blocks} blocks qua ${computed.recent.length} trận gần nhất`:"Chưa có thống kê",progress:computed.topBlocker?Math.min(computed.topBlocker.blocks*5,100):0},
  ];

  return <AppShell><div className="page">
    <PageHeader eyebrow={data.team.name.toUpperCase()} title="Tổng quan hiệu suất" description={`Theo dõi phong độ đội và những chỉ số quan trọng trong ${seasonLabel}.`} action={<Link className="primary-btn" href="/stats">＋ Nhập thống kê</Link>}/>
    <section className="metrics-grid"><MetricCard label="TỔNG SỐ TRẬN" value={data.matches.length} detail={`${competition} · ${seasonLabel}`}/><MetricCard label="TRẬN THẮNG" value={computed.wins} detail={`${computed.completed.length} trận đã kết thúc`} tone="green"/><MetricCard label="TỶ LỆ THẮNG / WIN RATE" value={computed.completed.length?`${Math.round(computed.wins/computed.completed.length*100)}%`:"—"} detail={computed.completed.length?`${computed.wins}/${computed.completed.length} trận thắng`:"Chưa có trận hoàn tất"} tone="blue"/><MetricCard label="TỶ SỐ HIỆP / SET SCORE" value={`${computed.setWins}–${computed.setLosses}`} detail={`Chênh lệch ${computed.setWins-computed.setLosses>=0?"+":""}${computed.setWins-computed.setLosses} hiệp`} tone="orange"/></section>
    <section className="dashboard-grid">
      <article className="panel performance-panel"><div className="panel-head"><div><h2>Hiệu suất đội</h2><p>5 trận gần nhất</p></div><select><option>5 trận gần nhất</option></select></div><div className="chart-legend"><span><i className="kill-dot"/> Điểm tấn công / Kill</span><span><i className="error-dot"/> Lỗi / Error</span></div>{chartHasData?<div className="bar-chart">{computed.chart.slice().reverse().map(item=><div className="bar-group" key={item.match.id}><div className="bars"><i className="kill-bar" title={`${item.kills} kills`} style={{height:`${item.kills/chartMax*160}px`}}/><i className="error-bar" title={`${item.errors} errors`} style={{height:`${item.errors/chartMax*160}px`}}/></div><small>{opponent(item.match).split(" ")[0]}</small></div>)}</div>:<div style={{height:200,display:"grid",placeItems:"center",color:"var(--muted)",fontSize:11,textAlign:"center"}}>Chưa có player_match_stats để hiển thị hiệu suất đội.</div>}</article>
      <article className="panel recent-panel"><div className="panel-head"><div><h2>Kết quả gần đây</h2><p>{competition} · {seasonLabel}</p></div><Link href="/matches">Xem tất cả →</Link></div>{computed.recent.slice(0,4).map(match=><Link href={`/matches/${match.id}`} className="match-row" key={match.id}><span className={`result ${match.status==="completed"?result(match).toLowerCase():"w"}`}>{match.status==="completed"?result(match):"–"}</span><div><strong>vs {opponent(match)}</strong><small>{formatDate(match.played_at)} · {match.competition??"Chưa có giải đấu"}</small></div><b>{match.home_sets}–{match.away_sets}</b></Link>)}{computed.recent.length===0&&<div style={{padding:32,textAlign:"center",color:"var(--muted)",fontSize:11}}>Chưa có trận đấu trong {seasonLabel}.</div>}</article>
    </section>
    <section className="section-title"><div><h2>Đội hình nổi bật</h2><p>Top performers qua 5 trận gần nhất</p></div><Link href="/players">Xem bảng cầu thủ →</Link></section>
    <section className="leaders-grid">{leaderCards.map((card,index)=>{const player=card.item?.player;return <article className="leader-card" key={card.label}><span className="leader-label">{card.label}</span><Avatar initials={player?initials(player.full_name):"—"} color={colors[index]}/><div className="leader-name"><strong>{player?`#${player.jersey_number} ${player.full_name}`:"Chưa có dữ liệu"}</strong><small>{player?(positionLabels[player.position]??player.position):"player_match_stats trống"}</small></div><div className="leader-value"><b>{card.value??"—"}</b><span>{card.unit}</span></div><Progress value={card.progress} color={colors[index]}/><small>{card.sub}</small></article>})}<article className="leader-card setter-card"><span className="leader-label">TOP SETTER</span><Avatar initials={computed.topSetter?initials(computed.topSetter.player.full_name):"—"} color="#7157ff"/><div className="leader-name"><strong>{computed.topSetter?`#${computed.topSetter.player.jersey_number} ${computed.topSetter.player.full_name}`:"Chưa có dữ liệu"}</strong><small>{computed.topSetter?(positionLabels[computed.topSetter.player.position]??computed.topSetter.player.position):"setter_match_stats trống"}</small></div><div className="leader-value"><b>{computed.topSetter?`${computed.topSetter.setAccuracy.toFixed(1)}%`:"—"}</b><span>accuracy</span></div><Progress value={computed.topSetter?.setAccuracy??0}/><small>{computed.topSetter?`${computed.topSetter.assists} assists · ${computed.topSetter.setErrors} set errors`:"Chưa có thống kê chuyền 2"}</small></article></section>
    <section className="quick-stats"><div><small>KILLS</small><b>{computed.hasGeneral?computed.totals.kills:"—"}</b></div><div><small>ACES</small><b>{computed.hasGeneral?computed.totals.aces:"—"}</b></div><div><small>BLOCKS</small><b>{computed.hasGeneral?computed.totals.blocks:"—"}</b></div><div><small>ERRORS</small><b>{computed.hasGeneral||data.setterStats.length?computed.totals.errors:"—"}</b></div></section>
  </div></AppShell>;
}
