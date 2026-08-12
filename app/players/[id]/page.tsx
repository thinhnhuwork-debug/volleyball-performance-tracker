"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../../components/app-shell";
import { useAuth } from "../../../components/auth-provider";
import { Avatar, PageHeader } from "../../../components/ui";
import { SetterCourtMap, type CourtZoneStat } from "../../../components/volleyball/setter-court-map";
import { createBrowserClient } from "../../../lib/supabase/client";
import { PlayerFormModal, type PlayerFormValue, type PlayerPosition } from "../../../components/player-form-modal";

type Player={id:string;team_id:string;full_name:string;jersey_number:number;position:string;avatar_url:string|null;height_cm:number|null;is_active:boolean};
type Match={id:string;played_at:string;home_team_name:string;away_team_name:string;is_home:boolean;competition:string|null};
type GeneralStat={id:string;match_id:string;serve_attempts:number;aces:number;serve_errors:number;attack_attempts:number;kills:number;attack_errors:number;solo_blocks:number;block_assists:number;digs:number;dig_errors:number;reception_attempts:number;perfect_receptions:number;good_receptions:number;poor_receptions:number;reception_errors:number};
type SetterStat={id:string;match_id:string;total_touches:number;perfect_sets:number;playable_sets:number;bad_sets:number;set_errors:number;assists:number};
type Distribution={setter_stats_id:string;zone:CourtZoneStat["zone"];set_attempts:number;kills:number;attack_errors:number};
type PageData={player:Player;matches:Match[];generalStats:GeneralStat[];setterStats:SetterStat[];distribution:Distribution[]};
type ComputedData={matchById:Map<string,Match>;orderedSetter:SetterStat[];setterAttempts:number;setterTotals:{touches:number;perfect:number;playable:number;bad:number;errors:number;assists:number};generalTotals:{serveAttempts:number;aces:number;serveErrors:number;attackAttempts:number;kills:number;attackErrors:number;blocks:number;digs:number;receptions:number;perfectReceptions:number};zones:CourtZoneStat[]};

const positionLabels:Record<string,string>={setter:"Chuyền 2 / Setter",outside_hitter:"Chủ công / Outside Hitter",opposite:"Đối chuyền / Opposite",middle_blocker:"Phụ công / Middle Blocker",libero:"Libero",defensive_specialist:"Chuyên gia phòng thủ / Defensive Specialist"};
const zoneNames:Record<CourtZoneStat["zone"],string>={P2:"Biên phải",P3:"Phụ công giữa",P4:"Biên trái",P6:"Tấn công hàng sau",OTHER:"Khác / bóng xử lý"};
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).map(part=>part[0]).join("").slice(-2).toUpperCase();
const percentage=(value:number,total:number)=>total>0?value/total*100:0;
const formatPercent=(value:number,total:number)=>total>0?`${percentage(value,total).toFixed(1)}%`:"—";
const formatDate=(value:string)=>new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value));

export default function PlayerPage(){
  const params=useParams<{id:string}>();
  const playerId=Array.isArray(params.id)?params.id[0]:params.id;
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
    if(!userId||!playerId)return;
    const currentUserId=userId,currentPlayerId=playerId;
    let cancelled=false;
    async function load(){
      const supabase=createBrowserClient();
      if(!supabase){if(!cancelled){setError("Supabase chưa được cấu hình cho môi trường này.");setLoading(false)}return}
      const {data:membershipData,error:membershipError}=await supabase.from("team_members").select("team_id").eq("user_id",currentUserId).order("created_at",{ascending:true}).limit(1).maybeSingle();
      if(cancelled)return;
      if(membershipError){setError(`Không thể đọc team_members: ${membershipError.message}`);setLoading(false);return}
      const membership=membershipData as {team_id:string}|null;
      if(!membership){setError("Tài khoản hiện tại chưa thuộc đội nào. Hãy kiểm tra team_members và RLS.");setLoading(false);return}

      const {data:playerData,error:playerError}=await supabase.from("players").select("id, team_id, full_name, jersey_number, position, avatar_url, height_cm, is_active").eq("id",currentPlayerId).eq("team_id",membership.team_id).maybeSingle();
      if(cancelled)return;
      if(playerError){setError(`Không thể đọc players: ${playerError.message}`);setLoading(false);return}
      if(!playerData){setNotFound(true);setLoading(false);return}
      const player=playerData as Player;

      const [{data:matchesData,error:matchesError},{data:generalData,error:generalError},{data:setterData,error:setterError}]=await Promise.all([
        supabase.from("matches").select("id, played_at, home_team_name, away_team_name, is_home, competition").eq("team_id",membership.team_id).order("played_at",{ascending:false}),
        supabase.from("player_match_stats").select("id, match_id, serve_attempts, aces, serve_errors, attack_attempts, kills, attack_errors, solo_blocks, block_assists, digs, dig_errors, reception_attempts, perfect_receptions, good_receptions, poor_receptions, reception_errors").eq("player_id",player.id),
        supabase.from("setter_match_stats").select("id, match_id, total_touches, perfect_sets, playable_sets, bad_sets, set_errors, assists").eq("player_id",player.id),
      ]);
      if(cancelled)return;
      const queryError=matchesError??generalError??setterError;
      if(queryError){setError(`Không thể đọc thống kê cầu thủ: ${queryError.message}`);setLoading(false);return}
      const setterStats=(setterData??[]) as SetterStat[];
      let distribution:Distribution[]=[];
      if(setterStats.length){
        const {data:distributionData,error:distributionError}=await supabase.from("setter_distribution").select("setter_stats_id, zone, set_attempts, kills, attack_errors").in("setter_stats_id",setterStats.map(stat=>stat.id));
        if(cancelled)return;
        if(distributionError){setError(`Không thể đọc setter_distribution: ${distributionError.message}`);setLoading(false);return}
        distribution=(distributionData??[]) as Distribution[];
      }
      setData({player,matches:(matchesData??[]) as Match[],generalStats:(generalData??[]) as GeneralStat[],setterStats,distribution});setError("");setNotFound(false);setLoading(false);
    }
    void load();return()=>{cancelled=true};
  },[playerId,requestId,userId]);

  const computed=useMemo(()=>{
    if(!data)return null;
    const matchById=new Map(data.matches.map(match=>[match.id,match]));
    const orderedSetter=[...data.setterStats].sort((a,b)=>(matchById.get(b.match_id)?.played_at??"").localeCompare(matchById.get(a.match_id)?.played_at??""));
    const setterAttempts=data.setterStats.reduce((sum,stat)=>sum+stat.perfect_sets+stat.playable_sets+stat.bad_sets+stat.set_errors,0);
    const setterTotals={touches:data.setterStats.reduce((sum,stat)=>sum+stat.total_touches,0),perfect:data.setterStats.reduce((sum,stat)=>sum+stat.perfect_sets,0),playable:data.setterStats.reduce((sum,stat)=>sum+stat.playable_sets,0),bad:data.setterStats.reduce((sum,stat)=>sum+stat.bad_sets,0),errors:data.setterStats.reduce((sum,stat)=>sum+stat.set_errors,0),assists:data.setterStats.reduce((sum,stat)=>sum+stat.assists,0)};
    const generalTotals={serveAttempts:data.generalStats.reduce((sum,stat)=>sum+stat.serve_attempts,0),aces:data.generalStats.reduce((sum,stat)=>sum+stat.aces,0),serveErrors:data.generalStats.reduce((sum,stat)=>sum+stat.serve_errors,0),attackAttempts:data.generalStats.reduce((sum,stat)=>sum+stat.attack_attempts,0),kills:data.generalStats.reduce((sum,stat)=>sum+stat.kills,0),attackErrors:data.generalStats.reduce((sum,stat)=>sum+stat.attack_errors,0),blocks:data.generalStats.reduce((sum,stat)=>sum+stat.solo_blocks+stat.block_assists,0),digs:data.generalStats.reduce((sum,stat)=>sum+stat.digs,0),receptions:data.generalStats.reduce((sum,stat)=>sum+stat.reception_attempts,0),perfectReceptions:data.generalStats.reduce((sum,stat)=>sum+stat.perfect_receptions,0)};
    const zones=(Object.keys(zoneNames) as CourtZoneStat["zone"][]).map(zone=>{const rows=data.distribution.filter(row=>row.zone===zone);return {zone,vietnameseName:zoneNames[zone],setAttempts:rows.reduce((sum,row)=>sum+row.set_attempts,0),kills:rows.reduce((sum,row)=>sum+row.kills,0),attackErrors:rows.reduce((sum,row)=>sum+row.attack_errors,0)}});
    return {matchById,orderedSetter,setterAttempts,setterTotals,generalTotals,zones};
  },[data]);

  function retry(){setLoading(true);setError("");setNotFound(false);setRequestId(value=>value+1)}
  async function updatePlayer(value:PlayerFormValue){
    if(!data)return "Không tìm thấy dữ liệu cầu thủ.";const supabase=createBrowserClient();if(!supabase)return "Supabase chưa được cấu hình.";
    const {data:duplicate,error:duplicateError}=await supabase.from("players").select("id").eq("team_id",data.player.team_id).eq("jersey_number",value.jersey_number).neq("id",data.player.id).limit(1).maybeSingle();
    if(duplicateError)return `Không thể kiểm tra số áo: ${duplicateError.message}`;if(duplicate)return `Số áo #${value.jersey_number} đã được sử dụng trong đội.`;
    const {data:updated,error:updateError}=await supabase.from("players").update({...value,updated_at:new Date().toISOString()} as never).eq("id",data.player.id).eq("team_id",data.player.team_id).select("id").maybeSingle();
    if(updateError)return updateError.code==="23505"?`Số áo #${value.jersey_number} đã được sử dụng trong đội.`:`Không thể cập nhật cầu thủ: ${updateError.message}`;if(!updated)return "Cầu thủ không tồn tại hoặc bạn không có quyền chỉnh sửa.";
    setShowEdit(false);setSuccess("Đã cập nhật cầu thủ thành công.");setLoading(true);setRequestId(current=>current+1);return null;
  }
  if(loading)return <AppShell><div className="page"><section className="panel auth-loading" style={{minHeight:360}} aria-live="polite"><span className="auth-spinner"/><p>Đang tải hồ sơ cầu thủ từ Supabase…</p></section></div></AppShell>;
  if(error)return <AppShell><div className="page"><PageHeader title="Hồ sơ cầu thủ" description="Không thể tải dữ liệu."/><section className="panel"><div className="login-error" role="alert"><strong>Lỗi tải cầu thủ</strong><br/>{error}</div><button className="secondary-btn" onClick={retry} style={{marginTop:14}}>Thử lại / Retry</button></section></div></AppShell>;
  if(notFound||!data||!computed)return <AppShell><div className="page"><PageHeader title="Không tìm thấy cầu thủ" description="Cầu thủ không tồn tại hoặc không thuộc đội mà bạn có quyền truy cập."/><section className="panel" style={{textAlign:"center",color:"var(--muted)",padding:40}}>Không có dữ liệu cầu thủ cho UUID này.</section></div></AppShell>;

  const {player}=data,isSetter=player.position==="setter";
  const editInitialValue:PlayerFormValue={full_name:player.full_name,jersey_number:player.jersey_number,position:player.position as PlayerPosition,height_cm:player.height_cm,is_active:player.is_active};
  const matchCount=new Set([...data.generalStats.map(stat=>stat.match_id),...data.setterStats.map(stat=>stat.match_id)]).size;
  return <AppShell><div className="page">
    <PageHeader eyebrow="HIỆU SUẤT CẦU THỦ / PLAYER PERFORMANCE" title={`${player.full_name} #${player.jersey_number}`} description={`${positionLabels[player.position]??player.position} · ${player.height_cm?`${player.height_cm} cm · `:""}${player.is_active?"Đang hoạt động / Active":"Ngừng hoạt động / Inactive"}`} action={<button className="secondary-btn" onClick={()=>{setSuccess("");setShowEdit(true)}}>Chỉnh sửa / Edit</button>}/>
    {success&&<div className="notice" style={{background:"#e5f7f1",color:"#167d62"}}>{success}</div>}
    <div className="panel" style={{marginBottom:14}}><div className="player-cell">{player.avatar_url?<span className="player-avatar lg" style={{backgroundImage:`url(${player.avatar_url})`,backgroundSize:"cover",backgroundPosition:"center"}}/>:<Avatar initials={initials(player.full_name)} color="#7157ff" size="lg"/>}<div><span className="position-tag">{positionLabels[player.position]??player.position}</span><h2 style={{margin:"8px 0 4px"}}>{player.full_name}</h2><small style={{color:"var(--muted)"}}>{matchCount} trận có thống kê · UUID: {player.id}</small></div></div></div>

    {isSetter?<>
      <section className="stat-grid"><div className="stat-box"><small>TỔNG LẦN CHẠM / TOTAL TOUCHES</small><b>{data.setterStats.length?computed.setterTotals.touches:"—"}</b></div><div className="stat-box"><small>ĐỘ CHÍNH XÁC / SETTING ACCURACY</small><b>{formatPercent(computed.setterTotals.perfect+computed.setterTotals.playable,computed.setterAttempts)}</b></div><div className="stat-box"><small>CHUYỀN HOÀN HẢO / PERFECT SET</small><b>{formatPercent(computed.setterTotals.perfect,computed.setterAttempts)}</b></div><div className="stat-box"><small>KIẾN TẠO / ASSISTS</small><b>{data.setterStats.length?computed.setterTotals.assists:"—"}</b></div><div className="stat-box"><small>CHUYỀN XẤU / BAD SET</small><b>{formatPercent(computed.setterTotals.bad,computed.setterAttempts)}</b></div><div className="stat-box"><small>LỖI CHUYỀN / SET ERROR</small><b>{formatPercent(computed.setterTotals.errors,computed.setterAttempts)}</b></div></section>
      <article className="panel" style={{marginTop:14}}><div className="panel-head"><div><h2>Sơ đồ phân bố đường chuyền / Setter Distribution Map</h2><p>Tỷ lệ ghi điểm sau đường chuyền tại từng vị trí</p></div><span className="position-tag">{data.distribution.reduce((sum,row)=>sum+row.set_attempts,0)} ĐƯỜNG CHUYỀN / SETS</span></div>{data.distribution.length?<SetterCourtMap data={computed.zones} setterName={player.full_name} setterNumber={player.jersey_number}/>:<div style={{padding:38,textAlign:"center",color:"var(--muted)"}}>Chưa có dữ liệu setter_distribution.</div>}</article>
      <section className="two-col" style={{marginTop:14}}><article className="panel"><div className="panel-head"><div><h2>Xu hướng hiệu suất chuyền 2 / Setter Performance Trend</h2><p>Độ chính xác chuyền qua các trận có dữ liệu</p></div></div>{computed.orderedSetter.length?<div className="trend-chart">{computed.orderedSetter.slice(0,5).reverse().map(stat=>{const attempts=stat.perfect_sets+stat.playable_sets+stat.bad_sets+stat.set_errors,accuracy=percentage(stat.perfect_sets+stat.playable_sets,attempts),match=computed.matchById.get(stat.match_id);return <div className="trend-col" key={stat.id}><i style={{height:`${accuracy*1.8}px`}}/><b>{accuracy.toFixed(1)}%</b><div>{match?opponentName(match):"—"}</div></div>})}</div>:<div style={{padding:38,textAlign:"center",color:"var(--muted)"}}>Chưa có setter_match_stats.</div>}</article><MetricGuide/></section>
      <article className="panel" style={{marginTop:14}}><div className="panel-head"><div><h2>Lịch sử trận đấu / Match History</h2><p>Thống kê chuyền hai thật từ Supabase</p></div></div>{computed.orderedSetter.length?<table className="data-table" style={{marginTop:14}}><thead><tr><th>TRẬN / MATCH</th><th>CHẠM / TOUCHES</th><th>CHUYỀN / ATTEMPTS</th><th>PERFECT</th><th>PLAYABLE</th><th>BAD</th><th>ERROR</th><th>ASSISTS</th><th>ACCURACY</th></tr></thead><tbody>{computed.orderedSetter.map(stat=>{const match=computed.matchById.get(stat.match_id),attempts=stat.perfect_sets+stat.playable_sets+stat.bad_sets+stat.set_errors;return <tr key={stat.id}><td><b>{match?`${formatDate(match.played_at)} · vs ${opponentName(match)}`:stat.match_id}</b></td><td>{stat.total_touches}</td><td>{attempts}</td><td>{stat.perfect_sets}</td><td>{stat.playable_sets}</td><td>{stat.bad_sets}</td><td>{stat.set_errors}</td><td>{stat.assists}</td><td><b>{formatPercent(stat.perfect_sets+stat.playable_sets,attempts)}</b></td></tr>})}</tbody></table>:<EmptyStats/>}</article>
    </>:<GeneralPlayerStats data={data} computed={computed}/>}
    {showEdit&&<PlayerFormModal mode="edit" initialValue={editInitialValue} onClose={()=>setShowEdit(false)} onSave={updatePlayer}/>}
  </div></AppShell>;
}

function opponentName(match:Match){return match.is_home?match.away_team_name:match.home_team_name}
function EmptyStats(){return <div style={{padding:38,textAlign:"center",color:"var(--muted)"}}>Chưa có dữ liệu thống kê cho cầu thủ này.</div>}
function MetricGuide(){return <article className="panel"><div className="panel-head"><div><h2>Cách đọc chỉ số / Metric Guide</h2><p>Chú thích song ngữ dành cho người nhập liệu</p></div></div>{[["Perfect Set","Chuyền hoàn hảo — đúng vị trí và nhịp"],["Playable Set","Chuyền có thể tấn công — chưa hoàn hảo nhưng xử lý được"],["Bad Set","Chuyền xấu — khiến cầu thủ khó tấn công"],["Set Error","Lỗi chuyền trực tiếp làm mất điểm"],["Kill Rate","Tỷ lệ ghi điểm sau đường chuyền"]].map(item=><div className="match-row" key={item[0]}><span className="result w">?</span><div><strong>{item[0]}</strong><small>{item[1]}</small></div></div>)}</article>}
function GeneralPlayerStats({data,computed}:{data:PageData;computed:ComputedData}){const totals=computed.generalTotals;return <><section className="stat-grid"><div className="stat-box"><small>TRẬN CÓ THỐNG KÊ / MATCHES</small><b>{data.generalStats.length}</b></div><div className="stat-box"><small>GHI ĐIỂM / KILLS</small><b>{data.generalStats.length?totals.kills:"—"}</b></div><div className="stat-box"><small>TỶ LỆ GHI ĐIỂM / KILL RATE</small><b>{formatPercent(totals.kills,totals.attackAttempts)}</b></div><div className="stat-box"><small>PHÁT ĂN ĐIỂM / ACES</small><b>{data.generalStats.length?totals.aces:"—"}</b></div><div className="stat-box"><small>CHẮN BÓNG / BLOCKS</small><b>{data.generalStats.length?totals.blocks:"—"}</b></div><div className="stat-box"><small>CỨU BÓNG / DIGS</small><b>{data.generalStats.length?totals.digs:"—"}</b></div></section><article className="panel" style={{marginTop:14}}><div className="panel-head"><div><h2>Lịch sử trận đấu / Match History</h2><p>Thống kê tổng quát thật từ Supabase</p></div></div>{data.generalStats.length?<table className="data-table" style={{marginTop:14}}><thead><tr><th>TRẬN / MATCH</th><th>SERVE</th><th>ACES</th><th>ATTACKS</th><th>KILLS</th><th>ATTACK ERRORS</th><th>BLOCKS</th><th>DIGS</th><th>RECEPTIONS</th></tr></thead><tbody>{data.generalStats.map(stat=>{const match=computed.matchById.get(stat.match_id);return <tr key={stat.id}><td><b>{match?`${formatDate(match.played_at)} · vs ${opponentName(match)}`:stat.match_id}</b></td><td>{stat.serve_attempts}</td><td>{stat.aces}</td><td>{stat.attack_attempts}</td><td>{stat.kills}</td><td>{stat.attack_errors}</td><td>{stat.solo_blocks+stat.block_assists}</td><td>{stat.digs}</td><td>{stat.reception_attempts}</td></tr>})}</tbody></table>:<EmptyStats/>}</article></>}
