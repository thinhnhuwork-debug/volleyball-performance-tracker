"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../../components/app-shell";
import { useAuth } from "../../../components/auth-provider";
import { PageHeader, Progress } from "../../../components/ui";
import { createBrowserClient } from "../../../lib/supabase/client";
import { MatchFormModal, matchToForm, type MatchFormPayload, type MatchPlayerOption } from "../../../components/match-form-modal";

type Match={id:string;team_id:string;played_at:string;competition:string|null;venue:string|null;home_team_name:string;away_team_name:string;is_home:boolean;best_of:number;home_sets:number;away_sets:number;status:"scheduled"|"in_progress"|"completed"|"cancelled";notes:string|null};
type MatchSet={id:string;set_number:number;home_score:number;away_score:number};
type MatchPlayer={player_id:string;starter:boolean;sets_played:number};
type Player={id:string;full_name:string;jersey_number:number;position:string;is_active:boolean};
type GeneralStat={id:string;player_id:string;serve_attempts:number;aces:number;serve_errors:number;attack_attempts:number;kills:number;attack_errors:number;solo_blocks:number;block_assists:number;digs:number;dig_errors:number;reception_attempts:number;reception_errors:number};
type SetterStat={id:string;player_id:string;total_touches:number;perfect_sets:number;playable_sets:number;bad_sets:number;set_errors:number;assists:number};
type PageData={match:Match;sets:MatchSet[];matchPlayers:MatchPlayer[];players:Player[];generalStats:GeneralStat[];setterStats:SetterStat[]};

const statusLabels:Record<Match["status"],string>={scheduled:"Sắp diễn ra / Scheduled",in_progress:"Đang thi đấu / In progress",completed:"Đã kết thúc / Completed",cancelled:"Đã hủy / Cancelled"};
const positionLabels:Record<string,string>={setter:"Chuyền 2",outside_hitter:"Chủ công",opposite:"Đối chuyền",middle_blocker:"Phụ công",libero:"Libero",defensive_specialist:"Phòng thủ"};
const formatDate=(value:string)=>new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
const percentage=(value:number,total:number)=>total>0?value/total*100:0;

export default function MatchPage(){
  const params=useParams<{id:string}>();
  const matchId=Array.isArray(params.id)?params.id[0]:params.id;
  const {session}=useAuth();
  const userId=session?.user.id;
  const [data,setData]=useState<PageData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notFound,setNotFound]=useState(false);
  const [requestId,setRequestId]=useState(0);
  const [showEdit,setShowEdit]=useState(false);
  const [success,setSuccess]=useState("");

  useEffect(()=>{
    if(!userId||!matchId)return;
    const currentUserId=userId,currentMatchId=matchId;
    let cancelled=false;
    async function load(){
      const supabase=createBrowserClient();
      if(!supabase){if(!cancelled){setError("Supabase chưa được cấu hình cho môi trường này.");setLoading(false)}return}
      const {data:membershipData,error:membershipError}=await supabase.from("team_members").select("team_id").eq("user_id",currentUserId).order("created_at",{ascending:true}).limit(1).maybeSingle();
      if(cancelled)return;
      if(membershipError){setError(`Không thể đọc team_members: ${membershipError.message}`);setLoading(false);return}
      const membership=membershipData as {team_id:string}|null;
      if(!membership){setError("Tài khoản hiện tại chưa thuộc đội nào. Hãy kiểm tra team_members và RLS.");setLoading(false);return}

      const {data:matchData,error:matchError}=await supabase.from("matches").select("id, team_id, played_at, competition, venue, home_team_name, away_team_name, is_home, best_of, home_sets, away_sets, status, notes").eq("id",currentMatchId).eq("team_id",membership.team_id).maybeSingle();
      if(cancelled)return;
      if(matchError){setError(`Không thể đọc matches: ${matchError.message}`);setLoading(false);return}
      if(!matchData){setNotFound(true);setLoading(false);return}
      const match=matchData as Match;

      const [{data:setsData,error:setsError},{data:matchPlayersData,error:matchPlayersError},{data:playersData,error:playersError},{data:generalData,error:generalError},{data:setterData,error:setterError}]=await Promise.all([
        supabase.from("match_sets").select("id, set_number, home_score, away_score").eq("match_id",match.id).order("set_number"),
        supabase.from("match_players").select("player_id, starter, sets_played").eq("match_id",match.id),
        supabase.from("players").select("id, full_name, jersey_number, position, is_active").eq("team_id",membership.team_id).order("jersey_number"),
        supabase.from("player_match_stats").select("id, player_id, serve_attempts, aces, serve_errors, attack_attempts, kills, attack_errors, solo_blocks, block_assists, digs, dig_errors, reception_attempts, reception_errors").eq("match_id",match.id),
        supabase.from("setter_match_stats").select("id, player_id, total_touches, perfect_sets, playable_sets, bad_sets, set_errors, assists").eq("match_id",match.id),
      ]);
      if(cancelled)return;
      const queryError=setsError??matchPlayersError??playersError??generalError??setterError;
      if(queryError){setError(`Không thể đọc chi tiết trận đấu: ${queryError.message}`);setLoading(false);return}
      setData({match,sets:(setsData??[]) as MatchSet[],matchPlayers:(matchPlayersData??[]) as MatchPlayer[],players:(playersData??[]) as Player[],generalStats:(generalData??[]) as GeneralStat[],setterStats:(setterData??[]) as SetterStat[]});setError("");setNotFound(false);setLoading(false);
    }
    void load();return()=>{cancelled=true};
  },[matchId,requestId,userId]);

  const computed=useMemo(()=>{
    if(!data)return null;
    const players=new Map(data.players.map(player=>[player.id,player]));
    const totals={kills:data.generalStats.reduce((sum,stat)=>sum+stat.kills,0),aces:data.generalStats.reduce((sum,stat)=>sum+stat.aces,0),blocks:data.generalStats.reduce((sum,stat)=>sum+stat.solo_blocks+stat.block_assists,0),digs:data.generalStats.reduce((sum,stat)=>sum+stat.digs,0),assists:data.setterStats.reduce((sum,stat)=>sum+stat.assists,0),errors:data.generalStats.reduce((sum,stat)=>sum+stat.serve_errors+stat.attack_errors+stat.dig_errors+stat.reception_errors,0)+data.setterStats.reduce((sum,stat)=>sum+stat.set_errors,0)};
    const general=data.generalStats.map(stat=>({stat,player:players.get(stat.player_id),points:stat.kills+stat.aces+stat.solo_blocks+stat.block_assists,killRate:percentage(stat.kills,stat.attack_attempts)}));
    const setters=data.setterStats.map(stat=>{const attempts=stat.perfect_sets+stat.playable_sets+stat.bad_sets+stat.set_errors;return {stat,player:players.get(stat.player_id),accuracy:percentage(stat.perfect_sets+stat.playable_sets,attempts)}});
    return {players,totals,topScorer:[...general].sort((a,b)=>b.points-a.points)[0],topAttacker:[...general].filter(item=>item.stat.attack_attempts>0).sort((a,b)=>b.killRate-a.killRate)[0],topDefender:[...general].sort((a,b)=>b.stat.digs-a.stat.digs)[0],topSetter:[...setters].sort((a,b)=>b.accuracy-a.accuracy)[0]};
  },[data]);

  function retry(){setLoading(true);setError("");setNotFound(false);setRequestId(value=>value+1)}
  async function updateMatch(payload:MatchFormPayload){const supabase=createBrowserClient();if(!supabase||!data)return "Không thể xác định Supabase hoặc trận hiện tại.";const teamId=data.match.team_id;const {data:verified,error:verifyError}=await supabase.from("matches").select("id").eq("id",data.match.id).eq("team_id",teamId).maybeSingle();if(verifyError||!verified)return `Không thể xác minh trận thuộc đội hiện tại: ${verifyError?.message??"Không tìm thấy trận."}`;const {error:updateError}=await supabase.from("matches").update({played_at:new Date(payload.match.played_at).toISOString(),competition:payload.match.competition||null,venue:payload.match.venue||null,home_team_name:payload.match.home_team_name,away_team_name:payload.match.away_team_name,is_home:payload.match.is_home,best_of:payload.match.best_of,status:payload.match.status,notes:payload.match.notes||null,updated_at:new Date().toISOString()} as never).eq("id",data.match.id).eq("team_id",teamId);if(updateError)return `Không thể cập nhật trận: ${updateError.message}`;if(payload.sets.length){const rows=payload.sets.map(set=>({match_id:data.match.id,set_number:set.set_number,home_score:set.home_score,away_score:set.away_score}));const {error:setError}=await supabase.from("match_sets").upsert(rows as never,{onConflict:"match_id,set_number",defaultToNull:false});if(setError)return `Thông tin trận đã lưu; tỷ số từng set thất bại: ${setError.message}` }if(payload.roster.length){const activeIds=new Set(data.players.filter(player=>player.is_active).map(player=>player.id));const existingIds=new Set(data.matchPlayers.map(player=>player.player_id));const rows=payload.roster.filter(item=>activeIds.has(item.player_id)||existingIds.has(item.player_id)).map(item=>({match_id:data.match.id,player_id:item.player_id,starter:item.starter,sets_played:item.sets_played}));const {error:rosterError}=await supabase.from("match_players").upsert(rows as never,{onConflict:"match_id,player_id"});if(rosterError)return `Thông tin trận và set đã lưu; roster thất bại: ${rosterError.message}` }const {error:scoreError}=await supabase.from("matches").update({home_sets:payload.home_sets,away_sets:payload.away_sets} as never).eq("id",data.match.id).eq("team_id",teamId);if(scoreError)return `Dữ liệu chi tiết đã lưu; cập nhật tỷ số trận thất bại: ${scoreError.message}`;setShowEdit(false);setSuccess("Đã cập nhật trận, tỷ số set và roster.");setLoading(true);setRequestId(current=>current+1);return null}
  if(loading)return <AppShell><div className="page"><section className="panel auth-loading" style={{minHeight:360}} aria-live="polite"><span className="auth-spinner"/><p>Đang tải chi tiết trận đấu từ Supabase…</p></section></div></AppShell>;
  if(error)return <AppShell><div className="page"><PageHeader title="Chi tiết trận đấu" description="Không thể tải dữ liệu."/><section className="panel"><div className="login-error" role="alert"><strong>Lỗi tải trận đấu</strong><br/>{error}</div><button className="secondary-btn" onClick={retry} style={{marginTop:14}}>Thử lại / Retry</button></section></div></AppShell>;
  if(notFound||!data||!computed)return <AppShell><div className="page"><PageHeader title="Không tìm thấy trận đấu" description="Trận không tồn tại hoặc không thuộc đội mà bạn có quyền truy cập."/><section className="panel" style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Không có dữ liệu trận đấu cho UUID này.</section></div></AppShell>;

  const {match}=data,opponent=match.is_home?match.away_team_name:match.home_team_name;
  const statRows=[{label:"Kills / Điểm tấn công",value:computed.totals.kills},{label:"Aces / Phát ăn điểm",value:computed.totals.aces},{label:"Blocks / Chắn bóng",value:computed.totals.blocks},{label:"Digs / Cứu bóng",value:computed.totals.digs},{label:"Assists / Kiến tạo",value:computed.totals.assists},{label:"Errors / Lỗi",value:computed.totals.errors}];
  const maxStat=Math.max(1,...statRows.map(row=>row.value));
  const leaders=[
    {label:"Top scorer",player:computed.topScorer?.player,value:computed.topScorer?`${computed.topScorer.points} điểm`:"—"},
    {label:"Top attacker",player:computed.topAttacker?.player,value:computed.topAttacker?`${computed.topAttacker.killRate.toFixed(1)}% kill`:"—"},
    {label:"Top setter",player:computed.topSetter?.player,value:computed.topSetter?`${computed.topSetter.accuracy.toFixed(1)}% accuracy`:"—"},
    {label:"Top defender",player:computed.topDefender?.player,value:computed.topDefender?`${computed.topDefender.stat.digs} digs`:"—"},
  ];

  return <AppShell><div className="page">
    <PageHeader eyebrow={`${match.competition??"Chưa có giải đấu"} · ${formatDate(match.played_at)}`} title="Match Dashboard" description={`${match.venue??"Chưa có địa điểm"} · ${statusLabels[match.status]}`} action={<div style={{display:"flex",gap:8}}><button className="secondary-btn" onClick={()=>{setSuccess("");setShowEdit(true)}}>Chỉnh sửa trận đấu / Edit Match</button><Link href="/stats" className="primary-btn">Nhập thống kê</Link></div>}/>
    {success&&<div className="notice" style={{background:"#e5f7f1",color:"#167d62"}}>{success}</div>}
    <article className="panel" style={{textAlign:"center",padding:28}}><div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:20}}><div><small>{match.is_home?"ĐỘI NHÀ / HOME":"ĐỘI KHÁCH / AWAY"}</small><h2 style={{fontSize:24}}>{match.is_home?match.home_team_name:match.away_team_name}</h2><b style={{fontSize:44}}>{match.is_home?match.home_sets:match.away_sets}</b></div><span style={{color:"var(--muted)"}}>—</span><div><small>{match.is_home?"ĐỘI KHÁCH / AWAY":"ĐỘI NHÀ / HOME"}</small><h2 style={{fontSize:24}}>{opponent}</h2><b style={{fontSize:44}}>{match.is_home?match.away_sets:match.home_sets}</b></div></div><div style={{marginTop:20,color:"var(--muted)",fontSize:12}}>{data.sets.length?data.sets.map(set=><span key={set.id} style={{padding:"7px 10px",background:"#f5f4fa",borderRadius:7,margin:3}}>S{set.set_number} {set.home_score}–{set.away_score}</span>):<span>Chưa có tỷ số từng set / No match_sets data</span>}</div></article>
    <section className="two-col" style={{marginTop:14}}><article className="panel"><div className="panel-head"><div><h2>Thống kê đội / Team statistics</h2><p>Dữ liệu cầu thủ của trận gặp {opponent}</p></div></div>{data.generalStats.length||data.setterStats.length?statRows.map(row=><div key={row.label} style={{marginTop:15}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span>{row.label}</span><b>{row.value}</b></div><Progress value={row.value/maxStat*100}/></div>):<EmptyState text="Chưa có player_match_stats hoặc setter_match_stats cho trận này."/>}</article><article className="panel"><div className="panel-head"><div><h2>Match leaders</h2><p>Cầu thủ nổi bật từ thống kê trận</p></div></div>{data.generalStats.length||data.setterStats.length?leaders.map(item=><div className="match-row" key={item.label}><span className="result w">★</span><div><small>{item.label}</small><strong>{item.player?`#${item.player.jersey_number} ${item.player.full_name}`:"Chưa có dữ liệu"}</strong></div><b style={{fontSize:12}}>{item.value}</b></div>):<EmptyState text="Chưa có thống kê để xác định cầu thủ nổi bật."/>}</article></section>
    <section className="panel" style={{marginTop:14}}><div className="panel-head"><div><h2>Đội hình trận đấu / Match roster</h2><p>Danh sách từ match_players</p></div></div>{data.matchPlayers.length?<table className="data-table" style={{marginTop:14}}><thead><tr><th>CẦU THỦ / PLAYER</th><th>VỊ TRÍ / POSITION</th><th>ĐỘI HÌNH / STARTER</th><th>HIỆP THI ĐẤU / SETS PLAYED</th></tr></thead><tbody>{data.matchPlayers.map(item=>{const player=computed.players.get(item.player_id);return <tr key={item.player_id}><td><b>{player?`#${player.jersey_number} ${player.full_name}`:item.player_id}</b></td><td>{player?(positionLabels[player.position]??player.position):"—"}</td><td>{item.starter?"Xuất phát / Starter":"Dự bị / Substitute"}</td><td>{item.sets_played}</td></tr>})}</tbody></table>:<EmptyState text="Chưa có dữ liệu match_players cho trận này."/>}</section>
    <section className="panel" style={{marginTop:14}}><div className="panel-head"><div><h2>Thống kê cầu thủ / Player statistics</h2><p>player_match_stats và setter_match_stats của đúng trận đấu</p></div></div>{data.generalStats.length?<table className="data-table" style={{marginTop:14}}><thead><tr><th>CẦU THỦ / PLAYER</th><th>SERVE</th><th>ACES</th><th>ATTACKS</th><th>KILLS</th><th>ATTACK ERRORS</th><th>BLOCKS</th><th>DIGS</th><th>RECEPTIONS</th></tr></thead><tbody>{data.generalStats.map(stat=>{const player=computed.players.get(stat.player_id);return <tr key={stat.id}><td><b>{player?`#${player.jersey_number} ${player.full_name}`:stat.player_id}</b></td><td>{stat.serve_attempts}</td><td>{stat.aces}</td><td>{stat.attack_attempts}</td><td>{stat.kills}</td><td>{stat.attack_errors}</td><td>{stat.solo_blocks+stat.block_assists}</td><td>{stat.digs}</td><td>{stat.reception_attempts}</td></tr>})}</tbody></table>:<EmptyState text="Chưa có player_match_stats cho trận này."/>}
      {data.setterStats.length?<table className="data-table" style={{marginTop:14}}><thead><tr><th>SETTER</th><th>TOUCHES</th><th>PERFECT</th><th>PLAYABLE</th><th>BAD</th><th>SET ERRORS</th><th>ASSISTS</th><th>ACCURACY</th></tr></thead><tbody>{data.setterStats.map(stat=>{const player=computed.players.get(stat.player_id),attempts=stat.perfect_sets+stat.playable_sets+stat.bad_sets+stat.set_errors;return <tr key={stat.id}><td><b>{player?`#${player.jersey_number} ${player.full_name}`:stat.player_id}</b></td><td>{stat.total_touches}</td><td>{stat.perfect_sets}</td><td>{stat.playable_sets}</td><td>{stat.bad_sets}</td><td>{stat.set_errors}</td><td>{stat.assists}</td><td><b>{attempts?`${percentage(stat.perfect_sets+stat.playable_sets,attempts).toFixed(1)}%`:"—"}</b></td></tr>})}</tbody></table>:<EmptyState text="Chưa có setter_match_stats cho trận này."/>}</section>
    {showEdit&&<MatchFormModal mode="edit" teamName={match.is_home?match.home_team_name:match.away_team_name} players={data.players.filter(player=>player.is_active).map(player=>player as MatchPlayerOption)} initialMatch={matchToForm(match)} initialSets={data.sets} initialRoster={data.matchPlayers.map(item=>({...item,persisted:true}))} onClose={()=>setShowEdit(false)} onSave={updateMatch}/>}
  </div></AppShell>;
}

function EmptyState({text}:{text:string}){return <div style={{padding:30,textAlign:"center",color:"var(--muted)",fontSize:11}}>{text}</div>}
