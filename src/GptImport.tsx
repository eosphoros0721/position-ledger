import React,{useRef,useState} from 'react';
import {Snapshot,validate,value} from './ledger';
type Draft={date:string,account:string,cash:string,debt:string,flow:string,notes:string,positions:Snapshot['positions'],reported?:number};
const field=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?String(v):'';
export function decodeGptFile(b:any):Draft[]{
 const extraction=b?.format==='screenshot-extraction-draft';
 const rows=extraction?b.accounts:b?.format==='position-ledger-gpt-v1'?b.records:null;
 if(!Array.isArray(rows)||!rows.length||rows.length>100)throw Error('请选择 GPT 整理的持仓 JSON 文件（最多100个账户快照）');
 return rows.map((a:any)=>{
 if(!a||typeof a.account!=='string'||!Array.isArray(a.positions))throw Error('账户或持仓格式不完整');
 const positions=a.positions.map((p:any)=>({code:typeof p.code==='string'?p.code:'',name:p.name,quantity:p.quantity,cost:p.cost,price:p.price}));
 // Verify positions before showing any totals; date and account balances remain editable.
 validate({date:'2000-01-01',account:a.account,cash:0,debt:0,flow:0,notes:'',positions});
 const notes=[typeof a.notes==='string'?a.notes:'','来源：GPT截图整理',...a.positions.filter((p:any)=>p.quantity_source).map((p:any)=>`${p.name}：${p.quantity_source}`)].filter(Boolean).join('；');
 return {date:typeof (a.date??b.snapshot_date)==='string'?(a.date??b.snapshot_date):'',account:a.account,cash:field(a.cash),debt:field(a.debt),flow:field(a.flow),notes,positions,reported:typeof a.market_value==='number'?a.market_value:undefined};
 });
}
export default function GptImport({onSave,onDone,existing}:{onSave:(s:Snapshot[])=>Promise<void>,onDone:()=>void,existing:Snapshot[]}){
 const ref=useRef<HTMLInputElement>(null);const [rows,setRows]=useState<Draft[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function read(f:File){try{if(f.size>10*1024*1024)throw Error('文件请小于10MB');setRows(decodeGptFile(JSON.parse((await f.text()).replace(/^\uFEFF/,''))));setError('')}catch(e){setError((e as Error).message)}finally{if(ref.current)ref.current.value=''}}
 const patch=(i:number,k:keyof Draft,v:string)=>setRows(r=>r.map((a,j)=>i===j?{...a,[k]:v}:a));
 async function save(){setBusy(true);setError('');try{
 const snapshots=rows.map(r=>{
 for(const [k,label] of [['cash','现金'],['debt','融资负债'],['flow','净出入金']] as const)if(r[k].trim()==='')throw Error(`${r.account}：请补充${label}，没有则填0`);
 const s={date:r.date,account:r.account,cash:Number(r.cash),debt:Number(r.debt),flow:Number(r.flow),notes:r.notes,positions:r.positions};validate(s);return s;
 });
 const keys=snapshots.map(s=>JSON.stringify([s.date,s.account.trim()]));if(new Set(keys).size!==keys.length)throw Error('文件中有相同日期和账户，请修改账户名称或日期');
 const replacements=snapshots.filter(s=>existing.some(x=>x.date===s.date&&x.account===s.account.trim()));
 if(!confirm(`确认保存 ${snapshots.length} 个账户、${snapshots.reduce((n,s)=>n+s.positions.length,0)} 项持仓？${replacements.length?'以下已有快照将被替换：'+replacements.map(s=>s.date+' '+s.account).join('、'):'其他日期的记录会保留。'}`))return;
 await onSave(snapshots);setRows([]);onDone();
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <section className="card"><div className="cardhead"><div><h2>导入 GPT 整理文件</h2><p>把截图发给 GPT → 下载整理后的 JSON → 在这里导入。无需网站识图或额外 API。</p></div><button className="primary" disabled={busy} onClick={()=>ref.current?.click()}>选择 GPT 文件</button><input ref={ref} hidden type="file" accept=".json,application/json" onChange={e=>{if(e.target.files?.[0])read(e.target.files[0])}}/></div>{error&&<p role="alert" className="ocr-warning">{error}</p>}{rows.length>0&&<><p className="caption">已读取 {rows.length} 个账户、{rows.reduce((n,r)=>n+r.positions.length,0)} 项持仓。请核对以下内容；缺失字段保留空白，没有负债或出入金请明确填0。</p>{rows.map((r,i)=><div key={i} style={{borderTop:'1px solid #dde5df',padding:'18px 0'}}><h3>{r.account}</h3><div className="formgrid">{[['date','持仓日期','date'],['account','账户名称','text'],['cash','现金','number'],['debt','融资负债（未知请补充）','number'],['flow','距上次记录净出入金（无则填0）','number']].map(([k,label,type])=><label key={k}>{label}<input aria-label={`${r.account} ${label}`} type={type} step={type==='number'?'0.01':undefined} value={r[k as 'date']} onChange={e=>patch(i,k as keyof Draft,e.target.value)}/></label>)}</div><div className="tablewrap"><table><thead><tr>{['股票','股数','成本价','现价','市值'].map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{r.positions.map((p,j)=><tr key={j}><td>{p.name}</td><td>{p.quantity.toLocaleString()}</td><td>{p.cost}</td><td>{p.price}</td><td>{(p.quantity*p.price).toFixed(2)}</td></tr>)}</tbody></table></div><p>合计市值：¥{value({positions:r.positions} as Snapshot).toLocaleString('zh-CN',{minimumFractionDigits:2})}</p>{r.reported!==undefined&&Math.abs(value({positions:r.positions} as Snapshot)-r.reported)>.02&&<p className="ocr-warning">计算市值与截图合计不一致，请让 GPT 重新核对文件。</p>}<details><summary>查看数据来源备注</summary><p>{r.notes}</p></details></div>)}<button className="primary" disabled={busy} onClick={save}>{busy?'保存中…':'核对并保存全部账户'}</button> <button disabled={busy} onClick={()=>setRows([])}>取消本次导入</button></>}</section>
}
