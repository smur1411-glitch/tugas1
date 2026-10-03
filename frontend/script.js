
const $=s=>document.querySelector(s),rp=n=>'Rp '+Math.round(n||0).toLocaleString('id-ID'),esc=s=>String(s!==null&&s!==undefined?s:'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
fd=t=>new Date(t).toLocaleString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(',',''),
sum=(a,f)=>a.reduce((x,y)=>x+f(y),0),pad=(n,l=2)=>String(n).padStart(l,'0'),num=v=>Math.max(0,parseFloat(v)||0);
let DB,U=null,S={name:' TOKO SEMBAKO YOGA',addr:'',tel:'',w:'58'},cart=[],PL=[],page='dash',R='today',dbState='connecting',pendingOrderId=null;
const ST=['users','products','sales','purchases','expenses','moves','logs','settings'];
const open=()=>new Promise((ok,no)=>{const r=indexedDB.open('yoga_toko',1);r.onupgradeneeded=()=>ST.forEach(s=>r.result.createObjectStore(s,s=='users'?{keyPath:'username'}:s=='settings'?{keyPath:'k'}:{keyPath:'id',autoIncrement:true}));r.onsuccess=()=>{DB=r.result;ok()};r.onerror=()=>no(r.error)});
const rq=r=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
function sanitizeRecord(table, value){
  if(!value || typeof value !== 'object') return value;
  const cleaned = { ...value };
  if(table === 'sales'){
    const allowed = ['id','inv','invoice','kasir','user','pembeli','sub','hpp','disc','total','bayar','paid','kembali','change','status','metode','t','items','created_at'];
    Object.keys(cleaned).forEach(key => { if(!allowed.includes(key)) delete cleaned[key]; });
    if(cleaned.bayar === undefined && cleaned.paid !== undefined) cleaned.bayar = cleaned.paid;
    if(cleaned.kembali === undefined && cleaned.change !== undefined) cleaned.kembali = cleaned.change;
  }
  if(table === 'products'){
    const allowed = ['id','sku','barcode','nama','kat','sat','modal','jual','stok','min','aktif','exp','foto','created_at'];
    Object.keys(cleaned).forEach(key => { if(!allowed.includes(key)) delete cleaned[key]; });
  }
  if(table === 'purchases'){
    const allowed = ['id','supplier','pid','nama','item','qty','cost','harga','total','paid','u','t','created_at'];
    Object.keys(cleaned).forEach(key => { if(!allowed.includes(key)) delete cleaned[key]; });
  }
  if(table === 'expenses'){
    const allowed = ['id','cat','note','amt','metode','u','t','created_at'];
    Object.keys(cleaned).forEach(key => { if(!allowed.includes(key)) delete cleaned[key]; });
  }
  return cleaned;
}
let dbMode='browser';
const APP_CONFIG = window.__APP_CONFIG__ || {};
const APP_SYNC_KEY = 'yoga_data_change_ts';
const hasSupabaseConfig = !!APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseUrl !== 'https://YOUR-PROJECT.supabase.co' && !!APP_CONFIG.supabaseAnonKey && APP_CONFIG.supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';
const apiBase = (window.__APP_API_BASE__ || window.location.origin || '').replace(/\/$/, '');
function emitDataSync(){
  try{
    const ts = String(Date.now());
    localStorage.setItem(APP_SYNC_KEY, ts);
  }catch(e){}
  try{
    window.dispatchEvent(new CustomEvent('yoga:data-change', { detail: { ts: Date.now() } }));
  }catch(e){}
}

async function apiRequest(method, url, payload){
  const finalUrl = url.startsWith('http') ? url : `${apiBase}${url}`;
  const options={method, headers:{'Content-Type':'application/json'}, cache:'no-store'};
  if(payload!==undefined && payload!==null){options.body=JSON.stringify(payload);} else if(method==='GET'){delete options.headers;}
  const res=await fetch(finalUrl, options);
  if(!res.ok){
    const text=await res.text().catch(()=> '');
    throw new Error(text || `Request failed: ${method} ${url}`);
  }
  const contentType=res.headers.get('content-type')||'';
  if(contentType.includes('application/json')) return res.json();
  return res.text();
}

async function supabaseFetch(table, method='GET', payload=null, filter=null){
  if(!hasSupabaseConfig) throw new Error('Supabase not configured');
  const baseUrl = APP_CONFIG.supabaseUrl.replace(/\/$/, '');
  const url = new URL(`${baseUrl}/rest/v1/${table}`);
  url.searchParams.set('select', '*');
  if(filter && filter.column && filter.value !== undefined && filter.value !== null){
    url.searchParams.set(filter.column, `eq.${String(filter.value)}`);
  }
  const headers={
    apikey: APP_CONFIG.supabaseAnonKey,
    Authorization: String.fromCharCode(66,101,97,114,101,114,32) + APP_CONFIG.supabaseAnonKey,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
  if(method === 'POST' || method === 'PATCH' || method === 'DELETE'){
    headers['Prefer'] = 'return=representation';
  }
  const options={method, headers, cache:'no-store'};
  if(payload !== null && payload !== undefined){ options.body = JSON.stringify(payload); }
  const res=await fetch(url.toString(), options);
  if(!res.ok){
    const text=await res.text().catch(()=> '');
    throw new Error(text || `Supabase request failed: ${method} ${table}`);
  }
  if(res.status === 204) return null;
  const text=await res.text();
  return text ? JSON.parse(text) : null;
}

async function supabaseCreate(table, data){
  const result = await supabaseFetch(table, 'POST', data);
  return Array.isArray(result) ? result[0] : result || data;
}

async function supabaseReadAll(table){
  const result = await supabaseFetch(table, 'GET');
  return Array.isArray(result) ? result : [];
}

async function supabaseReadOne(table, column, value){
  const result = await supabaseFetch(table, 'GET', null, { column, value });
  if(Array.isArray(result)) return result[0] || undefined;
  return result || undefined;
}

async function supabaseUpdate(table, column, value, data){
  const result = await supabaseFetch(table, 'PATCH', data, { column, value });
  return Array.isArray(result) ? result[0] : result || data;
}

async function supabaseDelete(table, column, value){
  const result = await supabaseFetch(table, 'DELETE', null, { column, value });
  return result;
}

const all=async s=>{
  if(dbMode==='supabase') return supabaseReadAll(s);
  if(dbMode==='server') return apiRequest('GET', `/api/${s}`);
  return rq(DB.transaction(s).objectStore(s).getAll());
};
const put=async (s,o)=>{
  let result;
  const clean = sanitizeRecord(s, o);
  if(dbMode==='supabase'){
    const idField = s === 'users' ? 'username' : s === 'settings' ? 'k' : 'id';
    const rawKeyValue = clean[idField];
    const keyValue = rawKeyValue && typeof rawKeyValue === 'object' ? (rawKeyValue[idField] !== undefined ? rawKeyValue[idField] : (rawKeyValue.id !== undefined ? rawKeyValue.id : null)) : rawKeyValue;
    if(keyValue !== undefined && keyValue !== null){
      try{
        const existing = await get(s, keyValue);
        if(existing){
          result = await supabaseUpdate(s, idField, keyValue, clean);
          emitDataSync();
          return result;
        }
      }catch(e){}
    }
    result = await supabaseCreate(s, clean);
    emitDataSync();
    return result;
  }
  if(dbMode==='server'){
    const resultItem=await apiRequest('POST', `/api/${s}`, clean);
    emitDataSync();
    return resultItem.item || clean;
  }
  result = await rq(DB.transaction(s,'readwrite').objectStore(s).put(clean));
  emitDataSync();
  return result;
};
const get=async (s,k)=>{
  if(dbMode==='supabase'){
    const field = s === 'users' ? 'username' : s === 'settings' ? 'k' : 'id';
    return supabaseReadOne(s, field, k);
  }
  if(dbMode==='server'){
    try{
      return await apiRequest('GET', `/api/${s}/${encodeURIComponent(String(k))}`);
    }catch(e){
      return undefined;
    }
  }
  return rq(DB.transaction(s).objectStore(s).get(k));
};
log=a=>put('logs',{t:Date.now(),u:U?U.username:'-',a}),
hash=async(u,p)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('yoga|'+u+'|'+p)))].map(b=>b.toString(16).padStart(2,'0')).join(''),
mvo=(p,b,d,a,r)=>({t:Date.now(),pid:p.id,nama:p.nama,sebelum:b,delta:d,sesudah:b+d,alasan:a,ref:r||'',u:U.username}),
toast=m=>{const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',3200)},
md=h=>{$('#mb').innerHTML='<div class="card">'+h+'</div>';$('#mb').style.display='flex'},cl=()=>$('#mb').style.display='none',
ask=(m,f)=>{window._f=f;md(`<p>${m}</p><button class="btn" onclick="cl();_f()">Ya, lanjutkan</button> <button onclick="cl()">Batal</button>`)};
const ROLE_LABELS={o:'Pemilik',a:'Admin toko',k:'Kasir',u:'User / Order'};
const MENU=[['dash','Dashboard','📊','oa'],['pos','Kasir & Order','🛒','oaku'],['hist','Riwayat','🧾','oak'],['prod','Produk & Stok','📦','oa'],['buy','Pembelian','🚚','oa'],['exp','Pengeluaran','💸','oa'],['rep','Laporan','📈','oa'],['set','Pengaturan','⚙️','oa']];
const SEED=[
  ['Indomie Goreng','Mi Instan','bungkus',20,3500,3000],
  ['Indomie Soto','Mi Instan','bungkus',18,4000,3000],
  ['Indomie Rendang','Mi Instan','bungkus',25,3500,2800],
  ['Indomie Geprek','Mi Instan','bungkus',22,3000,2500],
  ['Indomie Aceh','Mi Instan','bungkus',16,3500,2800],
  ['Indomie Kari Ayam','Mi Instan','bungkus',20,4000,3000],
  ['Mie Sedaap Goreng','Mi Instan','bungkus',20,3500,2800],
  ['Mie Sedaap Soto','Mi Instan','bungkus',18,3500,2800],
  ['Beras Ramos','Beras & Bahan Pokok','kg',8,13000,10000],
  ['Beras Premium','Beras & Bahan Pokok','kg',10,15000,12000],
  ['Minyak Goreng','Minyak Goreng','liter',7,25000,21000],
  ['Gula Pasir','Gula & Kopi','kg',12,14000,11000],
  ['Tepung Terigu','Beras & Bahan Pokok','kg',10,12000,9000],
  ['Telur Ayam','Beras & Bahan Pokok','kg',9,25000,20000],
  ['Garam','Bumbu Dapur','bungkus',24,2000,1500],
  ['Kopi Sachet','Gula & Kopi','pcs',30,3500,2500],
  ['Teh','Gula & Kopi','bungkus',40,2500,1800],
  ['Susu Kental Manis','Minuman','kaleng',12,7000,5500],
  ['Air Mineral','Minuman','botol',24,4000,3000],
  ['Gas LPG','Produk Lainnya','tabung',5,180000,150000]
];
function normText(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function findBestProductMatch(text, products){
  const needle=normText(text); if(!needle||!products.length) return null;
  let best={score:-1,p:null};
  for(const p of products){
    const name=normText(p.nama), score = needle.includes(name)?10: name.includes(needle)?8:0;
    if(score>best.score){best={score,p};}
    const words=name.split(/\s+/), hits=words.filter(w=>needle.includes(w)).length;
    if(hits>0){const s=hits/words.length*5; if(s>best.score){best={score:s,p};}}
  }
  return best.score>0 ? best.p : null;
}
function parseReceiptLine(line, products){
  const clean=line.replace(/\s+/g,' ').trim(); if(!clean) return null;
  const numbers=[...clean.matchAll(/\d[\d\.,]*/g)].map(m=>Number(m[0].replace('.','').replace(',','.').replace(/\.$/,'')));
  if(!numbers.length) return null;
  const product=findBestProductMatch(clean.replace(/\b(?:x|qty|pcs|pack|box|dus|kg|lt|liter|bungkus|botol)\b.*$/gi,''), products);
  if(!product) return null;
  let qty=1, price=0;
  const qtyHints=['x','qty','pcs','bungkus','kg','liter','dus','box','botol'];
  const hasX=/\bx\b|\*|\d+\s*[x*]\s*\d+/i.test(clean);
  if(hasX){
    const m=clean.match(/(\d+(?:[.,]\d+)?)\s*(?:x|\*)\s*(\d+(?:[.,]\d+)?)/i);
    if(m){ qty=Number(m[1]); price=Number(m[2]); }
    else if(numbers.length>=2){ qty=numbers[0]; price=numbers[1]; }
  }else if(numbers.length>=2){
    qty=Math.min(numbers[0], 999); price=Math.max(numbers[1], numbers[0]);
    if(price>100000 && numbers[0] > 0 && numbers[0] <= 100){ qty=numbers[0]; price=Math.max(numbers[1], numbers[0]); }
  }
  if(price<=0 && numbers.length>=1) price=numbers[numbers.length-1];
  if(qty<=0) qty=1;
  return {productId:product.id, productName:product.nama, qty, pricePerUnit: Math.round(price), raw:clean};
}
function parseReceiptText(text, products){
  const lines = String(text||'').split(/\r?\n|\r/).map(x=>x.trim()).filter(Boolean);
  const matches=[];
  for(let i=0;i<lines.length;i++){
    const direct=parseReceiptLine(lines[i], products); if(direct) matches.push(direct);
    if(i+1 < lines.length){
      const pair=parseReceiptLine([lines[i], lines[i+1]].join(' '), products); if(pair) matches.push(pair);
    }
    if(i+2 < lines.length){
      const trio=parseReceiptLine([lines[i], lines[i+1], lines[i+2]].join(' '), products); if(trio) matches.push(trio);
    }
  }
  return matches.length ? matches[0] : null;
}
async function loadScript(src){
  if(window.Tesseract) return true;
  return new Promise((resolve,reject)=>{const s=document.createElement('script'); s.src=src; s.onload=()=>resolve(true); s.onerror=()=>reject(new Error('Gagal memuat OCR')); document.head.appendChild(s);});
}
function applyReceiptData(text, parsed){
  const area=$('#resiText'); if(area) area.value=text;
  if(!parsed){
    toast('Resi berhasil dibaca, tetapi formatnya belum cocok. Silakan cek dan isi manual.');
    return;
  }
  const p=$('#bp'); if(p){
    const idx=[...p.options].findIndex(o=>Number(o.value)===parsed.productId);
    if(idx>=0) p.selectedIndex=idx;
  }
  const sp=$('#sp'); if(sp) sp.value = (sp.value && sp.value.trim()) || 'Supplier';
  const q=$('#bq'); if(q) q.value = parsed.qty;
  const c=$('#bc'); if(c) c.value = parsed.pricePerUnit;
  toast('Data resi berhasil diproses ke form pembelian.');
}
async function getActiveProducts(){
  if(PL && PL.length) return PL.filter(p=>p.aktif);
  return (await all('products')).filter(p=>p.aktif);
}
async function scanResi(){
  const input=document.createElement('input'); input.type='file'; input.accept='image/*';
  input.onchange=async()=>{
    const file=input.files&&input.files[0]; if(!file) return;
    try{
      await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
      toast('Memindai resi supplier…');
      const result=await Tesseract.recognize(file, 'eng+ind');
      const text=result.data&&result.data.text ? result.data.text : '';
      const parsed=parseReceiptText(text, await getActiveProducts());
      applyReceiptData(text, parsed);
    }catch(e){
      toast('OCR gagal diproses di browser ini. Silakan tempel teks nota secara manual.');
    }
  };
  input.click();
}
async function manualResi(){
  const area=$('#resiText'); if(!area) return;
  md(`<div class="card" style="max-width:480px"><h3>Tempel teks resi supplier</h3><textarea id="resiManual" rows="8" placeholder="Contoh: Indomie Goreng 30 x 2500">${esc(area.value || '')}</textarea><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn" id="resiApply">Terapkan</button><button onclick="cl()">Batal</button></div></div>`);
  const textArea=$('#resiManual'); const apply=$('#resiApply');
  if(textArea) textArea.focus();
  if(apply){
    apply.onclick=async()=>{
      const v=(textArea ? textArea.value : '').trim();
      cl();
      if(!v){toast('Teks nota masih kosong.');return;}
      const parsed=parseReceiptText(v, await getActiveProducts());
      applyReceiptData(v, parsed);
    };
  }
}
async function init(){
  try{
    const ok = await connectDatabase();
    if(!ok){
      $('#app').innerHTML='<div class="lg"><div class="card">Penyimpanan browser (IndexedDB) tidak tersedia. Nonaktifkan mode privat lalu muat ulang.</div></div>';
      return;
    }
    const s=await get('settings','store');if(s)S={...S,...s.v};const th=await get('settings','theme');if(th)document.documentElement.dataset.theme=th.v;
    await ensureSeedProducts();
    let n=null;try{n=sessionStorage.getItem('yu')}catch(e){}if(n){U=await get('users',n);if(U&&U.aktif){return shell()}U=null}
    auth((await all('users')).length==0?'signup':'login')
  }catch(e){
    dbState='error';
    updateDbStatus('error');
    $('#app').innerHTML='<div class="lg"><div class="card">Penyimpanan browser (IndexedDB) tidak tersedia. Nonaktifkan mode privat lalu muat ulang.</div></div>'
  }
}
async function connectDatabase(){
  try{
    if(hasSupabaseConfig){
      const test = await supabaseFetch('users', 'GET', null, { column: 'username', value: 'x-should-not-exist' });
      if(test !== null && test !== undefined){
        dbMode='supabase';
        dbState='ready';
        updateDbStatus('ready');
        return true;
      }
    }
  }catch(e){}
  try{
    const res = await fetch(`${apiBase}/api/health`, { cache: 'no-store' });
    if (res.ok) {
      dbMode = 'server';
      dbState = 'server';
      updateDbStatus('server');
      return true;
    }
  }catch(e){}
  try{
    dbMode='browser';
    dbState='sync';
    updateDbStatus('sync');
    await open();
    dbState='ready';
    updateDbStatus('ready');
    return true;
  }catch(e){
    dbMode='browser';
    dbState='error';
    updateDbStatus('error');
    console.error('Database connection failed:', e);
    return false;
  }
}
function auth(mode){
  const isSignup = mode === 'signup';
  const title = isSignup ? 'Buat akun baru' : 'Masuk';
  const loginBtnClass = !isSignup ? 'btn' : '';
  const signupBtnClass = isSignup ? 'btn' : '';
  const loginBtnStyle = !isSignup ? 'flex:1;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-color:#10b981;' : 'flex:1;background:#fff;color:#1f2d25';
  const signupBtnStyle = isSignup ? 'flex:1;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-color:#10b981;' : 'flex:1;background:#fff;color:#1f2d25';
  const action = isSignup ? 'setup()' : 'login()';
  const actionLabel = isSignup ? 'Buat akun & masuk' : 'Masuk';
  const nameField = isSignup ? '<input id="nm" placeholder="Nama lengkap">' : '';
  const note = isSignup ? 'Akun baru dibuat dengan role User secara default. Role dapat diubah oleh admin/owner.' : 'Lupa password? Minta pemilik mereset di Pengaturan.';
  const html = '<div class="lg"><div class="card" style="width:min(390px,92vw)"><div class="logo">🛒 YOGA</div><div style="display:flex;gap:8px;margin-bottom:14px;padding:4px;border-radius:12px;background:#eef7f2"><button type="button" class="' + loginBtnClass + '" style="' + loginBtnStyle + '" onclick="auth(\'login\')">Masuk</button><button type="button" class="' + signupBtnClass + '" style="' + signupBtnStyle + '" onclick="auth(\'signup\')">Buat akun</button></div><h2>' + title + '</h2><p class="mu"> TOKO SEMBAKO YOGA' + (isSignup ? ' — akun baru otomatis jadi role User.' : ' — masuk ke sistem toko.') + '</p>' + nameField + '<input id="u" placeholder="Username" autocomplete="username"><div class="pw"><input id="p" type="password" placeholder="Password (min. 8 karakter)" autocomplete="current-password"><button type="button" onclick="togglePassword(this.previousElementSibling)">👁</button></div><button class="btn" style="width:100%;margin-top:8px" id="go" onclick="' + action + '">' + actionLabel + '</button><p class="mu" style="font-size:12px">Data tersimpan lokal di browser dan perangkat ini, bukan di cloud. ' + note + '</p></div></div>';
  $('#app').innerHTML = html;
}
function togglePassword(input){if(!input)return;input.type=input.type==='password'?'text':'password';}
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&$('#go'))$('#go').click()});
async function ensureSeedProducts(){
  const existing = await all('products');
  const catalog = {};
  for(const p of existing){ catalog[p.nama] = p; }
  const needsSync = !existing.length || existing.some(p => Number(p.stok || 0) <= 0 || Number(p.jual || 0) <= 0 || Number(p.modal || 0) <= 0);
  if(!needsSync) return;
  for(const [i,x] of SEED.entries()){
    const nama = x[0], kat=x[1], sat=x[2], stok = Number(x[3] ?? 0), modal=Number(x[4] ?? 0), jual=Number(x[5] ?? 0);
    const current = catalog[nama];
    const record = current ? { ...current, kat: current.kat || kat, sat: current.sat || sat, stok: Number(current.stok || 0) > 0 ? Number(current.stok) : stok, modal: Number(current.modal || 0) > 0 ? Number(current.modal) : modal, jual: Number(current.jual || 0) > 0 ? Number(current.jual) : jual, min: current.min ?? Math.max(2, Math.min(10, Math.round(stok * 0.2))), aktif: current.aktif !== false } : {sku:'YG-'+pad(i+1,3),barcode:'',nama,kat,sat,modal,jual,stok,min:Math.max(2,Math.min(10,Math.round(stok*0.2))),aktif:true};
    await put('products', record);
  }
}
async function setup(){
  const u=$('#u').value.trim().toLowerCase(),p=$('#p').value;
  if(!u||p.length<8)return toast('Username wajib diisi dan password minimal 8 karakter');
  if(await get('users',u))return toast('Username sudah dipakai');
  const role='u';
  try{
    await put('users',{username:u,nama:$('#nm').value.trim()||u,role,aktif:true,h:await hash(u,p)});
    await ensureSeedProducts();
    U=await get('users',u);
    try{sessionStorage.setItem('yu',u)}catch(e){}
    await log('Buat akun '+u+' sebagai role User');
    shell();
    toast('Akun berhasil dibuat dengan role User');
  }catch(e){
    console.error('Register error:', e);
    toast('Gagal membuat akun. Cek koneksi Supabase dan policy tabel users.');
  }
}
async function login(){
  const u=$('#u').value.trim().toLowerCase();
  try{
    const x=await get('users',u);
    if(!x||!x.aktif||x.h!=await hash(u,$('#p').value))return toast('Username atau password salah, atau akun nonaktif');
    U=x;try{sessionStorage.setItem('yu',u)}catch(e){}await log('Login');shell();
  }catch(e){
    console.error('Login error:', e);
    toast('Gagal login. Cek koneksi database atau policy Supabase.');
  }
}
async function logout(){await log('Logout');U=null;try{sessionStorage.removeItem('yu')}catch(e){}const hasUsers=await all('users');auth(hasUsers.length===0?'signup':'login')}
function bindRealtimeRefresh(){
 if(window.__YOGA_REALTIME_BOUND__) return;
 window.__YOGA_REALTIME_BOUND__ = true;
 const refresh = () => {
   if(!U || !document.visibilityState || document.visibilityState !== 'visible') return;
   if(['o','a','k','u'].includes(U.role) && page){
     try{ go(page); }catch(e){}
   }
 };
 window.addEventListener('yoga:data-change', refresh);
 window.addEventListener('storage', (e) => {
   if(e.key === APP_SYNC_KEY && U && ['o','a','k','u'].includes(U.role)) refresh();
 });
}
function shell(){const ms=MENU.filter(m=>m[3].includes(U.role) && !(U.role==='u' && m[0]==='dash'));page=U.role==='u'?'pos':U.role==='k'?'pos':'dash';
$('#app').innerHTML=`<div id="shell"><aside id="sb"><div class="logo">🛒 <i>YOGA</i></div>${ms.map(m=>`<button data-p="${m[0]}" onclick="go('${m[0]}')"><span>${m[2]}</span>${m[1]}</button>`).join('')}</aside><div class="mn"><header><button id="burger" onclick="$('#sb').classList.toggle('open')">☰</button><b id="sn"></b><span class="sp"></span><span class="mu" id="clk"></span><span id="dbStatus" class="status-pill db-ready">DB: siap</span><span id="netStatus" class="status-pill">Online</span><button onclick="notif()" title="Notifikasi">🔔</button><button onclick="theme()">🌓</button><button id="installBtn" onclick="installApp()" style="display:none">Install App</button><button onclick="pwf()">👤 ${esc(U.nama)}</button><button onclick="logout()">Keluar</button></header><main id="main"></main></div></div>`;
$('#sn').textContent=S.name;updateConnectionStatus();updateDbStatus(dbState || 'ready');bindRealtimeRefresh();setInterval(()=>{const c=$('#clk');if(c)c.textContent=fd(Date.now())},1000);go(page)}
function theme(){const d=document.documentElement,n=(d.dataset.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'))=='dark'?'light':'dark';d.dataset.theme=n;put('settings',{k:'theme',v:n})}
function hideSplash(){const s=$('#splash'); if(s){s.classList.add('hidden'); setTimeout(()=>s.remove(),360);} }
function updateConnectionStatus(){
  const pill=$('#netStatus'); if(!pill) return;
  const online=navigator.onLine;
  pill.textContent=online?'Online':'Offline';
  pill.classList.toggle('offline', !online);
  if(!online){toast('Koneksi terputus — mode offline aktif');}
}
function updateDbStatus(state){
  const pill=$('#dbStatus'); if(!pill) return;
  const isReady = state === 'ready' || state === 'server';
  const isSync = state === 'sync';
  const isServer = state === 'server';
  pill.textContent = isReady ? (isServer ? 'DB: online' : 'DB: siap') : isSync ? 'DB: menyiapkan...' : 'DB: error';
  pill.classList.toggle('db-ready', isReady && !isServer);
  pill.classList.toggle('db-server', isServer);
  pill.classList.toggle('db-fail', !isReady && !isSync);
  pill.classList.toggle('db-sync', isSync);
}
function setupNativeLook(){
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if(standalone){document.body.classList.add('is-standalone');}
  const btn=$('#installBtn'); if(btn && standalone) btn.style.display='none';
}
let deferredPrompt=null;
function installApp(){if(!deferredPrompt){toast('Aplikasi sudah siap dipasang dari browser Anda.');return;}deferredPrompt.prompt();deferredPrompt.userChoice.finally(()=>{deferredPrompt=null;const btn=$('#installBtn');if(btn)btn.style.display='none';});}
function setupPwa(){if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{})}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;const btn=$('#installBtn');if(btn && !window.matchMedia('(display-mode: standalone)').matches){btn.style.display='inline-block';}});
  window.addEventListener('appinstalled',()=>{const btn=$('#installBtn');if(btn)btn.style.display='none';toast('Aplikasi berhasil dipasang');document.body.classList.add('is-standalone');});
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);
  setupNativeLook();
}
async function go(p){if(!MENU.find(m=>m[0]==p&&m[3].includes(U.role)))return toast('Tidak punya akses ke menu ini');page=p;$('#sb').classList.remove('open');document.querySelectorAll('aside button').forEach(b=>b.classList.toggle('on',b.dataset.p==p));
const d={prod:await all('products'),sales:await all('sales'),buy:await all('purchases'),exp:await all('expenses')};$('#main').innerHTML=await PG[p](d)}
const rs=()=>{const n=new Date(),d0=new Date().setHours(0,0,0,0);return R=='today'?d0:R=='week'?d0-6*864e5:R=='month'?new Date(n.getFullYear(),n.getMonth(),1).getTime():0};
const tb=(h,rows)=>`<div class="tw"><table><tr>${h.map(x=>'<th>'+x+'</th>').join('')}</tr>${rows||'<tr><td colspan="9" class="mu">Belum ada data.</td></tr>'}</table></div>`;
const PG={
dash(d){const d0=new Date().setHours(0,0,0,0),ok=d.sales.filter(s=>s.status=='ok'),td=ok.filter(s=>s.t>=d0),om=sum(td,s=>s.total),hp=sum(td,s=>s.hpp),ex=sum(d.exp.filter(e=>e.t>=d0),e=>e.amt),act=d.prod.filter(p=>p.aktif),low=act.filter(p=>p.stok>0&&p.stok<=p.min),zr=act.filter(p=>p.stok<=0),expSoon=act.filter(p=>p.exp&&new Date(p.exp).getTime()>=Date.now()&&new Date(p.exp).getTime()<=Date.now()+30*864e5),expired=act.filter(p=>p.exp&&new Date(p.exp).getTime()<Date.now());
const c=(l,v,g)=>`<div class="card st ${g?'gd':''}"><span class="mu">${l}</span><b>${v}</b></div>`;
const days=[...Array(7)].map((_,i)=>{const s=d0-(6-i)*864e5;return[new Date(s).toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit'}),sum(ok.filter(x=>x.t>=s&&x.t<s+864e5),x=>x.total)]}),mx=Math.max(1,...days.map(x=>x[1]));
const top={};ok.forEach(s=>s.items.forEach(i=>top[i.name]=(top[i.name]||0)+i.qty));
return`<div class="hero"><div style="display:flex;gap:14px;align-items:center">${S.logo?`<img src="${S.logo}" alt="Logo" style="width:58px;height:58px;object-fit:contain;background:#fff;border-radius:14px;padding:4px">`:''}<div><small>Selamat datang kembali</small><h2>${esc(U.nama)}</h2><span>${new Date().toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</span></div></div><button class="btn" onclick="go('pos')">🛒 Buka kasir</button></div><div class="g">${c('Penjualan hari ini',rp(om),1)}${c('Transaksi hari ini',td.length)}${c('Modal barang terjual',rp(hp))}${c('Laba kotor',rp(om-hp),1)}${c('Pengeluaran',rp(ex))}${c('Laba bersih',rp(om-hp-ex),1)}${c('Produk aktif',act.length)}${c('Stok menipis',low.length)}${c('Stok habis',zr.length)}${c('Kadaluarsa',expired.length + expSoon.length)}${c('Utang ke supplier',rp(sum(d.buy,b=>b.total-b.paid)))}${c('Nilai persediaan',rp(sum(act,p=>p.stok*p.modal)))}</div>
<div class="g" style="margin-top:14px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))"><div class="card"><b>Penjualan 7 hari</b><div class="bars" style="margin-top:10px">${days.map(x=>`<div>${x[1]?Math.round(x[1]/1000)+'rb':''}<i style="height:${x[1]/mx*100}px"></i>${x[0]}</div>`).join('')}</div></div>
<div class="card"><b>Produk terlaris</b>${tb(['Produk','Terjual'],Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>`<tr><td>${esc(x[0])}</td><td>${x[1]}</td></tr>`).join(''))}</div>
<div class="card"><b>Stok menipis / habis / kadaluarsa</b>${tb(['Produk','Status'],[...zr,...low,...expired,...expSoon].slice(0,8).map(p=>`<tr><td>${esc(p.nama)}</td><td><span class="b ${p.stok<=0?'r':p.exp&&new Date(p.exp).getTime()<Date.now()?'r':p.exp&&new Date(p.exp).getTime()<=Date.now()+30*864e5?'y':'y'}">${p.exp ? (new Date(p.exp).getTime()<Date.now()?'Kedaluwarsa':'Exp '+new Date(p.exp).toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'})) : p.stok}</span></td></tr>`).join(''))}</div>
<div class="card"><b>Transaksi terakhir</b>${tb(['Invoice','Total'],ok.slice(-5).reverse().map(s=>`<tr><td>${s.inv}</td><td>${rp(s.total)}</td></tr>`).join(''))}</div></div>`},
pos(d){PL=d.prod.filter(p=>p.aktif);setTimeout(()=>{pl();cd()},0);const isUserMode=U.role==='u';const pendingList=(d.sales||[]).filter(s=>s.status==='pending').sort((a,b)=>Number(a.t||0)-Number(b.t||0));const queueMap = new Map(pendingList.map((s,idx)=>[String(s.id), idx + 1]));const pendingBlock = !isUserMode ? `<div class="card" style="margin-bottom:12px"><b>Pesanan user menunggu</b>${pendingList.length?pendingList.map((s,idx)=>`<div class="ci" style="margin-top:8px"><span><b>Antrian #${idx+1} • ${esc(s.pembeli||'Umum')}</b><br><small class="mu">${esc(s.inv||s.invoice||'Order')} • ${rp(s.total||0)}<br>${fd(s.t || Date.now())}</small></span><div style="display:flex;gap:6px;flex-wrap:wrap"><button onclick="loadPendingOrder(${s.id})">Lihat</button><button class="dg" onclick="cancelPendingOrder(${s.id})">Batalkan</button></div></div>`).join(''):'<p class="mu">Belum ada order user.</p>'}</div>` : '';const completedList=(d.sales||[]).filter(s=>s.status==='ok' && (s.user === U.username || s.kasir === U.username || s.pembeli === U.nama || s.user === undefined && s.pembeli === U.nama)).sort((a,b)=>Number(b.t||0)-Number(a.t||0));const myQueue = (d.sales||[]).filter(s=>s.status==='pending' && (s.user === U.username || s.kasir === U.username || s.pembeli === U.nama)).sort((a,b)=>Number(a.t||0)-Number(b.t||0));const userStatusBlock = isUserMode ? `<div class="card" style="margin-bottom:12px"><b>Status pesanan</b>${myQueue.length?myQueue.map((s)=>{const queueNo = queueMap.get(String(s.id)) || (pendingList.findIndex(x => String(x.id) === String(s.id)) + 1) || 1;return `<div class="ci" style="margin-top:8px"><span><b>Pesanan Anda sedang diproses</b><br><small class="mu">Antrian #${queueNo} • ${esc(s.inv||s.invoice||'Order')} • ${rp(s.total||0)}<br>${fd(s.t || Date.now())}</small></span></div>`;}).join(''):(completedList.length?`<div class="ci" style="margin-top:8px"><span><b>Pesanan Anda sudah selesai</b><br><small class="mu">${esc(completedList[0].inv || completedList[0].invoice || 'Order')} • ${rp(completedList[0].total || 0)}<br>${fd(completedList[0].t || Date.now())}</small></span></div>`:'<p class="mu">Belum ada pesanan yang dikirim. Klik produk lalu kirim pesanan ke kasir.</p>')}</div>` : '';const methodBlock = isUserMode ? '<p class="mu">Mode user hanya mengirim order. Pembayaran dan finalisasi dilakukan oleh kasir/pemilik.</p>' : '<div><label>Metode</label><select id="mt" onchange="cd()"><option value="tunai">Tunai</option><option value="qris">QRIS</option><option value="transfer">Transfer bank</option></select><div id="qw"></div><div id="pdw">Uang diterima<input id="pd" type="number" min="0" oninput="cd()"><div class="qk">' + [['Uang pas',-1],['5rb',5000],['10rb',10000],['20rb',20000],['50rb',50000],['100rb',100000],['Reset',0]].map(x=>`<button onclick="qc(${x[1]})">${x[0]}</button>`).join('') + '</div></div></div>';
return`<h2>${isUserMode?'Order pelanggan':'Kasir'}</h2>${isUserMode?userStatusBlock:pendingBlock}<div class="pos"><div><div class="sr"><input id="q" placeholder="Cari nama / SKU / barcode (Enter untuk scan)" oninput="pl()" onkeydown="if(event.key=='Enter')qe()"><button class="btn" onclick="scan('pos')">📷 Scan</button></div><div class="pl" id="pl"></div></div><div class="card"><b>${isUserMode?'Pesanan saya':'Keranjang'}</b><div id="ct"></div>
Nama pembeli<input id="bn" placeholder="Umum (opsional)">${methodBlock}
<div class="mu">Kembalian: <b id="kb">Rp 0</b></div><div class="tot" id="tt">Rp 0</div><button class="btn" style="width:100%;padding:12px" onclick="${isUserMode?'submitUserOrder()':(pendingOrderId ? 'finalizePendingOrder()':'pay()')}" ${!isUserMode && pendingOrderId ? 'title="Order user yang sedang dicek"' : ''}>${isUserMode?'Kirim pesanan ke kasir':(pendingOrderId ? 'Proses order terpilih':'Bayar & simpan')}</button></div></div>`},
hist(d){return`<h2>Riwayat transaksi</h2>${salesTb(d.sales.filter(s=>s.kasir==U.username).reverse(),0)}`},
prod(d){return`<h2>Produk & stok</h2><p><button class="btn" onclick="pf()">+ Produk</button> <input id="pq" style="width:220px" placeholder="Cari…" oninput="pfl()"></p><div id="pt">${ptab(d.prod)}</div>`},
async buy(d){const pr=d.prod.filter(p=>p.aktif);return`<h2>Pembelian dari supplier</h2><div class="card" style="margin-bottom:14px"><b>Barang datang</b><div class="sr" style="margin:8px 0"><button class="btn" onclick="scanResi()">📷 AI Scan Resi Supplier</button> <button onclick="manualResi()">📋 Tempel teks nota</button></div><textarea id="resiText" rows="3" placeholder="Hasil OCR/resi supplier akan tampil di sini. Bisa diubah manual sebelum simpan."></textarea><input id="sp" placeholder="Nama supplier"><select id="bp">${pr.map(p=>`<option value="${p.id}">${esc(p.nama)} (stok ${p.stok})</option>`).join('')}</select><input id="bq" type="number" min="0" placeholder="Jumlah diterima"><input id="bc" type="number" min="0" placeholder="Harga beli per satuan"><select id="bm"><option value="tunai">Bayar tunai</option><option value="kredit">Kredit (utang)</option></select><button class="btn" onclick="buy()">Simpan & tambah stok</button></div>${tb(['Tanggal','Supplier','Barang','Qty','Total','Sisa utang',''],d.buy.slice().reverse().map(b=>`<tr><td>${fd(b.t)}</td><td>${esc(b.supplier)}</td><td>${esc(b.nama)}</td><td>${b.qty}</td><td>${rp(b.total)}</td><td>${rp(b.total-b.paid)}</td><td>${b.total>b.paid?`<button onclick="payd(${b.id})">Lunasi</button>`:'<span class="b">Lunas</span>'}</td></tr>`).join(''))}`},
exp(d){const ex=d.exp.slice().reverse();return`<h2>Pengeluaran</h2><div class="card" style="margin-bottom:14px"><select id="ec">${['Belanja barang','Listrik','Air','Gaji karyawan','Transportasi','Sewa','Operasional','Lainnya'].map(x=>`<option>${x}</option>`).join('')}</select><input id="en" placeholder="Keterangan"><input id="ea" type="number" min="0" placeholder="Nominal (Rp)"><select id="em"><option value="tunai">Tunai</option><option value="transfer">Transfer</option></select><button class="btn" onclick="exps()">Simpan pengeluaran</button></div>${tb(['Tanggal','Kategori','Keterangan','Nominal','Oleh'],ex.map(e=>`<tr><td>${fd(e.t)}</td><td>${e.cat}</td><td>${esc(e.note)}</td><td>${rp(e.amt)}</td><td>${e.u}</td></tr>`).join(''))}`},
rep(d){const a=rs(),ok=d.sales.filter(s=>s.status=='ok'&&s.t>=a),om=sum(ok,s=>s.total),hp=sum(ok,s=>s.hpp),ex=sum(d.exp.filter(e=>e.t>=a),e=>e.amt);
return`<h2>Laporan</h2><p><select id="rg" style="width:auto" onchange="R=this.value;go('rep')">${[['today','Hari ini'],['week','7 hari'],['month','Bulan ini'],['all','Semua']].map(x=>`<option value="${x[0]}" ${R==x[0]?'selected':''}>${x[1]}</option>`).join('')}</select> <button onclick="window.print()">Cetak halaman</button></p>
<div class="g"><div class="card st"><span class="mu">Omzet (setelah diskon)</span><b>${rp(om)}</b></div><div class="card st"><span class="mu">Harga pokok terjual</span><b>${rp(hp)}</b></div><div class="card st gd"><span class="mu">Laba kotor</span><b>${rp(om-hp)}</b></div><div class="card st"><span class="mu">Biaya operasional</span><b>${rp(ex)}</b></div><div class="card st gd"><span class="mu">Laba bersih</span><b>${rp(om-hp-ex)}</b></div><div class="card st"><span class="mu">Transaksi dibatalkan</span><b>${d.sales.filter(s=>s.status!='ok'&&s.t>=a).length}</b></div></div><h3>Penjualan</h3>${salesTb(d.sales.filter(s=>s.t>=a).reverse(),1)}`},
async set(){const us=await all('users'),lg=(await all('logs')).slice(-30).reverse();return`<h2>Pengaturan</h2><div class="g" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))"><div class="card"><b>Identitas toko & struk</b><div style="display:flex;gap:12px;align-items:center;margin:8px 0"><span id="lg">${lgv()}</span><span><div class="mu">Logo toko</div><input type="file" accept="image/*" onchange="lup(this)" style="margin:0 0 6px"><button onclick="ldel()">Hapus logo</button></span></div><input id="s1" value="${esc(S.name)}" placeholder="Nama toko"><input id="s2" value="${esc(S.addr)}" placeholder="Alamat"><input id="s3" value="${esc(S.tel)}" placeholder="Telepon"><select id="s4"><option value="58" ${S.w=='58'?'selected':''}>Struk 58 mm</option><option value="80" ${S.w=='80'?'selected':''}>Struk 80 mm</option></select><select id="s5"><option value="1" ${S.lgr!='0'?'selected':''}>Tampilkan logo di struk</option><option value="0" ${S.lgr=='0'?'selected':''}>Sembunyikan logo di struk</option></select><button class="btn" onclick="sset()">Simpan</button></div>
<div class="card"><b>Pengguna</b>${tb(['User','Peran','Status','Aksi'],us.map(u=>`<tr><td>${esc(u.username)}</td><td><select data-user="${esc(u.username)}" onchange='setUserRole(${JSON.stringify(u.username)}, this.value)'>${['o','a','k','u'].map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${ROLE_LABELS[r]||'User'}</option>`).join('')}</select></td><td>${u.aktif?'Aktif':'Nonaktif'}</td><td><button onclick='urs(${JSON.stringify(u.username)})'>Reset PW</button> ${u.username!=U.username?`<button onclick='utg(${JSON.stringify(u.username)})'>${u.aktif?'Nonaktifkan':'Aktifkan'}</button>`:''} ${u.username!=U.username?`<button onclick='deleteUser(${JSON.stringify(u.username)})'>Hapus</button>`:''}</td></tr>`).join(''))}<hr><input id="un" placeholder="Username baru"><input id="uw" type="password" placeholder="Password (min. 8)"><select id="ur"><option value="u">User / Order</option><option value="k">Kasir</option><option value="a">Admin toko</option></select><button class="btn" onclick="uadd()">Tambah pengguna</button></div>
<div class="card"><b>Backup & restore</b><p class="mu">Data hanya ada di browser & perangkat ini. Salin backup ke tempat aman secara berkala. Password tersimpan sebagai hash.</p><button onclick="bk()">Buat backup (JSON)</button> <button onclick="rsf()">Restore</button></div>
<div class="card"><b>Audit log (30 terakhir)</b>${tb(['Waktu','User','Aktivitas'],lg.map(l=>`<tr><td>${fd(l.t)}</td><td>${l.u}</td><td>${esc(l.a)}</td></tr>`).join(''))}</div></div>`}};
function salesTb(a,v){return tb(['Invoice','Waktu','Kasir','Pembeli','Total','Metode','Status',''],a.map(s=>`<tr><td>${s.inv}</td><td>${fd(s.t)}</td><td>${s.kasir}</td><td>${esc(s.pembeli||'Umum')}</td><td>${rp(s.total)}</td><td>${s.metode}</td><td><span class="b ${s.status=='ok'?'':'r'}">${s.status=='ok'?'Selesai':s.status=='pending'?'Menunggu':'Batal'}</span></td><td>${s.id?`<button onclick="rcp(${s.id})">Struk</button>`:'<span class="mu">Order</span>'}${v&&s.status=='ok'?` <button class="dg" onclick="ask('Batalkan ${s.inv}? Stok dikembalikan.',()=>vd(${s.id}))">Batalkan</button>`:''}</td></tr>`).join(''))}
function pl(){const q=($('#q').value||'').toLowerCase();$('#pl').innerHTML=PL.filter(p=>!q||(p.nama+p.sku+p.barcode).toLowerCase().includes(q)).map(p=>`<button onclick="add(${p.id})">${im(p)}<b>${esc(p.nama)}</b>${rp(p.jual)}<br><span class="mu">stok ${p.stok} ${p.sat}</span></button>`).join('')||'<span class="mu">Produk tidak ditemukan.</span>'}
function qe(){const q=$('#q').value.trim().toLowerCase(),p=PL.find(p=>p.barcode.toLowerCase()==q||p.sku.toLowerCase()==q);if(p){add(p.id);$('#q').value='';pl()}}
function add(id){const p=PL.find(x=>x.id==id);if(!p.jual)return toast('Harga jual belum diatur. Atur di Produk & Stok.');const c=cart.find(x=>x.id==id);if((c?c.qty:0)+1>p.stok)return toast('Stok tidak cukup');c?c.qty++:cart.push({id,name:p.nama,price:p.jual,qty:1});cd()}
function cq(i,v){const c=cart[i],p=PL.find(x=>x.id==c.id),n=num(v);if(n>p.stok){toast('Stok hanya '+p.stok);return cd()}if(n<=0)cart.splice(i,1);else c.qty=n;cd()}
function cd(){if(!$('#ct'))return;const sub=sum(cart,c=>c.price*c.qty),ds=$('#ds')?Math.min(num($('#ds').value),sub):0,tt=sub-ds,m=$('#mt')?$('#mt').value:'tunai';const pdField=$('#pd');const pdw=$('#pdw');if(pdw){pdw.style.display = U.role === 'u' ? 'none' : (m === 'tunai' ? '' : 'none');}
$('#ct').innerHTML=cart.map((c,i)=>`<div class="ci"><span>${esc(c.name)}<br><small class="mu">${rp(c.price)}</small></span><button onclick="cq(${i},${c.qty-1})">−</button><input type="number" value="${c.qty}" onchange="cq(${i},this.value)"><button onclick="cq(${i},${c.qty+1})">+</button></div>`).join('')||'<p class="mu">Keranjang kosong. Klik produk untuk menambah.</p>';
$('#tt').textContent=rp(tt);$('#kb').textContent=U.role === 'u' ? 'Rp 0' : rp(Math.max(0,num(pdField?pdField.value:0)-tt));qr() }
function sell(items,sale){
 if(dbMode !== 'browser'){
   return (async () => {
     let saleTotal = 0;
     for (const it of items) {
       const product = (PL || []).find(p => p.id === it.id) || (await all('products')).find(p => p.id === it.id);
       if (product) saleTotal += product.jual * it.qty;
     }
     const normalizedItems = [];
     for (const it of items) {
       const product = (PL || []).find(p => p.id === it.id) || (await all('products')).find(p => p.id === it.id);
       if (!product || !product.aktif || it.qty <= 0) throw new Error('Produk tidak valid');
       if (!product.jual) throw new Error('Harga '+product.nama+' belum diatur');
       if (product.stok < it.qty) throw new Error('Stok '+product.nama+' tidak cukup');
       const before = product.stok;
       const updated = { ...product, stok: before - it.qty };
       await put('products', updated);
       await put('moves', mvo(product, before, -it.qty, 'Penjualan', sale.inv || 'INV-SUPABASE'));
       normalizedItems.push({ id: product.id, name: product.nama, qty: it.qty, price: product.jual, cost: product.modal });
     }
     const finalSale = {
       ...sale,
       inv: sale.inv || ('INV-YOGA-' + Date.now()),
       items: normalizedItems,
       sub: sum(normalizedItems, x => x.price * x.qty),
       hpp: sum(normalizedItems, x => (x.cost || 0) * x.qty),
       disc: 0,
       total: sum(normalizedItems, x => x.price * x.qty),
       t: Date.now(),
       status: 'ok'
     };
     finalSale.total = Math.max(0, finalSale.sub - (sale.disc || 0));
     if (sale.metode === 'tunai') {
       if ((sale.paid || 0) < finalSale.total) throw new Error('Uang diterima kurang dari total');
       finalSale.bayar = Number(sale.paid || 0);
       finalSale.paid = Number(sale.paid || 0);
       finalSale.kembali = Number((sale.paid || 0) - finalSale.total);
       finalSale.change = Number((sale.paid || 0) - finalSale.total);
     } else {
       finalSale.bayar = Number(finalSale.total);
       finalSale.paid = Number(finalSale.total);
       finalSale.kembali = 0;
       finalSale.change = 0;
     }
     const saved = await put('sales', finalSale);
     await log('Penjualan '+saved.inv+' '+rp(finalSale.total));
     return saved;
   })();
 }
 return new Promise((ok,no)=>{const t=DB.transaction(['products','sales','moves','settings'],'readwrite'),pr=t.objectStore('products'),st=t.objectStore('settings'),n=new Date(),day=''+n.getFullYear()+pad(n.getMonth()+1)+pad(n.getDate());
t.oncomplete=()=>ok(sale);t.onabort=()=>no(t.error||new Error(sale.err||'Transaksi dibatalkan'));const fail=m=>{sale.err=m;t.abort()};
st.get('c'+day).onsuccess=e=>{const c=(e.target.result?e.target.result.v:0)+1;st.put({k:'c'+day,v:c});sale.inv='INV-YOGA-'+day+'-'+pad(c,4);sale.items=[];let i=0;
const nx=()=>{if(i>=items.length){sale.sub=sum(sale.items,x=>x.price*x.qty);sale.hpp=sum(sale.items,x=>x.cost*x.qty);sale.disc=Math.min(sale.disc,sale.sub);sale.total=sale.sub-sale.disc;
if(sale.metode=='tunai'){if(sale.paid<sale.total)return fail('Uang diterima kurang dari total');sale.bayar=sale.paid;sale.kembali=sale.paid-sale.total;sale.change=sale.paid-sale.total}else{sale.bayar=sale.total;sale.paid=sale.total;sale.kembali=0;sale.change=0}
sale.t=Date.now();t.objectStore('sales').add(sale);return}
const it=items[i++];pr.get(it.id).onsuccess=ev=>{const p=ev.target.result;if(!p||!p.aktif||it.qty<=0)return fail('Produk tidak valid');if(!p.jual)return fail('Harga '+p.nama+' belum diatur');if(p.stok<it.qty)return fail('Stok '+p.nama+' tidak cukup');
const b=p.stok;p.stok-=it.qty;pr.put(p);t.objectStore('moves').add(mvo(p,b,-it.qty,'Penjualan',sale.inv));sale.items.push({id:p.id,name:p.nama,qty:it.qty,price:p.jual,cost:p.modal});nx()}};nx()}})}
let busy=0;
async function submitUserOrder(){
  if(busy)return;
  if(!cart.length)return toast('Keranjang masih kosong');
  busy=1;
  try{
    const total=sum(cart,c=>c.price*c.qty);
    const disc=$('#ds') ? num($('#ds').value) : 0;
    const pendingSales = (await all('sales')).filter(s => s.status === 'pending').sort((a,b) => Number(a.t||0) - Number(b.t||0));
    const sale={
      inv:'ORD-'+Date.now(),
      kasir:U.username,
      user:U.username,
      pembeli:$('#bn').value.trim()||U.nama||'Umum',
      disc,
      metode:'order',
      bayar:0,
      paid:0,
      kembali:0,
      change:0,
      total:Math.max(0,total-disc),
      status:'pending',
      t:Date.now(),
      items:cart.map(c=>({id:c.id,name:c.name,qty:c.qty,price:c.price,cost:0}))
    };
    await put('sales',sale);
    const queueNo = pendingSales.length + 1;
    await log('Order user '+U.username+' -> '+sale.inv+' total '+rp(sale.total)+' antrian #'+queueNo);
    cart=[];
    if($('#ds')) $('#ds').value=0;
    $('#bn').value='';
    toast('Pesanan Anda sudah masuk antrian #'+queueNo+' dan sedang diproses.');
    const d={prod:await all('products')};PL=d.prod.filter(p=>p.aktif);pl();cd();
  }catch(e){
    console.error('submitUserOrder error:', e);
    toast('Gagal mengirim order.');
  }
  busy=0;
}
async function pay(f){if(busy)return;if(U.role==='u'){return submitUserOrder();}if(pendingOrderId){return finalizePendingOrder(f);}if(!cart.length)return toast('Keranjang kosong');if($('#mt').value=='qris'&&!f)return ask('Simulasi QRIS: pastikan pembayaran '+$('#tt').textContent+' sudah masuk sebelum lanjut.',()=>pay(1));busy=1;try{const disc=$('#ds') ? num($('#ds').value) : 0;const s=await sell(cart.map(c=>({id:c.id,qty:c.qty})),{kasir:U.username,pembeli:$('#bn').value.trim()||'Umum',disc,metode:$('#mt').value,paid:num($('#pd').value),status:'ok'});
await log('Penjualan '+s.inv+' '+rp(s.total));cart=[];toast('Transaksi tersimpan: '+s.inv);rc(s);const d={prod:await all('products')};PL=d.prod.filter(p=>p.aktif);pl();cd();if($('#ds')) $('#ds').value=0;if($('#pd')) $('#pd').value='';$('#bn').value=''}catch(e){toast(e.message||'Gagal menyimpan transaksi')}busy=0}
function rc(s){
 const diterima = Number(s.bayar !== undefined ? s.bayar : (s.paid !== undefined ? s.paid : 0));
 const kembali = Number(s.kembali !== undefined ? s.kembali : (s.change !== undefined ? s.change : Math.max(0, diterima - Number(s.total || 0))));
 const h=`<div class="rcp" style="width:${S.w=='80'?'76mm':'54mm'}"><center>${S.logo&&S.lgr!='0'?`<img src="${S.logo}" alt="" style="max-width:${S.w=='80'?'40mm':'28mm'};max-height:22mm;background:#fff;filter:grayscale(1) contrast(1.4);display:block;margin:0 auto 3px">`:''}<b>${esc(S.name)}</b><br>${esc(S.addr)}<br>${esc(S.tel)}</center><hr>${s.inv}<br>${fd(s.t)}<br>Kasir: ${s.kasir}<br>Pembeli: ${esc(s.pembeli||'Umum')}<hr><table style="width:100%">${s.items.map(i=>`<tr><td colspan="3">${esc(i.name)}</td></tr><tr><td>${i.qty} x ${rp(i.price)}</td><td class="r" colspan="2">${rp(i.qty*i.price)}</td></tr>`).join('')}</table><hr><table style="width:100%"><tr><td>Total belanja</td><td class="r">${rp(s.sub !== undefined ? s.sub : (sum(s.items||[],i=>Number(i.price||0)*Number(i.qty||0)) || s.total || 0))}</td></tr><tr><td>Diskon</td><td class="r">${rp(Number(s.disc || 0))}</td></tr><tr><td><b>Total bayar</b></td><td class="r"><b>${rp(Number(s.total || 0))}</b></td></tr><tr><td>Metode</td><td class="r">${String(s.metode || 'tunai').toUpperCase()}</td></tr><tr><td>Diterima</td><td class="r">${rp(diterima)}</td></tr><tr><td>Kembali</td><td class="r">${rp(kembali)}</td></tr></table>${s.status!='ok'?'<center><b>*** DIBATALKAN ***</b></center>':''}<hr><center>Terima kasih telah berbelanja!</center></div>`;
$('#rc').innerHTML=h;md(h+'<p><button class="btn" onclick="window.print()">🖨 Cetak struk</button> <button onclick="cl()">Tutup</button></p><small class="mu">Pilih printer thermal di dialog cetak; ukuran kertas diatur di Pengaturan.</small>')}
async function rcp(id){rc(await get('sales',id))}
async function vd(id){
 if(dbMode !== 'browser'){
   const s=await get('sales', id);
   if(!s || s.status!='ok'){ toast('Transaksi tidak valid untuk dibatalkan'); return; }
   s.status='batal'; s.by=U.username;
   for(const it of (s.items||[])){
     const p=await get('products', it.id);
     if(!p) continue;
     const before=p.stok;
     await put('products', {...p, stok: before + it.qty});
     await put('moves', mvo(p, before, it.qty, 'Pembatalan', s.inv));
   }
   await put('sales', s);
   await log('Batal transaksi #'+id);
   toast('Transaksi dibatalkan, stok dikembalikan');
   go(page);
   return;
 }
 const t=DB.transaction(['products','sales','moves'],'readwrite');t.oncomplete=async()=>{await log('Batal transaksi #'+id);toast('Transaksi dibatalkan, stok dikembalikan');go(page)};t.objectStore('sales').get(id).onsuccess=e=>{const s=e.target.result;if(!s||s.status!='ok')return t.abort();s.status='batal';s.by=U.username;t.objectStore('sales').put(s);
s.items.forEach(it=>t.objectStore('products').get(it.id).onsuccess=ev=>{const p=ev.target.result;if(!p)return;const b=p.stok;p.stok+=it.qty;t.objectStore('products').put(p);t.objectStore('moves').add(mvo(p,b,it.qty,'Pembatalan',s.inv))})}}
const ptab=a=>tb(['SKU','Nama','Kategori','Modal','Jual','Stok','Kadaluarsa','Status',''],a.map(p=>`<tr><td>${p.sku}</td><td>${im(p,1)}${esc(p.nama)}</td><td>${esc(p.kat)}</td><td>${rp(p.modal)}</td><td>${rp(p.jual)}</td><td><span class="b ${p.stok<=0?'r':p.stok<=p.min?'y':''}">${p.stok} ${p.sat}</span></td><td>${p.exp?new Date(p.exp).toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'}):'—'}</td><td>${p.aktif?'Aktif':'Nonaktif'}</td><td><button onclick="pf(${p.id})">Edit</button> <button onclick="kartu(${p.id})">Kartu stok</button></td></tr>`).join(''));
async function pfl(){const q=$('#pq').value.toLowerCase();$('#pt').innerHTML=ptab((await all('products')).filter(p=>(p.nama+p.sku+p.barcode).toLowerCase().includes(q)))}
async function pf(id){const p=id?await get('products',id):{sku:'',barcode:'',nama:'',kat:'Produk Lainnya',sat:'pcs',modal:0,jual:0,stok:0,min:5,aktif:true,exp:''},f=(k,l,t='text',v=(p[k]!==undefined&&p[k]!==null)?p[k]:'')=>`${l}<input id="f_${k}" type="${t}" value="${esc(v)}">`;
PF=p.foto||'';md(`<h3>${id?'Edit':'Tambah'} produk</h3>${f('sku','SKU / kode')}${f('barcode','Barcode / QR (ketik atau scan)')}<button onclick="scan('prod')" style="margin-bottom:8px">📷 Scan kode dari kemasan</button><br>Foto produk (ambil foto langsung atau pilih dari galeri)<div style="display:flex;gap:10px;align-items:center;margin:4px 0 10px"><span id="fp">${im({...p,foto:PF},2)}</span><span><input type="file" accept="image/*" onchange="pimg(this)" style="margin:0 0 6px"><button onclick="PF='';$('#fp').innerHTML=im({nama:$('#f_nama').value},2)">Hapus foto</button></span></div>${f('nama','Nama barang')}${f('kat','Kategori')}${f('sat','Satuan (pcs, bungkus, dus, kg, liter…)')}${f('modal','Harga modal','number')}${f('jual','Harga jual eceran','number')}${f('stok','Stok','number')}${f('min','Stok minimum','number')}${f('exp','Tanggal kadaluarsa','date')}Status<select id="f_aktif"><option value="1">Aktif</option><option value="0" ${p.aktif?'':'selected'}>Nonaktif (arsip)</option></select><button class="btn" onclick="ps(${id||0})">Simpan</button> <button onclick="cl()">Batal</button>`)}
async function ps(id){const g=k=>$('#f_'+k).value.trim(),o=id?await get('products',id):{},n={...o,sku:g('sku')||'YG-'+Date.now().toString().slice(-6),barcode:g('barcode'),nama:g('nama'),kat:g('kat'),sat:g('sat')||'pcs',modal:num(g('modal')),jual:num(g('jual')),stok:num(g('stok')),min:num(g('min')),exp:g('exp'),aktif:$('#f_aktif').value=='1',foto:PF};
if(!n.nama)return toast('Nama barang wajib diisi');const b=o.stok||0;const saved=await put('products',n);if(saved && saved.id !== undefined && n.id === undefined){n.id=saved.id;} else if(saved && typeof saved === 'object' && saved.id === undefined && o.id !== undefined){n.id=o.id;} if(n.stok!=b)await put('moves',mvo(n,b,n.stok-b,id?'Penyesuaian manual':'Stok awal'));
if(id&&(o.modal!=n.modal||o.jual!=n.jual))await log(`Harga ${n.nama}: modal ${rp(o.modal)}→${rp(n.modal)}, jual ${rp(o.jual)}→${rp(n.jual)}`);else await log((id?'Edit':'Tambah')+' produk '+n.nama);cl();toast('Produk disimpan');go('prod')}
async function kartu(id){const m=(await all('moves')).filter(x=>x.pid==id).reverse();md(`<h3>Kartu stok</h3>${tb(['Waktu','Alasan','Sebelum','+/−','Sesudah','Oleh'],m.map(x=>`<tr><td>${fd(x.t)}</td><td>${x.alasan}</td><td>${x.sebelum}</td><td>${x.delta}</td><td>${x.sesudah}</td><td>${x.u}</td></tr>`).join(''))}<button onclick="cl()">Tutup</button>`)}
async function buy(){const q=num($('#bq').value),c=num($('#bc').value),pid=+$('#bp').value,sp=$('#sp').value.trim();if(!sp||!pid||q<=0||c<=0)return toast('Lengkapi supplier, barang, jumlah, dan harga beli');
if(dbMode !== 'browser'){
  try{
    const p=await get('products', pid);
    if(!p) throw new Error('Produk tidak ditemukan');
    const before=p.stok||0;
    const updated={...p, stok:before+q, modal:c};
    const saved = await put('products', updated);
    if(saved && saved.id !== undefined && updated.id === undefined){ updated.id = saved.id; }
    await put('moves', mvo(updated,before,q,'Pembelian '+sp));
    const k=$('#bm').value=='kredit';
    const legacyPurchasePayload={t:Date.now(),supplier:sp,pid,nama:p.nama,item:p.nama,qty:q,cost:c,harga:c,total:q*c,paid:k?0:q*c,u:U.username};
    const purchasePayload={t:Date.now(),supplier:sp,item:p.nama,qty:q,harga:c,total:q*c};
    try{
      await put('purchases', purchasePayload);
    }catch(e){
      const msg = String(e && e.message ? e.message : e || '');
      if(/column .* not exist|Could not find the/.test(msg)){ await put('purchases', legacyPurchasePayload); }
      else { throw e; }
    }
    await log('Pembelian '+sp+' '+rp(q*c));
    toast('Stok berhasil ditambah: '+p.nama+' +'+q+' pcs');
    go('buy');
  }catch(e){console.error('buy error:', e); toast(e.message||'Gagal menyimpan pembelian');}
  return;
}
const productName = $('#bp option:selected').textContent || sp;
const t=DB.transaction(['products','purchases','moves'],'readwrite');t.oncomplete=async()=>{await log('Pembelian '+sp+' '+rp(q*c));toast('Stok berhasil ditambah: '+productName+' +'+q+' pcs');go('buy')};t.onerror=()=>toast('Gagal menyimpan pembelian');
t.objectStore('products').get(pid).onsuccess=e=>{const p=e.target.result,b=p.stok;p.stok+=q;p.modal=c;t.objectStore('products').put(p);t.objectStore('moves').add(mvo(p,b,q,'Pembelian '+sp));const k=$('#bm').value=='kredit';t.objectStore('purchases').add({t:Date.now(),supplier:sp,pid,nama:p.nama,qty:q,cost:c,total:q*c,paid:k?0:q*c,u:U.username})}}
async function payd(id){const b=await get('purchases',id);ask('Lunasi utang '+rp(b.total-b.paid)+' ke '+esc(b.supplier)+'?',async()=>{b.paid=b.total;await put('purchases',b);await log('Bayar utang '+b.supplier);go('buy')})}
async function exps(){const a=num($('#ea').value);if(a<=0)return toast('Nominal harus lebih dari 0');await put('expenses',{t:Date.now(),cat:$('#ec').value,note:$('#en').value,amt:a,metode:$('#em').value,u:U.username});await log('Pengeluaran '+$('#ec').value+' '+rp(a));toast('Pengeluaran tersimpan');go('exp')}
async function sset(){S={...S,name:$('#s1').value||S.name,addr:$('#s2').value,tel:$('#s3').value,w:$('#s4').value,lgr:$('#s5').value};await put('settings',{k:'store',v:S});await log('Ubah pengaturan toko');$('#sn').textContent=S.name;toast('Pengaturan disimpan')}
async function setUserRole(username, role){
  const target = await get('users', username);
  if(!target){ toast('User tidak ditemukan'); return; }
  if(U.role !== 'o' && target.role === 'o'){ toast('Hanya owner yang bisa mengelola akun pemilik.'); return; }
  if(U.role !== 'o' && role === 'o'){ toast('Hanya owner yang bisa memberi role pemilik.'); return; }
  if(username === U.username && role !== 'o'){ toast('Anda tidak bisa mengubah role akun Anda sendiri.'); return; }
  if(!ROLE_LABELS[role]){ toast('Role tidak valid'); return; }
  target.role = role;
  await put('users', target);
  await log('Ubah role '+username+' -> '+(ROLE_LABELS[role]||role));
  go('set');
}
async function deleteUser(username){
  if(!username) return;
  if(username === U.username){ toast('Tidak bisa menghapus akun sendiri.'); return; }
  const user = await get('users', username);
  if(!user){ toast('User tidak ditemukan'); return; }
  if(U.role !== 'o' && user.role === 'o'){ toast('Hanya owner yang bisa menghapus akun owner.'); return; }
  const ok = confirm('Hapus user '+username+'?');
  if(!ok) return;
  await put('users', { ...user, aktif:false });
  await log('Hapus user '+username);
  go('set');
}
async function uadd(){
  const u=$('#un').value.trim().toLowerCase(),p=$('#uw').value;
  if(!u||p.length<8)return toast('Username wajib dan password minimal 8 karakter');
  if(await get('users',u))return toast('Username sudah dipakai');
  const role=$('#ur').value || 'u';
  if(U.role !== 'o' && role === 'o'){ toast('Hanya owner yang bisa menambah akun pemilik.'); return; }
  await put('users',{username:u,nama:u,role,aktif:true,h:await hash(u,p)});
  await log('Tambah pengguna '+u+' sebagai '+(ROLE_LABELS[role]||'User'));
  go('set');
}
async function utg(u){const x=await get('users',u);x.aktif=!x.aktif;await put('users',x);await log((x.aktif?'Aktifkan ':'Nonaktifkan ')+u);go('set')}
function urs(u){md(`<h3>Reset password: ${esc(u)}</h3><input id="np" type="password" placeholder="Password baru (min. 8)"><button class="btn" onclick='urs2(${JSON.stringify(u)})'>Simpan</button>`) }
async function urs2(u){const p=$('#np').value;if(p.length<8)return toast('Minimal 8 karakter');const x=await get('users',u);x.h=await hash(u,p);await put('users',x);await log('Reset password '+u);cl();toast('Password diubah')}
function pwf(){md(`<h3>Ganti password</h3><input id="op" type="password" placeholder="Password lama"><input id="np" type="password" placeholder="Password baru (min. 8)"><button class="btn" onclick="pw2()">Simpan</button>`)}
async function pw2(){if(U.h!=await hash(U.username,$('#op').value))return toast('Password lama salah');if($('#np').value.length<8)return toast('Minimal 8 karakter');U.h=await hash(U.username,$('#np').value);await put('users',U);await log('Ganti password');cl();toast('Password diganti')}
async function getPendingOrders(){
  try{
    const sales = await all('sales');
    return (sales || []).filter(s => s.status === 'pending');
  }catch(e){
    return [];
  }
}
async function cancelPendingOrder(id){
  const sale = await get('sales', id);
  if(!sale || sale.status !== 'pending'){ toast('Order tidak valid atau sudah diproses'); return; }
  ask(`Batalkan order ${sale.inv || sale.invoice || id} milik ${esc(sale.pembeli || 'Umum')}?`, async ()=>{
    const safeSale = {
      id: sale.id,
      inv: sale.inv || sale.invoice || ('ORD-'+Date.now()),
      invoice: sale.invoice || sale.inv || ('ORD-'+Date.now()),
      kasir: sale.kasir || U.username,
      pembeli: sale.pembeli || 'Umum',
      sub: Number(sale.sub || 0),
      hpp: Number(sale.hpp || 0),
      disc: Number(sale.disc || 0),
      total: Number(sale.total || 0),
      bayar: Number(sale.bayar !== undefined ? sale.bayar : (sale.paid !== undefined ? sale.paid : 0)),
      paid: Number(sale.paid || 0),
      kembali: Number(sale.kembali !== undefined ? sale.kembali : (sale.change !== undefined ? sale.change : 0)),
      change: Number(sale.change || 0),
      status: 'batal',
      metode: sale.metode || 'order',
      t: Number(sale.t || Date.now()),
      items: Array.isArray(sale.items) ? sale.items : []
    };
    await put('sales', safeSale);
    await log('Batalkan order '+(safeSale.inv || safeSale.invoice || safeSale.id)+' oleh '+U.username);
    toast('Order dibatalkan');
    if(page === 'pos' || page === 'dash') go(page);
  });
}
async function loadPendingOrder(id){
  const sale = await get('sales', id);
  if(!sale || sale.status !== 'pending'){ toast('Order tidak valid atau sudah diproses'); return; }
  pendingOrderId = sale.id;
  cart = (sale.items || []).map(item => ({
    id: item.id,
    name: item.name,
    price: Number(item.price || 0),
    qty: Number(item.qty || 0),
    cost: Number(item.cost || 0)
  }));
  if($('#bn')) $('#bn').value = sale.pembeli || 'Umum';
  if($('#ds')) $('#ds').value = 0;
  if($('#pd')) $('#pd').value = String(Math.max(0, Number(sale.total || 0)));
  const d={prod:await all('products')}; PL=d.prod.filter(p=>p.aktif); pl(); cd();
  toast('Order '+(sale.inv || sale.invoice || sale.id)+' dipilih untuk dicek & ditambah item.');
}
async function finalizePendingOrder(f){
  if(!pendingOrderId){ return pay(f); }
  if(!cart.length){ toast('Keranjang masih kosong'); return; }
  if($('#mt').value=='qris'&&!f){ return ask('Order ini akan diproses via QRIS. Pastikan pembayaran sudah masuk.',()=>finalizePendingOrder(1)); }
  busy=1;
  try{
    const sale = await get('sales', pendingOrderId);
    if(!sale || sale.status !== 'pending'){ throw new Error('Order pending tidak valid'); }
    const disc = $('#ds') ? num($('#ds').value) : 0;
    const madeItems = cart.map(c => ({ id: c.id, name: c.name, qty: c.qty, price: c.price, cost: c.cost || 0 }));
    const total = Math.max(0, sum(cart, c => c.price * c.qty) - disc);
    for(const c of cart){
      const p = await get('products', c.id);
      if(!p || !p.aktif) throw new Error('Produk tidak valid untuk order ini');
      if(!p.jual) throw new Error('Harga '+p.nama+' belum diatur');
      if(p.stok < c.qty) throw new Error('Stok '+p.nama+' tidak cukup');
      const before = p.stok;
      const updated = { ...p, stok: before - c.qty };
      await put('products', updated);
      await put('moves', mvo(p, before, -c.qty, 'Proses order '+(sale.inv || sale.invoice || sale.id), sale.inv || sale.invoice || sale.id));
    }
    const paidValue = num($('#pd').value);
    const finalSale = {
      id: sale.id,
      inv: sale.inv || sale.invoice || ('ORD-'+Date.now()),
      invoice: sale.invoice || sale.inv || ('ORD-'+Date.now()),
      user: sale.user || U.username,
      kasir: U.username,
      pembeli: $('#bn').value.trim() || sale.pembeli || 'Umum',
      sub: sum(madeItems, x => x.price * x.qty),
      hpp: sum(madeItems, x => (x.cost || 0) * x.qty),
      disc,
      total,
      bayar: $('#mt').value === 'tunai' ? paidValue : total,
      paid: $('#mt').value === 'tunai' ? paidValue : total,
      kembali: $('#mt').value === 'tunai' ? Math.max(0, paidValue - total) : 0,
      change: $('#mt').value === 'tunai' ? Math.max(0, paidValue - total) : 0,
      status: 'ok',
      metode: $('#mt').value,
      t: Date.now(),
      items: madeItems
    };
    await put('sales', finalSale);
    await log('Proses order '+(finalSale.inv || finalSale.invoice)+' '+rp(finalSale.total));
    cart=[];
    pendingOrderId=null;
    if($('#ds')) $('#ds').value=0;
    if($('#pd')) $('#pd').value='';
    $('#bn').value='';
    toast('Order user berhasil diproses: '+(finalSale.inv || finalSale.invoice));
    rc(finalSale);
    go('pos');
  }catch(e){
    console.error('finalizePendingOrder error:', e);
    toast(e.message || 'Gagal memproses order user');
  }
  busy=0;
}
async function notif(){const p=(await all('products')).filter(p=>p.aktif&&p.stok<=p.min),b=(await all('purchases')).filter(b=>b.total>b.paid),pending=(await getPendingOrders()).sort((a,b)=>Number(a.t||0)-Number(b.t||0));md(`<h3>Notifikasi</h3>${pending.length?`<div class="card" style="margin-bottom:10px"><b>Pesanan user menunggu</b>${pending.map((s,idx)=>`<div class="ci" style="margin-top:8px"><span><b>Antrian #${idx+1} • ${esc(s.pembeli||'Umum')}</b><br><small class="mu">${esc(s.inv||s.invoice||'Order')} • ${rp(s.total||0)}<br>${fd(s.t || Date.now())}</small></span><button onclick="loadPendingOrder(${s.id});cl();go('pos')">Lihat</button></div>`).join('')}</div>`:''}${p.map(x=>`<p>${x.stok<=0?'⛔ Habis':'⚠️ Menipis'}: ${esc(x.nama)} (${x.stok})</p>`).join('')}${b.map(x=>`<p>💳 Utang ${esc(x.supplier)}: ${rp(x.total-x.paid)}</p>`).join('')||''}${p.length+b.length+pending.length?'':'<p class="mu">Tidak ada notifikasi.</p>'}<button onclick="cl()">Tutup</button>`) }
async function bk(){const o={app:'yoga',v:1,t:Date.now()};for(const s of ST)o[s]=await all(s);md(`<h3>Backup</h3><p class="mu">Salin seluruh teks ini dan simpan sebagai file .json di tempat aman.</p><textarea id="bt" rows="9">${esc(JSON.stringify(o))}</textarea><button class="btn" onclick="$('#bt').select();document.execCommand('copy');toast('Backup disalin')">Salin</button> <button onclick="cl()">Tutup</button>`)}
function rsf(){md(`<h3>Restore</h3><p class="dg">Restore menimpa seluruh data saat ini.</p><input type="file" accept=".json" onchange="const r=new FileReader();r.onload=()=>$('#rt').value=r.result;r.readAsText(this.files[0])"><textarea id="rt" rows="7" placeholder="…atau tempel isi backup di sini"></textarea><button class="btn" onclick="rs2()">Validasi & restore</button>`)}
function rs2(){let o;try{o=JSON.parse($('#rt').value);if(o.app!='yoga'||!ST.every(s=>Array.isArray(o[s])))throw 0}catch(e){return toast('File backup tidak valid')}
ask('Timpa semua data dengan backup ini?',()=>{const t=DB.transaction(ST,'readwrite');t.oncomplete=()=>{toast('Restore selesai');logout()};t.onerror=()=>toast('Restore gagal');ST.forEach(s=>{const os=t.objectStore(s);os.clear();o[s].forEach(x=>os.put(x))})})}
let CAM=null,SCB='',LS=0,SCM='pos';
function scx(){if(CAM){CAM.getTracks().forEach(t=>t.stop());CAM=null}const o=$('#sc');if(o)o.remove()}
function beep(){try{const a=new(window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator();o.frequency.value=880;o.connect(a.destination);o.start();setTimeout(()=>{o.stop();a.close()},90)}catch(e){}try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}}
async function scan(m){SCM=m;scx();const o=document.createElement('div');o.id='sc';o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:40;display:grid;place-items:center;padding:14px';
o.innerHTML='<div class="card" style="width:min(460px,100%)"><b>Scan barcode / QR</b><video id="cv" playsinline muted style="width:100%;margin-top:8px;border-radius:14px;background:#000;max-height:52vh"></video><p class="mu" id="cm">Arahkan kamera ke barcode atau QR di kemasan.</p><button class="btn" onclick="scx()">Selesai</button></div>';document.body.appendChild(o);
const msg=t=>{const c=$('#cm');if(c)c.textContent=t};
if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return msg('Kamera tidak didukung di sini. Gunakan scanner USB atau ketik kode di kolom cari.');
try{CAM=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});const v=$('#cv');if(!v){scx();return}v.srcObject=CAM;await v.play();
let det=null;try{if('BarcodeDetector' in window)det=new BarcodeDetector()}catch(e){}
if(!det&&!window.jsQR)await new Promise(r=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';s.onload=s.onerror=r;document.head.appendChild(s)});
if(!det)msg(window.jsQR?'Mode QR saja. Barcode batang butuh Chrome Android atau scanner USB.':'Scanner kamera tidak tersedia. Gunakan scanner USB atau ketik kode.');
const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
const tick=async()=>{if(!CAM)return;let code='';try{if(det){const r=await det.detect(v);code=r[0]?r[0].rawValue:''}else if(window.jsQR&&v.videoWidth){cv.width=v.videoWidth;cv.height=v.videoHeight;cx.drawImage(v,0,0);const im=cx.getImageData(0,0,cv.width,cv.height),q=jsQR(im.data,im.width,im.height);code=q?q.data:''}}catch(e){}
if(code&&(code!=SCB||Date.now()-LS>2500)){SCB=code;LS=Date.now();await onscan(code.trim())}if(CAM)setTimeout(tick,250)};tick()
}catch(e){msg('Kamera tidak bisa dibuka (izin ditolak atau tidak tersedia). Gunakan scanner USB atau ketik kode manual.')}}
async function onscan(c){beep();if(SCM=='prod'){const f=$('#f_barcode');if(f)f.value=c;scx();toast('Kode terisi: '+c);return}
const p=PL.find(x=>x.barcode==c||x.sku.toLowerCase()==c.toLowerCase());if(!p)return toast('Kode '+c+' belum terdaftar. Isi di kolom Barcode produk.');
add(p.id);const k=$('#cm');if(k)k.textContent='✔ '+p.nama+' — di keranjang: '+(cart.find(x=>x.id==p.id)||{qty:0}).qty}
let PF='';
const EM=[[/indomie|sedaap|\bmie\b|bakmi/i,'🍜'],[/beras/i,'🍚'],[/minyak/i,'🛢️'],[/gula/i,'🍬'],[/tepung/i,'🌾'],[/telur/i,'🥚'],[/garam/i,'🧂'],[/kopi/i,'☕'],[/\bteh\b/i,'🍵'],[/susu/i,'🥛'],[/air mineral|\bair\b/i,'💧'],[/lpg|\bgas\b/i,'🔥'],[/sabun/i,'🧼'],[/deterjen|detergen/i,'🧴'],[/rokok/i,'🚬'],[/bumbu|merica|bawang|cabai|cabe/i,'🌶️']];
function im(p,s){const c='pi'+(s==1?' s':s==2?' m':'');if(p.foto)return`<img class="${c}" src="${p.foto}" alt="${esc(p.nama)}">`;const m=EM.find(x=>x[0].test(p.nama||''));return`<div class="${c}">${m?m[1]:(/mi instan/i.test(p.kat||'')?'🍜':'📦')}</div>`}
function pimg(inp){const f=inp.files[0];if(!f)return;if(!f.type.startsWith('image/'))return toast('File harus berupa gambar');const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const k=Math.min(1,320/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);PF=c.toDataURL('image/jpeg',.72);const s=$('#fp');if(s)s.innerHTML=im({nama:$('#f_nama').value,foto:PF},2);toast('Foto terpasang, klik Simpan')};i.onerror=()=>toast('Gambar tidak bisa dibaca');i.src=r.result};r.readAsDataURL(f)}
function tot(){const sub=sum(cart,c=>c.price*c.qty);const disc=$('#ds')?Math.min(num($('#ds').value),sub):0;return sub-disc}
function qc(v){if(!$('#pd')) return; $('#pd').value=v<0?tot():v==0?'':num($('#pd').value)+v; cd(); }
function qr(){const w=$('#qw');if(!w)return;const on=$('#mt').value=='qris';w.style.display=on?'block':'none';if(!on)return;
w.innerHTML=`<div class="card" style="text-align:center;margin:8px 0;box-shadow:none">${S.qris?`<img src="${S.qris}" alt="QRIS" style="max-width:100%;max-height:260px;border-radius:10px"><div class="mu">Minta pembeli scan, lalu bayar <b>${$('#tt').textContent}</b></div>`:'<p class="mu">Gambar QRIS toko belum diunggah.</p>'}${U.role!='k'?`<div class="mu" style="margin-top:8px">${S.qris?'Ganti':'Unggah'} gambar QRIS toko</div><input type="file" accept="image/*" onchange="qup(this)">`:''}</div>`}
function qup(inp){const f=inp.files[0];if(!f)return;if(!f.type.startsWith('image/'))return toast('File QRIS harus berupa gambar');const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const k=Math.min(1,720/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);S.qris=c.toDataURL('image/png');put('settings',{k:'store',v:S});log('Upload gambar QRIS');toast('Gambar QRIS tersimpan');qr()};i.onerror=()=>toast('Gambar tidak bisa dibaca');i.src=r.result};r.readAsDataURL(f)}
function lgv(){return S.logo?`<img src="${S.logo}" alt="Logo toko" style="width:84px;height:84px;object-fit:contain;border-radius:12px;background:#fff;border:1px solid var(--bd)">`:'<div class="pi m">🛒</div>'}
function lup(inp){const f=inp.files[0];if(!f)return;if(!f.type.startsWith('image/'))return toast('File logo harus berupa gambar');const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const k=Math.min(1,320/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);S.logo=c.toDataURL('image/png');put('settings',{k:'store',v:S});log('Upload logo toko');const l=$('#lg');if(l)l.innerHTML=lgv();toast('Logo tersimpan')};i.onerror=()=>toast('Gambar tidak bisa dibaca');i.src=r.result};r.readAsDataURL(f)}
function ldel(){delete S.logo;put('settings',{k:'store',v:S});log('Hapus logo toko');const l=$('#lg');if(l)l.innerHTML=lgv();toast('Logo dihapus')}
setupPwa();
setTimeout(hideSplash, 1200);
init();
