"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { useAuth } from "../../components/auth-provider";
import { PageHeader } from "../../components/ui";
import { createBrowserClient } from "../../lib/supabase/client";

type Match={id:string;played_at:string;home_team_name:string;away_team_name:string;is_home:boolean;status:string};
type Player={id:string;full_name:string;jersey_number:number;position:string;is_active:boolean};
type GeneralStats={serve_attempts:number;aces:number;serve_errors:number;attack_attempts:number;kills:number;attack_errors:number;solo_blocks:number;block_assists:number;digs:number;dig_errors:number;reception_attempts:number;perfect_receptions:number;good_receptions:number;poor_receptions:number;reception_errors:number};
type SetterStats={total_touches:number;perfect_sets:number;playable_sets:number;bad_sets:number;set_errors:number;assists:number};
type Zone="P2"|"P3"|"P4"|"P6"|"OTHER";
type ZoneStats={set_attempts:number;kills:number;attack_errors:number};
type Distribution=Record<Zone,ZoneStats>;

const emptyGeneral:GeneralStats={serve_attempts:0,aces:0,serve_errors:0,attack_attempts:0,kills:0,attack_errors:0,solo_blocks:0,block_assists:0,digs:0,dig_errors:0,reception_attempts:0,perfect_receptions:0,good_receptions:0,poor_receptions:0,reception_errors:0};
const emptySetter:SetterStats={total_touches:0,perfect_sets:0,playable_sets:0,bad_sets:0,set_errors:0,assists:0};
const generalNumericFields=Object.keys(emptyGeneral) as Array<keyof GeneralStats>;
const setterNumericFields=Object.keys(emptySetter) as Array<keyof SetterStats>;
const zoneNumericFields:Array<keyof ZoneStats>=["set_attempts","kills","attack_errors"];
const zones:Zone[]=["P2","P3","P4","P6","OTHER"];
const emptyDistribution=():Distribution=>({P2:{set_attempts:0,kills:0,attack_errors:0},P3:{set_attempts:0,kills:0,attack_errors:0},P4:{set_attempts:0,kills:0,attack_errors:0},P6:{set_attempts:0,kills:0,attack_errors:0},OTHER:{set_attempts:0,kills:0,attack_errors:0}});
const positionLabels:Record<string,string>={setter:"Chuyền 2 / Setter",outside_hitter:"Chủ công / Outside Hitter",opposite:"Đối chuyền / Opposite",middle_blocker:"Phụ công / Middle Blocker",libero:"Libero",defensive_specialist:"Chuyên gia phòng thủ / Defensive Specialist"};
const zoneLabels:Record<Zone,string>={P2:"Vị trí 2 · Biên phải",P3:"Vị trí 3 · Giữa",P4:"Vị trí 4 · Biên trái",P6:"Vị trí 6 · Hàng sau",OTHER:"Khác / Other"};
const formatDate=(value:string)=>new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value));
const percent=(value:number,total:number)=>total?`${(value/total*100).toFixed(1)}%`:"0.0%";
const normalizeNumericInput=(value:string)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0};

async function fetchExisting(supabase:SupabaseClient,matchId:string,playerId:string,isSetter:boolean){
  const [{data:generalData,error:generalError},{data:setterData,error:setterError}]=await Promise.all([
    supabase.from("player_match_stats").select("serve_attempts, aces, serve_errors, attack_attempts, kills, attack_errors, solo_blocks, block_assists, digs, dig_errors, reception_attempts, perfect_receptions, good_receptions, poor_receptions, reception_errors").eq("match_id",matchId).eq("player_id",playerId).maybeSingle(),
    isSetter?supabase.from("setter_match_stats").select("id, total_touches, perfect_sets, playable_sets, bad_sets, set_errors, assists").eq("match_id",matchId).eq("player_id",playerId).maybeSingle():Promise.resolve({data:null,error:null}),
  ]);
  if(generalError)throw new Error(`Không thể đọc player_match_stats: ${generalError.message}`);
  if(setterError)throw new Error(`Không thể đọc setter_match_stats: ${setterError.message}`);
  let distribution=emptyDistribution();
  const setterRow=setterData as (SetterStats&{id:string})|null;
  if(setterRow){
    const {data:distributionData,error:distributionError}=await supabase.from("setter_distribution").select("zone, set_attempts, kills, attack_errors").eq("setter_stats_id",setterRow.id);
    if(distributionError)throw new Error(`Không thể đọc setter_distribution: ${distributionError.message}`);
    for(const row of (distributionData??[]) as Array<ZoneStats&{zone:Zone}>){distribution={...distribution,[row.zone]:{set_attempts:row.set_attempts,kills:row.kills,attack_errors:row.attack_errors}}}
  }
  const loadedSetter:SetterStats=setterRow?{total_touches:Number(setterRow.total_touches),perfect_sets:Number(setterRow.perfect_sets),playable_sets:Number(setterRow.playable_sets),bad_sets:Number(setterRow.bad_sets),set_errors:Number(setterRow.set_errors),assists:Number(setterRow.assists)}:{...emptySetter};
  return {general:{...emptyGeneral,...(generalData as Partial<GeneralStats>|null)},setter:loadedSetter,distribution};
}

const Num=({label,value,set,disabled=false}:{label:string;value:number;set:(value:number)=>void;disabled?:boolean})=><div className="field"><label>{label}</label><input type="number" min="0" step="1" value={value} disabled={disabled} onChange={event=>set(normalizeNumericInput(event.target.value))}/></div>;

export default function StatsPage(){
  const {session}=useAuth();
  const userId=session?.user.id;
  const [teamId,setTeamId]=useState("");
  const [matches,setMatches]=useState<Match[]>([]);
  const [teamPlayers,setTeamPlayers]=useState<Player[]>([]);
  const [eligiblePlayers,setEligiblePlayers]=useState<Player[]>([]);
  const [matchId,setMatchId]=useState("");
  const [playerId,setPlayerId]=useState("");
  const [general,setGeneral]=useState<GeneralStats>({...emptyGeneral});
  const [setter,setSetter]=useState<SetterStats>({...emptySetter});
  const [distribution,setDistribution]=useState<Distribution>(emptyDistribution);
  const [loading,setLoading]=useState(true);
  const [loadingForm,setLoadingForm]=useState(false);
  const [saving,setSaving]=useState(false);
  const [pageError,setPageError]=useState("");
  const [formError,setFormError]=useState("");
  const [success,setSuccess]=useState("");

  const selectedMatch=matches.find(match=>match.id===matchId);
  const selectedPlayer=eligiblePlayers.find(player=>player.id===playerId);
  const isSetter=selectedPlayer?.position==="setter";
  const setterAttempts=setter.perfect_sets+setter.playable_sets+setter.bad_sets+setter.set_errors;

  useEffect(()=>{
    if(!userId)return;
    const currentUserId=userId;
    let cancelled=false;
    async function loadBase(){
      const supabase=createBrowserClient();
      if(!supabase){if(!cancelled){setPageError("Supabase chưa được cấu hình cho môi trường này.");setLoading(false)}return}
      const {data:membershipData,error:membershipError}=await supabase.from("team_members").select("team_id").eq("user_id",currentUserId).order("created_at",{ascending:true}).limit(1).maybeSingle();
      if(cancelled)return;
      if(membershipError){setPageError(`Không thể đọc team_members: ${membershipError.message}`);setLoading(false);return}
      const membership=membershipData as {team_id:string}|null;
      if(!membership){setPageError("Tài khoản hiện tại chưa thuộc đội nào.");setLoading(false);return}
      const [{data:matchesData,error:matchesError},{data:playersData,error:playersError}]=await Promise.all([
        supabase.from("matches").select("id, played_at, home_team_name, away_team_name, is_home, status").eq("team_id",membership.team_id).order("played_at",{ascending:false}),
        supabase.from("players").select("id, full_name, jersey_number, position, is_active").eq("team_id",membership.team_id).eq("is_active",true).order("jersey_number"),
      ]);
      if(cancelled)return;
      const queryError=matchesError??playersError;
      if(queryError){setPageError(`Không thể đọc trận/cầu thủ: ${queryError.message}`);setLoading(false);return}
      const loadedMatches=(matchesData??[]) as Match[],loadedPlayers=(playersData??[]) as Player[];
      setTeamId(membership.team_id);setMatches(loadedMatches);setTeamPlayers(loadedPlayers);setMatchId(loadedMatches[0]?.id??"");setPageError("");setLoading(false);
    }
    void loadBase();return()=>{cancelled=true};
  },[userId]);

  useEffect(()=>{
    if(!matchId||!teamPlayers.length)return;
    const currentMatchId=matchId;
    let cancelled=false;
    async function loadRoster(){
      const supabase=createBrowserClient();if(!supabase)return;
      setLoadingForm(true);setFormError("");setSuccess("");setPlayerId("");
      const {data,error}=await supabase.from("match_players").select("player_id").eq("match_id",currentMatchId);
      if(cancelled)return;
      if(error){setFormError(`Không thể đọc match_players: ${error.message}`);setEligiblePlayers([]);setLoadingForm(false);return}
      const rosterIds=new Set(((data??[]) as Array<{player_id:string}>).map(row=>row.player_id));
      const eligible=rosterIds.size?teamPlayers.filter(player=>rosterIds.has(player.id)):teamPlayers.filter(player=>player.is_active);
      setEligiblePlayers(eligible);setPlayerId(eligible[0]?.id??"");setLoadingForm(false);
    }
    void loadRoster();return()=>{cancelled=true};
  },[matchId,teamPlayers]);

  useEffect(()=>{
    if(!matchId||!playerId||!selectedPlayer)return;
    const currentMatchId=matchId,currentPlayerId=playerId,currentIsSetter=selectedPlayer.position==="setter";
    let cancelled=false;
    const supabase=createBrowserClient();if(!supabase)return;
    async function loadForm(){
      setGeneral({...emptyGeneral});setSetter({...emptySetter});setDistribution(emptyDistribution());setFormError("");setSuccess("");setLoadingForm(true);
      try{const result=await fetchExisting(supabase as SupabaseClient,currentMatchId,currentPlayerId,currentIsSetter);if(cancelled)return;setGeneral(result.general);setSetter(result.setter);setDistribution(result.distribution);setLoadingForm(false)}catch(reason){if(cancelled)return;setFormError(reason instanceof Error?reason.message:"Không thể tải dữ liệu cũ.");setLoadingForm(false)}
    }
    void loadForm();
    return()=>{cancelled=true};
  },[matchId,playerId,selectedPlayer]);

  const validation=useMemo(()=>{
    const errors:string[]=[];
    for(const key of generalNumericFields){const value=general[key];if(!Number.isInteger(value)||value<0)errors.push(`${key} phải là số nguyên ≥ 0.`)}
    if(general.aces+general.serve_errors>general.serve_attempts)errors.push("Ace + lỗi phát bóng không được vượt số lần phát.");
    if(general.kills+general.attack_errors>general.attack_attempts)errors.push("Kill + lỗi tấn công không được vượt số lần tấn công.");
    if(general.perfect_receptions+general.good_receptions+general.poor_receptions+general.reception_errors>general.reception_attempts)errors.push("Tổng phân loại bước một không được vượt số lần đỡ bước một.");
    if(isSetter){
      for(const key of setterNumericFields){const value=setter[key];if(!Number.isInteger(value)||value<0)errors.push(`${key} phải là số nguyên ≥ 0.`)}
      if(setter.total_touches<setterAttempts)errors.push("Tổng lần chạm phải ≥ tổng Setter Set Attempts.");
      if(setter.assists>setterAttempts)errors.push("Assists không được vượt tổng Setter Set Attempts.");
      for(const zone of zones){const row=distribution[zone];for(const key of zoneNumericFields){const value=row[key];if(!Number.isInteger(value)||value<0)errors.push(`${zone} ${key} phải là số nguyên ≥ 0.`)}if(row.kills+row.attack_errors>row.set_attempts)errors.push(`${zone}: kills + attack errors không được vượt set attempts.`)}
      const distributed=zones.reduce((sum,zone)=>sum+distribution[zone].set_attempts,0);
      if(distributed!==setterAttempts)errors.push(`Tổng phân bố (${distributed}) phải bằng tổng Setter Set Attempts (${setterAttempts}).`);
    }
    return errors;
  },[distribution,general,isSetter,setter,setterAttempts]);

  async function save(){
    if(saving||!teamId||!matchId||!playerId||!selectedPlayer)return;
    setFormError("");setSuccess("");
    if(validation.length){setFormError(validation.join(" "));return}
    const supabase=createBrowserClient();if(!supabase){setFormError("Supabase chưa được cấu hình.");return}
    setSaving(true);
    const [{data:verifiedMatch,error:matchError},{data:verifiedPlayer,error:playerError}]=await Promise.all([
      supabase.from("matches").select("id").eq("id",matchId).eq("team_id",teamId).maybeSingle(),
      supabase.from("players").select("id, position").eq("id",playerId).eq("team_id",teamId).maybeSingle(),
    ]);
    if(matchError||playerError||!verifiedMatch||!verifiedPlayer){setFormError(`Không thể xác minh trận và cầu thủ cùng đội: ${(matchError??playerError)?.message??"Dữ liệu không khớp team."}`);setSaving(false);return}

    const generalPayload={match_id:matchId,player_id:playerId,...general,updated_at:new Date().toISOString()};
    const {error:generalError}=await supabase.from("player_match_stats").upsert(generalPayload as never,{onConflict:"match_id,player_id"});
    if(generalError){setFormError(`General Stats thất bại: ${generalError.message}`);setSaving(false);return}

    if(selectedPlayer.position==="setter"){
      const setterPayload={match_id:matchId,player_id:playerId,...setter,updated_at:new Date().toISOString()};
      const {data:setterRow,error:setterError}=await supabase.from("setter_match_stats").upsert(setterPayload as never,{onConflict:"match_id,player_id"}).select("id").single();
      if(setterError||!setterRow){setFormError(`General Stats đã lưu; Setter Stats thất bại: ${setterError?.message??"Không lấy được setter_stats_id."}`);setSaving(false);return}
      const distributionRows=zones.map(zone=>({setter_stats_id:(setterRow as {id:string}).id,zone,...distribution[zone]}));
      const {error:distributionError}=await supabase.from("setter_distribution").upsert(distributionRows as never,{onConflict:"setter_stats_id,zone"});
      if(distributionError){setFormError(`General và Setter Stats đã lưu; Setter Distribution thất bại: ${distributionError.message}`);setSaving(false);return}
    }

    try{
      const confirmed=await fetchExisting(supabase,matchId,playerId,selectedPlayer.position==="setter");
      setGeneral(confirmed.general);setSetter(confirmed.setter);setDistribution(confirmed.distribution);setSuccess("Đã lưu và xác nhận lại dữ liệu từ Supabase.");
    }catch(reason){setFormError(`Dữ liệu đã ghi nhưng không thể đọc lại để xác nhận: ${reason instanceof Error?reason.message:"Lỗi không xác định."}`)}finally{setSaving(false)}
  }

  function updateGeneral(key:keyof GeneralStats,value:number){setGeneral(current=>({...current,[key]:value}))}
  function updateSetter(key:keyof SetterStats,value:number){setSetter(current=>({...current,[key]:value}))}
  function updateZone(zone:Zone,key:keyof ZoneStats,value:number){setDistribution(current=>({...current,[zone]:{...current[zone],[key]:value}}))}
  function chooseMatch(value:string){setMatchId(value);setPlayerId("");setEligiblePlayers([]);setGeneral({...emptyGeneral});setSetter({...emptySetter});setDistribution(emptyDistribution());setFormError("");setSuccess("")}
  function choosePlayer(value:string){setPlayerId(value);setGeneral({...emptyGeneral});setSetter({...emptySetter});setDistribution(emptyDistribution());setFormError("");setSuccess("")}

  if(loading)return <AppShell><div className="page"><section className="panel auth-loading" style={{minHeight:360}}><span className="auth-spinner"/><p>Đang tải dữ liệu nhập thống kê…</p></section></div></AppShell>;
  if(pageError)return <AppShell><div className="page"><PageHeader title="Nhập thống kê" description="Không thể tải dữ liệu."/><section className="panel"><div className="login-error" role="alert">{pageError}</div></section></div></AppShell>;
  const matchDescription=selectedMatch?`${selectedMatch.is_home?selectedMatch.home_team_name:selectedMatch.away_team_name} vs ${selectedMatch.is_home?selectedMatch.away_team_name:selectedMatch.home_team_name} · ${formatDate(selectedMatch.played_at)}`:"Chưa có trận đấu";
  return <AppShell><div className="page"><PageHeader eyebrow="QUY TRÌNH SAU TRẬN / POST-MATCH WORKFLOW" title="Nhập thống kê sau trận" description={matchDescription}/>
    <div className="tabs"><button className="active">1 · Chọn trận / Match</button><button className={matchId?"active":""}>2 · Nhập thống kê / Stats</button><button>3 · Kiểm tra / Review</button></div>
    <div className="toolbar"><select className="filter-select" value={matchId} onChange={event=>chooseMatch(event.target.value)} aria-label="Chọn trận"><option value="">Chọn trận đấu / Select match</option>{matches.map(match=><option value={match.id} key={match.id}>{formatDate(match.played_at)} · {match.home_team_name} vs {match.away_team_name}</option>)}</select></div>
    {!matches.length?<section className="panel" style={{textAlign:"center",padding:38,color:"var(--muted)"}}>Chưa có trận đấu để nhập thống kê.</section>:<div className="two-col"><aside className="panel"><div className="panel-head"><div><h2>Đội hình / Roster</h2><p>Ưu tiên match_players; nếu trống dùng cầu thủ active</p></div></div>{eligiblePlayers.map(player=><button key={player.id} onClick={()=>choosePlayer(player.id)} className="match-row" style={{border:0,width:"100%",background:player.id===playerId?"#f3f0ff":"transparent",textAlign:"left",borderRadius:8}}><span className="result w">#{player.jersey_number}</span><div><strong>{player.full_name}</strong><small>{positionLabels[player.position]??player.position}</small></div><span>{player.id===playerId?"●":"›"}</span></button>)}{!loadingForm&&!eligiblePlayers.length&&<div style={{padding:28,textAlign:"center",color:"var(--muted)"}}>Không có cầu thủ phù hợp.</div>}</aside>
      <section className="panel form-section">{!selectedPlayer?<div style={{padding:38,textAlign:"center",color:"var(--muted)"}}>Chọn cầu thủ để nhập dữ liệu.</div>:<><div className="panel-head"><div><h2>#{selectedPlayer.jersey_number} {selectedPlayer.full_name}</h2><p>{positionLabels[selectedPlayer.position]??selectedPlayer.position}</p></div><span className="position-tag">THỐNG KÊ CHUNG / GENERAL STATS</span></div>
        {loadingForm?<div className="auth-loading" style={{minHeight:220}}><span className="auth-spinner"/><p>Đang tải dữ liệu đã lưu…</p></div>:<>
          <h3 style={{marginTop:23}}>Phát bóng & Tấn công / Serve & Attack</h3><div className="form-grid"><Num label="Số lần phát / Serve Attempts" value={general.serve_attempts} set={value=>updateGeneral("serve_attempts",value)}/><Num label="Phát ăn điểm / Aces" value={general.aces} set={value=>updateGeneral("aces",value)}/><Num label="Lỗi phát bóng / Serve Errors" value={general.serve_errors} set={value=>updateGeneral("serve_errors",value)}/><Num label="Số lần tấn công / Attack Attempts" value={general.attack_attempts} set={value=>updateGeneral("attack_attempts",value)}/><Num label="Điểm tấn công / Kills" value={general.kills} set={value=>updateGeneral("kills",value)}/><Num label="Lỗi tấn công / Attack Errors" value={general.attack_errors} set={value=>updateGeneral("attack_errors",value)}/></div>
          <h3 style={{marginTop:22}}>Chắn bóng, Phòng thủ & Bước một / Block, Defense & Reception</h3><div className="form-grid"><Num label="Chắn đơn / Solo Blocks" value={general.solo_blocks} set={value=>updateGeneral("solo_blocks",value)}/><Num label="Hỗ trợ chắn / Block Assists" value={general.block_assists} set={value=>updateGeneral("block_assists",value)}/><Num label="Cứu bóng / Digs" value={general.digs} set={value=>updateGeneral("digs",value)}/><Num label="Lỗi cứu bóng / Dig Errors" value={general.dig_errors} set={value=>updateGeneral("dig_errors",value)}/><Num label="Số lần đỡ bước một / Reception Attempts" value={general.reception_attempts} set={value=>updateGeneral("reception_attempts",value)}/><Num label="Bước một hoàn hảo / Perfect Receptions" value={general.perfect_receptions} set={value=>updateGeneral("perfect_receptions",value)}/><Num label="Bước một tốt / Good Receptions" value={general.good_receptions} set={value=>updateGeneral("good_receptions",value)}/><Num label="Bước một xấu / Poor Receptions" value={general.poor_receptions} set={value=>updateGeneral("poor_receptions",value)}/><Num label="Lỗi bước một / Reception Errors" value={general.reception_errors} set={value=>updateGeneral("reception_errors",value)}/></div>
          {isSetter&&<><h3 style={{marginTop:24}}>Thống kê chuyền 2 / Setter Statistics</h3><div className="form-grid"><Num label="Tổng lần chạm / Total Touches" value={setter.total_touches} set={value=>updateSetter("total_touches",value)}/><Num label="Tổng lần chuyền / Set Attempts · tự tính" value={setterAttempts} set={()=>{}} disabled/><Num label="Chuyền hoàn hảo / Perfect Sets" value={setter.perfect_sets} set={value=>updateSetter("perfect_sets",value)}/><Num label="Có thể đánh / Playable Sets" value={setter.playable_sets} set={value=>updateSetter("playable_sets",value)}/><Num label="Chuyền xấu / Bad Sets" value={setter.bad_sets} set={value=>updateSetter("bad_sets",value)}/><Num label="Lỗi chuyền / Set Errors" value={setter.set_errors} set={value=>updateSetter("set_errors",value)}/><Num label="Kiến tạo / Assists" value={setter.assists} set={value=>updateSetter("assists",value)}/></div><div className="stat-grid" style={{gridTemplateColumns:"repeat(3,1fr)",marginTop:20}}><div className="stat-box"><small>ĐỘ CHÍNH XÁC / ACCURACY</small><b>{percent(setter.perfect_sets+setter.playable_sets,setterAttempts)}</b></div><div className="stat-box"><small>CHUYỀN XẤU / BAD SET</small><b>{percent(setter.bad_sets,setterAttempts)}</b></div><div className="stat-box"><small>KIẾN TẠO / ASSIST RATE</small><b>{percent(setter.assists,setterAttempts)}</b></div></div><h3 style={{marginTop:22}}>Phân bố đường chuyền / Setter Distribution</h3>{zones.map(zone=><div key={zone} style={{marginTop:14}}><strong style={{fontSize:11}}>{zone} · {zoneLabels[zone]}</strong><div className="form-grid" style={{marginTop:8}}><Num label="Số lần chuyền / Set Attempts" value={distribution[zone].set_attempts} set={value=>updateZone(zone,"set_attempts",value)}/><Num label="Ghi điểm / Kills" value={distribution[zone].kills} set={value=>updateZone(zone,"kills",value)}/><Num label="Lỗi tấn công / Attack Errors" value={distribution[zone].attack_errors} set={value=>updateZone(zone,"attack_errors",value)}/></div></div>)}</>}
          {validation.length>0&&<div className="notice" role="alert"><strong>Dữ liệu chưa hợp lệ:</strong> {validation.join(" ")}</div>}{formError&&<div className="login-error" role="alert" style={{marginTop:12}}>{formError}</div>}{success&&<div className="notice" style={{background:"#e5f7f1",color:"#167d62"}}>{success}</div>}
          <div className="form-actions"><button className="secondary-btn" type="button" disabled>← Cầu thủ trước / Previous</button><div><button className="primary-btn" type="button" disabled={saving||loadingForm||validation.length>0} onClick={()=>void save()}>{saving?"Đang lưu…":"Lưu / Save"}</button></div></div>
        </>}</>}</section></div>}
  </div></AppShell>;
}
