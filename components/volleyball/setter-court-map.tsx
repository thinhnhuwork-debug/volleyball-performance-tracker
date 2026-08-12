export interface CourtZoneStat {
  zone: "P2" | "P3" | "P4" | "P6" | "OTHER";
  vietnameseName: string;
  setAttempts: number;
  kills: number;
  attackErrors: number;
}

export function SetterCourtMap({ data, setterName, setterNumber }: { data: CourtZoneStat[]; setterName: string; setterNumber: number }) {
  const total = data.reduce((sum, item) => sum + item.setAttempts, 0);
  const lookup = Object.fromEntries(data.map(item => [item.zone, item])) as Record<CourtZoneStat["zone"], CourtZoneStat>;
  return <div className="vnl-analysis">
    <div className="vnl-scorebar"><div><span>PHÂN BỐ</span></div><strong>PHÂN TÍCH CHUYỀN 2 / SETTER ANALYSIS</strong><div><span>DỮ LIỆU THỰC</span></div></div>
    <div className="vnl-court-wrap">
      <div className="vnl-court" role="img" aria-label="Mô hình nửa sân bóng chuyền của HVC, lưới ở mép trên, hàng trước phía trên vạch ba mét và hàng sau phía dưới">
        <div className="vnl-net"><span>LƯỚI / NET</span></div><div className="vnl-three-meter" />
        <span className="court-side-label">HVC VOLLEYBALL · NỬA SÂN ĐỘI NHÀ / HOME HALF-COURT</span><span className="court-front-label">HÀNG TRƯỚC / FRONT ROW</span><span className="court-back-label">HÀNG SAU / BACK ROW</span>
        <div className="setter-origin"><span>{setterNumber}</span><b>{setterName}</b><small>CHUYỀN 2 / SETTER</small></div>
        {(["P4","P3","P2","P6","OTHER"] as const).map(zone => {const item=lookup[zone];const rate=item.setAttempts ? item.kills/item.setAttempts*100:0;return <div key={zone} className={`vnl-zone vnl-${zone.toLowerCase()}`}>
          <span>{zone}</span><strong>{rate.toFixed(0)}%</strong><small>{item.kills}/{item.setAttempts} GHI ĐIỂM</small><em>{item.setAttempts} CHUYỀN</em>
        </div>})}
        <div className="court-legend"><span><b>●</b>Kích thước vòng tròn: tần suất chuyền / Set frequency</span></div>
      </div>
    </div>
    <div className="vnl-zone-summary">{data.map(item => {const rate=item.setAttempts?item.kills/item.setAttempts*100:0;const share=total?item.setAttempts/total*100:0;return <article key={item.zone}><header><b>{item.zone}</b><span>{item.vietnameseName}</span><strong>{rate.toFixed(1)}%</strong></header><div className="vnl-rate-track"><i style={{width:`${rate}%`}}/></div><footer><span>{item.setAttempts} lần chuyền · {share.toFixed(0)}% phân bố</span><span>{item.kills} điểm · {item.attackErrors} lỗi</span></footer></article>})}</div>
  </div>;
}
