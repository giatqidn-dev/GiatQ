(() => {
  'use strict';
  const C = window.GIATQ_CONFIG;
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const state = {
    sessionToken: localStorage.getItem('giatq_session') || '',
    me: null,
    today: null,
    activities: [],
    report: null,
    registration: null,
    activeScreen: 'Today',
    apiModeResolved: null,
    syncTimer: null,
    syncInFlight: false,
  };
  const DAYS = [
    ['MON','Sen'],['TUE','Sel'],['WED','Rab'],['THU','Kam'],['FRI','Jum'],['SAT','Sab'],['SUN','Min']
  ];

  document.addEventListener('DOMContentLoaded', init);

  async function init(){
    const splashStarted=Date.now();
    $('#appVersion').textContent = C.APP_VERSION;
    renderDaysPicker();
    bindUI();
    updateOnlineState();
    window.addEventListener('online', async()=>{
      updateOnlineState();
      await flushQueue();
      if(state.sessionToken) await recoverSession(true);
    });
    window.addEventListener('offline', updateOnlineState);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});

    if(state.sessionToken){
      restoreWarmStart();
      await recoverSession(false);
    } else {
      await setupAuth();
      showAuthShell();
    }
    const remain=Math.max(0,780-(Date.now()-splashStarted));
    if(remain) await new Promise(r=>setTimeout(r,remain));
    hideSplash();
  }

  function bindUI(){
    $$('.nav-item').forEach(b=>b.addEventListener('click',()=>openScreen(b.dataset.screen)));
    $$('[data-open-activity]').forEach(b=>b.addEventListener('click',()=>openActivityModal()));
    $$('[data-close-activity]').forEach(b=>b.addEventListener('click',()=>$('#activityModal').close()));
    $$('[data-premium]').forEach(b=>b.addEventListener('click',()=>openPaywall(b.dataset.premium)));
    $$('[data-close-paywall]').forEach(b=>b.addEventListener('click',()=>$('#paywallModal').close()));
    $('#activityType').addEventListener('change', syncTargetFields);
    $('#activityForm').addEventListener('submit', saveActivityFromForm);
    $('#refreshReport').addEventListener('click', loadReport);
    $('#syncButton').addEventListener('click', refreshAll);
    $('#logoutButton').addEventListener('click', logout);
    $('#devSessionButton').addEventListener('click',()=>$('#devSessionModal').showModal());
    $$('[data-close-dev]').forEach(b=>b.addEventListener('click',()=>$('#devSessionModal').close()));
    $('#devSessionForm').addEventListener('submit', connectDevSession);
    $('#registrationForm').addEventListener('submit', saveRegistrationFromForm);
  }

  let authInitialized=false;
  async function setupAuth(){
    if(authInitialized) return;
    authInitialized=true;
    if(C.GOOGLE_CLIENT_ID){
      $('#authHint').textContent = 'Masuk dengan akun Google untuk menyimpan progres GiatQ.';
      await waitForGoogle();
      google.accounts.id.initialize({
        client_id: C.GOOGLE_CLIENT_ID,
        callback: async (resp) => {
          try{
            const out = await apiPost('authGoogle',{id_token:resp.credential,user_agent:navigator.userAgent}, false);
            state.sessionToken = out.session_token;
            localStorage.setItem('giatq_session', state.sessionToken);
            await enterApp();
          }catch(e){ toast(e.message); }
        }
      });
      google.accounts.id.renderButton($('#googleSignIn'),{theme:'outline',size:'large',shape:'pill',text:'signin_with',locale:'id',width:300});
    } else {
      $('#authHint').textContent = 'Google Login belum diaktifkan. Gunakan Session DEV untuk pengujian.';
      if(C.DEV_SESSION_ENABLED) $('#devSessionButton').classList.remove('hidden');
    }
  }

  function waitForGoogle(){
    return new Promise((resolve,reject)=>{
      let n=0; const t=setInterval(()=>{n++; if(window.google?.accounts?.id){clearInterval(t);resolve();} else if(n>80){clearInterval(t);reject(new Error('Google Sign-In gagal dimuat.'));}},100);
    });
  }

  async function connectDevSession(e){
    e.preventDefault();
    const token=$('#devSessionToken').value.trim();
    if(!token) return;
    const old=state.sessionToken; state.sessionToken=token;
    try{
      await apiGet('me');
      localStorage.setItem('giatq_session',token);
      $('#devSessionModal').close();
      await enterApp();
    }catch(err){state.sessionToken=old;toast('Session tidak valid: '+err.message);}
  }

  async function enterApp(){
    await recoverSession(false);
  }

  function hideAllShells(){
    $('#authView').classList.add('hidden');
    $('#registrationView').classList.add('hidden');
    $('#appView').classList.add('hidden');
  }

  function showAppShell(){
    hideAllShells();
    $('#appView').classList.remove('hidden');
  }

  function showAuthShell(){
    hideAllShells();
    $('#authView').classList.remove('hidden');
  }

  function showRegistrationShell(){
    hideAllShells();
    prefillRegistration();
    $('#registrationView').classList.remove('hidden');
  }

  function hideSplash(){
    const s=$('#splashView');
    if(!s) return;
    s.classList.add('leaving');
    setTimeout(()=>s.classList.add('hidden'),320);
  }

  function restoreWarmStart(){
    try{
      const cached=JSON.parse(localStorage.getItem('giatq_today_cache')||'null');
      if(cached){
        state.today=cached;
        renderToday();
        updateHeaderDate();
      }
    }catch(_){ }
    setSyncState(navigator.onLine?'pending':'offline');
  }

  async function recoverSession(fromOnlineEvent){
    if(!state.sessionToken) return;
    try{
      await refreshAll();
      if(state.registration?.registered) showAppShell();
      else showRegistrationShell();
      return true;
    }catch(e){
      if(isSessionError(e)){
        clearSession();
        await setupAuth();
        showAuthShell();
        toast('Sesi berakhir. Silakan masuk kembali.');
        return false;
      }
      const registrationCached=localStorage.getItem('giatq_registration_done')==='1';
      if(registrationCached) showAppShell();
      else showRegistrationShell();
      setSyncState(navigator.onLine?'pending':'offline');
      if(!fromOnlineEvent) toast('Belum tersambung ke server. Data terakhir tetap ditampilkan.');
      return false;
    }
  }

  function isSessionError(e){
    const msg=String(e?.message||'');
    const code=String(e?.code||'');
    return /Session diperlukan|Session tidak valid|Session sudah berakhir|Session kedaluwarsa|login kembali/i.test(msg) || /SESSION/i.test(code);
  }

  async function refreshAll(){
    if(!state.sessionToken) return;
    const [me,today,activities] = await Promise.all([apiGet('me'),apiGet('today'),apiGet('activities')]);
    state.me=me; state.today=today; state.activities=activities; state.registration=me?.registration||null;
    // Jangan biarkan response server yang sedikit tertinggal menimpa tap lokal yang masih antre.
    applyQueuedEventsToToday(getQueue());
    if(state.registration?.registered) localStorage.setItem('giatq_registration_done','1');
    renderToday(); renderActivities(); renderProfile(); updateHeaderDate();
    localStorage.setItem('giatq_today_cache',JSON.stringify(today));
    await flushQueue();
    if(navigator.onLine && !getQueue().length) setSyncState('synced');
  }

  function updateHeaderDate(){
    const now=new Date();
    $('#headerDate').textContent=now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'});
  }

  function renderToday(){
    const b=state.today || {activities:[],score:{score_percent:0,completed_count:0,eligible_count:0}};
    const pct=Math.round(Number(b.score?.score_percent||0));
    $('#scoreText').textContent=pct+'%'; $('#scoreRingText').textContent=pct+'%'; $('#scoreRing').style.setProperty('--score',pct);
    const done=Number(b.score?.completed_count||0), total=Number(b.score?.eligible_count||0);
    $('#scoreSubtitle').textContent= total ? `${done} dari ${total} kegiatan selesai` : 'Mulai dari satu kegiatan kecil.';
    const pending=Math.max(0,total-done);
    if($('#summaryDone')) $('#summaryDone').textContent=done;
    if($('#summaryPending')) $('#summaryPending').textContent=pending;
    if($('#summaryTotal')) $('#summaryTotal').textContent=total;
    $('#todayCount').textContent=`${b.activities.length} kegiatan terjadwal`;
    const list=$('#todayList'); list.innerHTML='';
    $('#todayEmpty').classList.toggle('hidden', b.activities.length>0);
    b.activities.forEach(a=>list.appendChild(activityCard(a,true)));
  }

  function renderActivities(){
    const list=$('#allActivitiesList'); list.innerHTML='';
    (state.activities||[]).forEach(a=>list.appendChild(activityCard(a,false)));
    if(!state.activities?.length) list.innerHTML='<div class="empty-state"><h3>Belum ada KegiatanKU</h3><p>Tambahkan kegiatan pertamamu.</p></div>';
  }

  function activityCard(a, todayMode){
    const el=document.createElement('article');
    const done=Number(a.completion_percent||0)>=100 || a.status==='DONE';
    el.className='activity-card'+(done?' done':'');
    const type=String(a.activity_type||'CHECKLIST').toUpperCase();
    const time=a.display_time||a.fixed_time||'Fleksibel';
    const target=Number(a.target_value||1);
    const category=String(a.category||'PERSONAL').toUpperCase();
    const tag=`<span class="tag ${esc(category)}">${esc(category)}</span>`;
    const timePill=`<span class="time-pill">${esc(time)}</span>`;
    if(todayMode && type==='CHECKLIST'){
      el.innerHTML=`<button class="check-button" aria-label="Checklist ${esc(a.name)}">${done?'✓':''}</button><div class="activity-main"><strong>${esc(a.name)}</strong><div class="activity-meta">${tag}</div></div>${timePill}`;
      $('.check-button',el).addEventListener('click',()=>toggleActivity(a,!done));
    } else if(todayMode) {
      const progress=Number(a.progress_value||0);
      el.innerHTML=`<div class="check-button" style="color:${done?'#fff':'#2EA8FF'}">${done?'✓':'•'}</div><div class="activity-main"><strong>${esc(a.name)}</strong><div class="activity-meta">${tag}<span>${progress}/${target} ${esc(a.unit||'')}</span>${timePill}</div></div><div class="progress-mini"><input type="number" min="0" step="0.01" value="${progress}" aria-label="Progress ${esc(a.name)}"></div>`;
      $('input',el).addEventListener('change',e=>setProgress(a,Number(e.target.value||0)));
    } else {
      el.innerHTML=`<div class="check-button" style="color:#2EA8FF">•</div><div class="activity-main"><strong>${esc(a.name)}</strong><div class="activity-meta">${tag}<span>${esc(a.schedule_type||'DAILY')}</span>${timePill}</div></div><div class="activity-actions"><button class="tiny-button edit">Ubah</button><button class="tiny-button archive">×</button></div>`;
      $('.edit',el).addEventListener('click',()=>openActivityModal(a));
      $('.archive',el).addEventListener('click',()=>archiveActivity(a));
    }
    return el;
  }

  function toggleActivity(a,done){
    const body={activity_id:a.activity_id,date:state.today?.date,done,client_event_id:clientEventId()};
    // INSTANT UI: jangan tunggu Apps Script/network.
    optimisticToggle(a.activity_id,done);
    localStorage.setItem('giatq_today_cache',JSON.stringify(state.today));
    queueAction('toggleChecklist',body);
    setSyncState('pending');
    scheduleFlush();
  }
  function setProgress(a,value){
    const body={activity_id:a.activity_id,date:state.today?.date,value,client_event_id:clientEventId()};
    optimisticProgress(a.activity_id,value);
    localStorage.setItem('giatq_today_cache',JSON.stringify(state.today));
    queueAction('setProgress',body);
    setSyncState('pending');
    scheduleFlush();
  }

  function optimisticToggle(id,done){
    const a=state.today?.activities?.find(x=>x.activity_id===id); if(!a)return;
    a.status=done?'DONE':'PENDING';a.completion_percent=done?100:0;a.progress_value=done?Number(a.target_value||1):0;recomputeLocalScore();renderToday();
  }
  function optimisticProgress(id,value){
    const a=state.today?.activities?.find(x=>x.activity_id===id); if(!a)return;
    const target=Math.max(.0001,Number(a.target_value||1));a.progress_value=value;a.completion_percent=Math.min(100,Math.round(value/target*10000)/100);a.status=a.completion_percent>=100?'DONE':'PENDING';recomputeLocalScore();renderToday();
  }
  function recomputeLocalScore(){
    const acts=(state.today?.activities||[]).filter(a=>truthy(a.include_in_score));
    const eligible=acts.filter(a=>!(a.status==='SKIPPED'&&['REST','SAKIT','SAFAR','NOT_APPLICABLE'].includes(String(a.skip_reason||'').toUpperCase())));
    const sum=eligible.reduce((n,a)=>n+Number(a.completion_percent||0),0);state.today.score={...(state.today.score||{}),eligible_count:eligible.length,completed_count:eligible.filter(a=>Number(a.completion_percent||0)>=100).length,score_percent:eligible.length?Math.round(sum/eligible.length*100)/100:0};
  }

  async function loadReport(){
    try{
      state.report=await apiPost('rebuildDailyReport',{date:state.today?.date});
      const r=state.report, p=r.payload||{};
      $('#reportScore').textContent=Math.round(Number(r.score_percent||0))+'%';
      $('#reportSummary').textContent=r.summary_text||'Belum ada laporan.';
      $('#reportDone').textContent=(p.done||[]).length;
      $('#reportPending').textContent=(p.pending||[]).length;
      $('#reportEligible').textContent=Number(r.eligible_count||0);
    }catch(e){toast(e.message);}
  }

  function openScreen(name){
    state.activeScreen=name;
    $$('.screen').forEach(s=>s.classList.remove('active')); $(`#screen${name}`).classList.add('active');
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.screen===name));
    if(name==='Report') loadReport(); if(name==='Activities') loadActivities();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  async function loadActivities(){ try{state.activities=await apiGet('activities');renderActivities();}catch(e){toast(e.message);} }

  function openActivityModal(a=null){
    $('#activityForm').reset(); $('#activityId').value=a?.activity_id||''; $('#activityModalTitle').textContent=a?'Ubah Kegiatan':'Tambah Kegiatan';
    $('#activityName').value=a?.name||''; $('#activityCategory').value=a?.category||'PERSONAL'; $('#activityType').value=a?.activity_type||'CHECKLIST'; $('#activityTarget').value=a?.target_value||1; $('#activityUnit').value=a?.unit||'COUNT'; $('#activityTime').value=a?.fixed_time||''; $('#activityScored').value=String(a?.include_in_score ?? true);
    $$('.day-chip').forEach(c=>c.classList.add('active')); // default daily; existing custom schedule can be refined later
    syncTargetFields(); $('#activityModal').showModal();
  }
  function syncTargetFields(){
    const t=$('#activityType').value; $('#targetFields').classList.toggle('hidden',t==='CHECKLIST');
    if(t==='DURATION') $('#activityUnit').value='MINUTE'; else if(t==='DISTANCE') $('#activityUnit').value='KM'; else if(t==='QUANTITY' && $('#activityUnit').value==='COUNT') $('#activityUnit').value='COUNT';
  }
  function renderDaysPicker(){
    const root=$('#daysPicker'); root.innerHTML=''; DAYS.forEach(([code,label])=>{const b=document.createElement('button');b.type='button';b.className='day-chip active';b.dataset.day=code;b.textContent=label;b.addEventListener('click',()=>b.classList.toggle('active'));root.appendChild(b);});
  }
  async function saveActivityFromForm(e){
    e.preventDefault();
    const days=$$('.day-chip.active').map(b=>b.dataset.day); if(!days.length){toast('Pilih minimal satu hari.');return;}
    const type=$('#activityType').value; const allDays=days.length===7;
    const activity={activity_id:$('#activityId').value||undefined,name:$('#activityName').value.trim(),category:$('#activityCategory').value,activity_type:type,unit:type==='CHECKLIST'?'COUNT':$('#activityUnit').value,target_value:type==='CHECKLIST'?1:Number($('#activityTarget').value||1),schedule_type:allDays?'DAILY':'CUSTOM',time_mode:$('#activityTime').value?'FIXED':'ANYTIME',fixed_time:$('#activityTime').value,include_in_score:$('#activityScored').value==='true',active:true};
    const schedule=allDays?null:{days_of_week:days.join(','),active:true};
    try{await apiPost('saveActivity',{activity,schedule});$('#activityModal').close();toast('Kegiatan tersimpan.');await refreshAll();}
    catch(err){toast(err.message);}
  }
  async function archiveActivity(a){
    if(!confirm(`Arsipkan “${a.name}”?`))return;
    try{await apiPost('archiveActivity',{activity_id:a.activity_id});toast('Kegiatan diarsipkan.');await refreshAll();}catch(e){toast(e.message);}
  }

  function renderProfile(){
    const u=state.me?.user||{}, ent=state.me?.entitlements||{}, p=state.registration?.profile||{};
    $('#profileName').textContent=p.full_name||u.display_name||'Pengguna GiatQ';
    $('#profileEmail').textContent=p.email||u.email||'';
    $('#profilePlan').textContent=ent.plan||'FREE';
    $('#profileAvatar').textContent=(p.full_name||u.display_name||'G')[0].toUpperCase();
    if($('#profileWhatsapp')) $('#profileWhatsapp').textContent=p.whatsapp?('+'+p.whatsapp):'-';
    if($('#profileCity')) $('#profileCity').textContent=p.city||'-';
  }
  function prefillRegistration(){
    const u=state.me?.user||{}, p=state.registration?.profile||{};
    $('#regFullName').value=p.full_name||u.display_name||'';
    $('#regWhatsapp').value=p.whatsapp||'';
    $('#regEmail').value=p.email||u.email||'';
    $('#regCity').value=p.city||'';
    $('#regOccupation').value=p.occupation||'';
    $('#regReferral').value=p.referral_source||'';
    $('#regConsent').checked=Boolean(p.consent_privacy);
  }

  async function saveRegistrationFromForm(e){
    e.preventDefault();
    const btn=$('#registrationSubmit');
    const profile={
      full_name:$('#regFullName').value.trim(),
      whatsapp:$('#regWhatsapp').value.trim(),
      email:$('#regEmail').value.trim(),
      city:$('#regCity').value.trim(),
      occupation:$('#regOccupation').value,
      referral_source:$('#regReferral').value,
      consent_privacy:$('#regConsent').checked,
    };
    if(!profile.full_name||!profile.whatsapp||!profile.city||!profile.consent_privacy){
      toast('Lengkapi data wajib terlebih dahulu.');
      return;
    }
    const oldText=btn.textContent; btn.disabled=true; btn.textContent='Menyimpan...';
    try{
      state.registration=await apiPost('saveRegistration',{profile});
      localStorage.setItem('giatq_registration_done','1');
      await refreshAll();
      showAppShell();
      toast('Profil GiatQ tersimpan.');
    }catch(err){
      toast(err.message);
    }finally{
      btn.disabled=false; btn.textContent=oldText;
    }
  }

  function openPaywall(feature){ $('#paywallTitle').textContent=`Buka ${feature}`; $('#paywallCopy').textContent=`${feature} tersedia di GiatQ Premium. Free tetap bisa digunakan untuk checklist, kegiatan harian, persentase, dan laporan harian dasar.`; $('#paywallModal').showModal(); }
  async function logout(){
    const ok=confirm('Keluar akun akan menghapus sesi di perangkat ini. Pada mode DEV kamu akan diminta memasukkan token lagi. Untuk sekadar menutup GiatQ, gunakan tombol Home/Back tanpa menekan Keluar akun. Lanjut keluar akun?');
    if(!ok) return;
    try{await apiPost('logout',{});}catch(_){ }
    clearSession();
    location.reload();
  }
  function clearSession(){state.sessionToken='';localStorage.removeItem('giatq_session');localStorage.removeItem('giatq_registration_done');}

  async function apiGet(action, params={}){
    return apiRequest('GET',action,params,true);
  }
  async function apiPost(action, data={}, withSession=true){
    return apiRequest('POST',action,data,withSession);
  }
  async function apiRequest(method,action,data={},withSession=true){
    const payload={...data,action}; if(withSession && state.sessionToken) payload.session_token=state.sessionToken;
    const modes=C.API_MODE==='auto' ? (state.apiModeResolved?[state.apiModeResolved]:['proxy','direct']) : [C.API_MODE];
    let lastErr;
    for(const mode of modes){
      try{
        const out=await rawRequest(mode,method,payload);
        state.apiModeResolved=mode;
        if(!out?.ok){
          const err=new Error(out?.error?.message||'API GiatQ gagal.');
          err.code=out?.error?.code||'';
          throw err;
        }
        return out.data;
      }catch(e){lastErr=e;if(C.API_MODE!=='auto')break;}
    }
    throw lastErr||new Error('API tidak dapat dihubungi.');
  }
  async function rawRequest(mode,method,payload){
    let url=mode==='proxy'?C.PROXY_PATH:C.GAS_URL;
    const opt={method,redirect:'follow',cache:'no-store'};
    if(method==='GET'){
      const qs=new URLSearchParams(); Object.entries(payload).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')qs.set(k,String(v));}); url+=(url.includes('?')?'&':'?')+qs.toString();
    }else{
      opt.body=JSON.stringify(payload);
      opt.headers={'Content-Type':mode==='direct'?'text/plain;charset=utf-8':'application/json'};
    }
    const r=await fetch(url,opt); if(!r.ok)throw new Error(`HTTP ${r.status}`); const text=await r.text();
    try{return JSON.parse(text);}catch(_){throw new Error('Respons API bukan JSON. Jika mode direct gagal di HP, aktifkan proxy /api.');}
  }

  function queueAction(action,body){
    const q=getQueue();
    // Untuk progress yang sama, simpan nilai terbaru saja sebelum batch terkirim.
    const key=action+'|'+String(body.activity_id||'')+'|'+String(body.date||'');
    if(action==='setProgress'){
      for(let i=q.length-1;i>=0;i--){
        const x=q[i], k=x.action+'|'+String(x.body?.activity_id||'')+'|'+String(x.body?.date||'');
        if(k===key){q.splice(i,1);break;}
      }
    }
    q.push({id:body.client_event_id||clientEventId(),action,body,created_at:new Date().toISOString()});
    localStorage.setItem('giatq_queue',JSON.stringify(q));
  }
  function getQueue(){try{return JSON.parse(localStorage.getItem('giatq_queue')||'[]')}catch(_){return[]}}
  function scheduleFlush(){
    clearTimeout(state.syncTimer);
    state.syncTimer=setTimeout(()=>flushQueue(),220); // tap beruntun digabung satu request
  }
  async function flushQueue(){
    if(!navigator.onLine||!state.sessionToken||state.syncInFlight)return;
    const sent=getQueue(); if(!sent.length)return;
    const sentIds=new Set(sent.map(x=>x.id));
    state.syncInFlight=true;
    setSyncState('syncing');
    try{
      // Kirim snapshot antrean. Tap baru yang terjadi selama request TIDAK boleh ikut terhapus.
      const bundle=await apiPost('syncEvents',{events:sent});
      const current=getQueue();
      const remaining=current.filter(x=>!sentIds.has(x.id));
      localStorage.setItem('giatq_queue',JSON.stringify(remaining));
      if(bundle?.activities){
        state.today=bundle;
        // Response server merefleksikan batch yang barusan dikirim. Re-apply tap yang lebih baru.
        applyQueuedEventsToToday(remaining);
        renderToday();
        localStorage.setItem('giatq_today_cache',JSON.stringify(state.today));
      }
      setSyncState(remaining.length?'pending':'synced');
    }catch(e){
      // Queue tetap ada; UI lokal tidak dibatalkan. Akan retry saat online/sync berikutnya.
      console.warn('GiatQ sync pending',e);
      setSyncState('pending');
    }finally{
      state.syncInFlight=false;
      if(getQueue().length && navigator.onLine) scheduleFlush();
    }
  }

  function applyQueuedEventsToToday(events){
    if(!state.today?.activities || !Array.isArray(events) || !events.length) return;
    for(const item of events){
      const body=item?.body||{};
      const a=state.today.activities.find(x=>String(x.activity_id)===String(body.activity_id));
      if(!a) continue;
      if(item.action==='toggleChecklist'){
        const done=body.done!==false;
        a.status=done?'DONE':'PENDING';
        a.completion_percent=done?100:0;
        a.progress_value=done?Number(a.target_value||1):0;
      }else if(item.action==='setProgress'){
        const value=Number(body.value||0);
        const target=Math.max(.0001,Number(a.target_value||1));
        a.progress_value=value;
        a.completion_percent=Math.min(100,Math.round(value/target*10000)/100);
        a.status=a.completion_percent>=100?'DONE':'PENDING';
      }
    }
    recomputeLocalScore();
  }
  function updateOnlineState(){
    $('#offlineBar').classList.toggle('hidden',navigator.onLine);
    setSyncState(navigator.onLine ? (getQueue().length?'pending':'synced') : 'offline');
  }
  function setSyncState(mode){
    const chip=document.querySelector('.sync-chip'); if(!chip)return;
    chip.dataset.state=mode;
    const label=chip.querySelector('span');
    if(label) label.textContent=mode==='syncing'?'Menyimpan…':mode==='pending'?'Menunggu sync':mode==='offline'?'Offline':'Tersinkron';
  }
  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.add('hidden'),2600)}
  function clientEventId(){return 'evt_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10)}
  function truthy(v){return v===true||v===1||String(v).toLowerCase()==='true'||String(v)==='1'}
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
})();
