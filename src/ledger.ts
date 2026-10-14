export type Position={code:string,name:string,quantity:number,cost:number,price:number};
export type Snapshot={date:string,account:string,cash:number,debt:number,flow:number,notes:string,positions:Position[],attachment?:string};
export const value=(s:Snapshot)=>s.positions.reduce((a,p)=>a+p.quantity*p.price,0);
export const net=(s:Snapshot)=>value(s)+s.cash-s.debt;
export function validate(s:Snapshot){
 if(!s || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)||new Date(s.date+'T00:00:00Z').toISOString().slice(0,10)!==s.date)throw Error('日期无效');
 if(typeof s.account!=='string'||!s.account.trim()||s.account.length>60)throw Error('请输入账户名称');
 for(const k of ['cash','debt','flow'] as const)if(typeof s[k]!=='number'||!Number.isFinite(s[k])||(k!=='flow'&&s[k]<0))throw Error('现金和负债应为非负数');
 if(!Array.isArray(s.positions)||s.positions.length>300)throw Error('持仓格式无效');
 const codes=new Set();for(const p of s.positions){if((p.code!==''&&!/^\d{6}$/.test(p.code))||!p.name?.trim())throw Error('股票名称必填，代码可留空或填六位数字');if(codes.has(p.code||p.name))throw Error('同一账户股票代码不能重复');codes.add(p.code||p.name);for(const k of ['quantity','cost','price'] as const)if(typeof p[k]!=='number'||!Number.isFinite(p[k])||p[k]<0)throw Error('持仓数字无效');if(!Number.isInteger(p.quantity)||p.quantity<=0)throw Error('股数应为正整数');}
 if(typeof s.notes!=='string'||s.notes.length>4000)throw Error('备注过长');
}
export function csv(rows:unknown[][]){return '\uFEFF'+rows.map(r=>r.map(v=>{let t=String(v??'');if(/^[=+@\t\r]/.test(t)||(/^-[^\d]/.test(t)))t="'"+t;return '"'+t.replaceAll('"','""')+'"'}).join(',')).join('\r\n');}
export function parseCSV(t:string){const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;t=t.replace(/^\uFEFF/,'');for(let i=0;i<t.length;i++){const c=t[i];if(c==='"'){if(quoted&&t[i+1]==='"'){cell+='"';i++}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&t[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell=''}else cell+=c}if(quoted)throw Error('CSV 引号未闭合');row.push(cell);if(row.some(Boolean))rows.push(row);return rows;}
