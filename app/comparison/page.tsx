import {AppShell} from "../../components/app-shell";
import {PageHeader,Progress} from "../../components/ui";

export default function ComparisonPage(){
  const rows=[
    ["Tổng lần chuyền / Total Sets","376","341"],
    ["Độ chính xác chuyền / Setting Accuracy","89.9%","86.4%"],
    ["Chuyền hoàn hảo / Perfect Set","65.8%","61.2%"],
    ["Chuyền xấu / Bad Set","7.1%","9.4%"],
    ["Tỷ lệ kiến tạo / Assist Rate","35.4%","32.8%"],
    ["Lỗi chuyền / Set Error","3.8%","4.5%"],
    ["Cứu bóng / Digs","24","29"],
    ["Chắn bóng / Blocks","1","3"],
  ];
  return <AppShell><div className="page">
    <PageHeader eyebrow="SO SÁNH CẦU THỦ / PLAYER COMPARISON" title="So sánh chuyền 2" description="So sánh cầu thủ cùng vị trí dựa trên thống kê gốc / raw statistics."/>
    <div className="two-col"><article className="panel"><div className="player-cell"><span className="player-avatar lg" style={{background:"#7157ff"}}>TT</span><div><small>CHUYỀN 2 A / SETTER A</small><h2>#17 Thịnh</h2><span className="position-tag">HVC Volleyball</span></div></div></article><article className="panel"><div className="player-cell"><span className="player-avatar lg" style={{background:"#3388ff"}}>MA</span><div><small>CHUYỀN 2 B / SETTER B</small><h2>#8 Anh</h2><span className="position-tag">HVC Volleyball</span></div></div></article></div>
    <article className="panel comparison-panel" style={{marginTop:14}}>{rows.map(r=><div className="comparison-row" key={r[0]}><b>{r[1]}</b><Progress value={Number.parseFloat(r[1])}/><span>{r[0]}</span><Progress value={Number.parseFloat(r[2])} color="#3488f5"/><b>{r[2]}</b></div>)}</article>
  </div></AppShell>;
}
