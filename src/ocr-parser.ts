import type {Position} from './ledger';
export type Word={text:string,bbox:{x0:number,y0:number,x1:number,y1:number},confidence:number};
const known:Record<string,string>={'卧龙新能':'600173','纳科诺尔':'920522','众合科技':'000925','琏升科技':'300051'};
const clean=(t:string)=>t.replace(/[\s|]/g,'').replace(/，/g,',');
export function parseScreenshot(words:Word[],width:number){
 const lines:{y:number,words:Word[]}[]=[];for(const w of [...words].sort((a,b)=>a.bbox.y0-b.bbox.y0||a.bbox.x0-b.bbox.x0)){const y=(w.bbox.y0+w.bbox.y1)/2;let line=lines.find(l=>Math.abs(l.y-y)<Math.max(8,(w.bbox.y1-w.bbox.y0)*.45));if(!line){line={y,words:[]};lines.push(line)}line.words.push(w)}for(const l of lines)l.words.sort((a,b)=>a.bbox.x0-b.bbox.x0);
 const textOf=(ws:Word[])=>clean(ws.map(w=>w.text).join(''));
 const header=lines.find(l=>/成本.*现价/.test(textOf(l.words))&&l.words.some(w=>w.bbox.x0>width*.7));
 if(!header)return {positions:[] as Position[],cash:undefined,issues:['没有识别到“持仓/可用、成本/现价”表头。请上传完整、清晰的同花顺持仓页。'],text:lines.map(l=>textOf(l.words)).join('\n'),twoR:false};
 const footer=lines.find(l=>l.y>header.y&&/查看.*清仓|持仓管理/.test(textOf(l.words)));const bottom=footer?.y??Infinity;
 const names=lines.filter(l=>l.y>header.y&&l.y<bottom).map(l=>({line:l,name:textOf(l.words.filter(w=>w.bbox.x0<width*.23))})).filter(o=>/[\u4e00-\u9fffA-Za-z]/.test(o.name)&&!/(查看|清仓|持仓|止盈|止损|资讯|资产|首页|行情|自选|交易|查询|成本|市值|余额|买入|卖出)/.test(o.name));
 const issues:string[]=[];const positions:Position[]=[];
 const nums=(ls:typeof lines,left:number,right:number)=>ls.map(l=>{const ws=l.words.filter(w=>{const x=(w.bbox.x0+w.bbox.x1)/2;return x>=width*left&&x<width*right});const t=textOf(ws).replace(/,/g,'');return /^\d+(\.\d+)?$/.test(t)?{n:Number(t),confidence:Math.min(...ws.map(w=>w.confidence))}:null}).filter((n):n is {n:number,confidence:number}=>n!==null);
 for(let i=0;i<names.length;i++){const row=names[i];const end=names[i+1]?.line.y||row.line.y+Math.max(65,(row.line.words[0]?.bbox.y1-row.line.words[0]?.bbox.y0||20)*3);const ls=lines.filter(l=>l.y>=row.line.y-10&&l.y<end-10);const quantities=nums(ls,.51,.77),prices=nums(ls,.79,1),market=nums(ls,0,.24);const quantity=quantities[0]?.n??0,cost=prices[0]?.n??0,price=prices[1]?.n??0;const name=row.name.replace(/[<>《》]/g,'');if(!/[\u4e00-\u9fff]/.test(name)||row.line.words.filter(w=>w.bbox.x0<width*.23).some(w=>w.confidence<65))issues.push(`${name}：股票名称未清晰识别，请核对名称。`);if(!quantity||!Number.isInteger(quantity)||prices.length<2)issues.push(`${name}：股数或成本/现价未完整识别，请核对。`);if([...quantities,...prices].some(n=>n.confidence<65))issues.push(`${name}：部分数字识别置信度较低。`);const mv=market.at(-1)?.n;if(mv!==undefined&&quantity>0&&price>0&&Math.abs(quantity*price-mv)>Math.max(2,mv*.001))issues.push(`${name}：股数×现价与截图市值不一致，请核对。`);positions.push({name,code:known[name]||'',quantity,cost,price});}
 let cash:number|undefined;const cashLine=lines.find(l=>l.y<header.y&&/总市值/.test(textOf(l.words)));if(cashLine){const next=lines.find(l=>l.y>cashLine.y+10&&l.y<cashLine.y+width*.15);if(next)cash=nums([next],.34,.6)[0]?.n;}
 const all=lines.map(l=>textOf(l.words)).join('\n'),twoR=/两融持仓|担保品比例/.test(all);if(!positions.length)issues.push('未识别到股票行，请换一张清晰截图。');if(cash===undefined)issues.push('没有可靠识别到可用现金，请核对。');if(twoR)issues.push('两融截图没有完整负债余额：请补充负债，才能正确计算净资产。');return {positions,cash,issues,text:all,twoR};
}
