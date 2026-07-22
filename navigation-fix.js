function configureNavigation(){
  if(!state.user)return;
  const role=state.user.role;
  const hasOrganisation=Boolean(state.user.organisation_id||state.user.organisationId);
  const allowed=new Set(['dashboard','activity','notifications','incidents']);
  if(role==='outgoing')allowed.add('handover');
  if(hasOrganisation){allowed.add('calendar');allowed.add('community')}
  if(role==='owner'&&hasOrganisation)['people','workflows','analytics','settings'].forEach((view)=>allowed.add(view));
  const order=role==='owner'?['dashboard','analytics','people','workflows','calendar','community','notifications','incidents','settings']:['dashboard','handover','calendar','activity','community','notifications','incidents'];
  const nav=$('.side-nav');
  order.forEach((view)=>{const button=nav.querySelector(`[data-view="${view}"]`);if(button)nav.append(button)});
  document.querySelectorAll('.side-nav button').forEach((button)=>button.classList.toggle('hidden',!allowed.has(button.dataset.view)));
  const active=document.querySelector('.side-nav button.active');
  if(active?.classList.contains('hidden'))document.querySelector('.side-nav button[data-view="dashboard"]')?.classList.add('active');
}

go=async function(view){
  const buttons=document.querySelectorAll('.side-nav button');
  if(state.navigating)return;
  state.navigating=true;
  buttons.forEach((button)=>{button.disabled=true;button.classList.toggle('active',button.dataset.view===view)});
  document.querySelectorAll('.mobile-nav [data-go]').forEach((button)=>button.classList.toggle('active',button.dataset.go===view));
  dashboardHeader('Loading…');
  $('#dashboard').innerHTML='<p class="empty">Loading your workspace…</p>';
  try{
    if(view==='handover'){await renderHandoverForm();await enhanceRelayHistory();}
    else if(view==='activity')await renderActivity();
    else if(view==='notifications')await renderNotificationCentre();
    else if(view==='calendar')await renderCalendar();
    else if(view==='community')await renderCommunity();
    else if(view==='people')await renderPeople();
    else if(view==='workflows')await renderWorkflows();
    else if(view==='analytics')await renderAnalytics();
    else if(view==='incidents')await renderIncidents();
    else if(view==='settings')await renderSettings();
    else await renderDashboard();
  }catch(error){
    $('#dashboard').innerHTML=`<p class="empty">${escape(error.message||'Unable to load this page.')}</p>`;
  }finally{
    state.navigating=false;
    buttons.forEach((button)=>button.disabled=false);
  }
};

async function enhanceRelayHistory(){const dashboard=$('#dashboard');if(!dashboard||$('#relay-history'))return;try{const handovers=await getHandovers();dashboard.insertAdjacentHTML('beforeend',`<section class="workspace-card relay-history" id="relay-history"><p class="eyebrow">YOUR RELAY HISTORY</p><h2>Every handover in one place.</h2><p>Follow updates from creation through review and acknowledgement.</p>${handoverList(handovers,'')}</section>`)}catch(error){console.warn('Relay history unavailable',error)}}

const loadDashboard=renderDashboard;
renderDashboard=async function(){
  dashboardHeader('Dashboard');
  const hour=new Date().getHours();
  const greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
  const firstName=escape(state.user.name.split(' ')[0]);
  $('#dashboard').innerHTML=`<section class="welcome-card"><div><p class="eyebrow">YOUR WORKDAY, YOUR FLOW</p><h2>${greeting}, ${firstName}</h2><p>Stay clear, stay connected, and make the next person’s work easier.</p></div><div class="welcome-activity"><span>RECENT ACTIVITY</span><strong>Preparing your shift workspace…</strong></div></section><div class="metric-grid metric-grid-compact dashboard-metrics-loading"><article class="metric"><span>Review</span><strong>—</strong></article><article class="metric"><span>Incoming shift</span><strong>—</strong></article><article class="metric"><span>Acknowledged</span><strong>—</strong></article></div>`;
  try{await loadDashboard()}catch(error){
    console.warn('Dashboard details unavailable',error);
    bindNavigation();
  }
};

var workerSupportVersion=0;
renderWorkerSupport=function(){
  if(!state.user||state.user.role==='owner'||$('#page-title').textContent!=='Dashboard')return Promise.resolve();
  const dashboard=$('#dashboard');
  const version=String(++workerSupportVersion);
  const shift=state.user.shift_start&&state.user.shift_end?`${String(state.user.shift_start).slice(0,5)}–${String(state.user.shift_end).slice(0,5)}`:'Schedule pending';
  const localTime=state.user.time_zone?new Intl.DateTimeFormat(undefined,{timeZone:state.user.time_zone,dateStyle:'medium',timeStyle:'short'}).format(new Date()):new Date().toLocaleString();
  const savedClockState=sessionStorage.getItem('shiftrelay-clock-active');
  const hasSavedClockState=savedClockState!==null;
  const active=savedClockState==='true';
  dashboard.insertAdjacentHTML('afterbegin',`<section class="worker-support" data-worker-support-version="${version}"><article class="clock-card"><p class="eyebrow">MY SHIFT</p><h2>${hasSavedClockState?(active?'You are clocked in':'Ready to start work?'):'Preparing your shift tools…'}</h2><p>${escape(shift)} · ${escape(localTime)}</p><div class="button-row"><button class="primary" id="clock-button" ${hasSavedClockState?'':'disabled'}>${hasSavedClockState?(active?'Clock out':'Clock in'):'Syncing…'}</button><span>${hasSavedClockState?'Your live hours will refresh shortly.':'Checking your hours…'}</span></div></article><article class="quote-card"><p class="eyebrow">A NOTE FOR YOUR SHIFT</p><blockquote>“Small, clear updates make the whole team stronger.”</blockquote><p>— ShiftRelay</p></article><article class="history-card"><p class="eyebrow">THIS MONTH</p><h3>Work history</h3><ul><li>Loading your logged hours…</li></ul></article><article class="assistant-card"><p class="eyebrow">QUICK WORK ASSISTANT</p><h3>Ask about your work update</h3></article></section>`);
  const support=dashboard.querySelector(`[data-worker-support-version="${version}"]`);support.dataset.workerName=state.user.name;support.dataset.workerTitle=state.user.title||'Workplace member';dashboard.insertAdjacentHTML('beforeend','<button class="assistant-fab" id="assistant-fab" aria-label="Open Relay Assistant">✦</button>');$('#assistant-fab').addEventListener('click',()=>go('handover'));
  support.querySelector('[data-go]')?.addEventListener('click',(event)=>go(event.currentTarget.dataset.go));
  Promise.allSettled([api('/api/time-entries'),api('/api/wellbeing-quote')]).then(([timeResult,quoteResult])=>{
    if($('#page-title').textContent!=='Dashboard'||support.dataset.workerSupportVersion!==String(workerSupportVersion))return;
    if(timeResult.status==='fulfilled'){
      const time=timeResult.value;
      sessionStorage.setItem('shiftrelay-clock-active',String(Boolean(time.active)));
      updateClockCard(time,time.active);
      const history=support.querySelector('.history-card ul');
      if(history)history.innerHTML=time.entries.slice(0,4).map((entry)=>`<li>${new Date(entry.clocked_in_at).toLocaleDateString()} · ${Number(entry.hours).toFixed(1)} hours</li>`).join('')||'<li>No shifts logged this month.</li>';
    }
    if(quoteResult.status==='fulfilled'){
      support.querySelector('.quote-card blockquote').textContent=`“${quoteResult.value.quote.text}”`;
      support.querySelector('.quote-card p:not(.eyebrow)').textContent=`— ${quoteResult.value.quote.author}`;
    }
  });
  return Promise.resolve();
};

function updateClockCard(summary,active){
  const card=$('.clock-card');
  if(!card)return;
  const button=card.querySelector('#clock-button');
  const heading=card.querySelector('h2');
  const details=card.querySelector('p:not(.eyebrow)');
  const shift=state.user.shift_start&&state.user.shift_end?`${String(state.user.shift_start).slice(0,5)}–${String(state.user.shift_end).slice(0,5)}`:'Schedule pending';
  const localTime=state.user.time_zone?new Intl.DateTimeFormat(undefined,{timeZone:state.user.time_zone,dateStyle:'medium',timeStyle:'short'}).format(new Date()):new Date().toLocaleString();
  heading.textContent=active?'You are clocked in':'Ready to start work?';
  details.textContent=`${shift} · ${localTime}`;
  button.textContent=active?'Clock out':'Clock in';
  button.disabled=false;
  const hours=card.querySelector('.button-row span');
  if(hours)hours.textContent=`${summary.weekHours}h this week · ${summary.totalHours}h this month`;
  sessionStorage.setItem('shiftrelay-clock-active',String(active));
}

document.addEventListener('click',async(event)=>{
  const button=event.target.closest('#clock-button');
  if(!button||button.disabled)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const wasActive=button.textContent.trim()==='Clock out';
  button.disabled=true;
  button.textContent=wasActive?'Clocking out…':'Clocking in…';
  const heading=button.closest('.clock-card')?.querySelector('h2');
  if(heading)heading.textContent=wasActive?'Wrapping up your shift…':'Starting your shift…';
  try{
    const summary=await api(wasActive?'/api/time-entries/clock-out':'/api/time-entries/clock-in',{method:'POST'});
    updateClockCard(summary,!wasActive);
    toast(wasActive?'Clocked out. Great work today.':'You are clocked in. Have a focused shift.');
  }catch(error){
    updateClockCard({weekHours:'—',totalHours:'—'},wasActive);
    toast(error.message);
  }
},true);
