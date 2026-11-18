function accountMenu(){return $('#account-menu')}
function closeAccountMenu(){accountMenu()?.classList.add('hidden');$('#account-menu-button')?.setAttribute('aria-expanded','false')}
function applyTheme(){if(typeof window.applyTheme==='function')return;const t=localStorage.getItem('shiftrelay-theme')||'light';document.documentElement.dataset.theme=t;if(document.body)document.body.dataset.theme=t;}
function openPreferences(){closeAccountMenu();const existing=$('#preferences-dialog');if(existing){existing.remove();return}const isDark=document.documentElement.dataset.theme==='dark';const currentSound=window.SoundEngine?.getSoundPref?.()||'gentle';document.body.insertAdjacentHTML('beforeend',`<section class="profile-dialog" id="preferences-dialog"><div><button class="dialog-close" aria-label="Close">${Icons.close(16)}</button><p class="eyebrow">PERSONAL PREFERENCES</p><h2>Make ShiftRelay feel right.</h2><p>Configure theme, sound alerts, and shift alarms.</p><label class="language-choice" style="margin-bottom:16px;"><span>Appearance</span><div style="display:flex;gap:10px;margin-top:6px;"><button type="button" class="secondary ${!isDark?'active':''}" id="pref-btn-light" style="flex:1;min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:6px;">${Icons.sun(18)} Light</button><button type="button" class="secondary ${isDark?'active':''}" id="pref-btn-dark" style="flex:1;min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:6px;">${Icons.moon(18)} Dark</button></div></label><label class="language-choice" style="margin-bottom:16px;"><span>Shift Alarms &amp; Sound Alerts</span><div style="display:flex;gap:8px;margin-top:6px;"><button type="button" class="secondary ${currentSound==='mute'?'active':''}" id="sound-btn-mute" style="flex:1;min-height:40px;font-size:13px;">Mute</button><button type="button" class="secondary ${currentSound==='gentle'?'active':''}" id="sound-btn-gentle" style="flex:1;min-height:40px;font-size:13px;">Gentle</button><button type="button" class="secondary ${currentSound==='loud'?'active':''}" id="sound-btn-loud" style="flex:1;min-height:40px;font-size:13px;">Industrial Alarm</button></div></label><label class="language-choice"><span>Display language</span><select id="language-select">${Object.entries(languages).map(([code,name])=>`<option value="${code}" ${appLanguage()===code?'selected':''}>${name}</option>`).join('')}</select></label></div></section>`);$('.dialog-close').addEventListener('click',()=>$('#preferences-dialog').remove());$('#language-select').addEventListener('change',(event)=>setAppLanguage(event.target.value));$('#pref-btn-light').addEventListener('click',()=>{window.applyTheme?.('light',true);$('#preferences-dialog')?.remove();});$('#pref-btn-dark').addEventListener('click',()=>{window.applyTheme?.('dark',true);$('#preferences-dialog')?.remove();});$('#sound-btn-mute')?.addEventListener('click',()=>{window.SoundEngine?.setSoundPref('mute');toast('Audio alarms muted');$('#preferences-dialog')?.remove();});$('#sound-btn-gentle')?.addEventListener('click',()=>{window.SoundEngine?.setSoundPref('gentle');window.SoundEngine?.play('shift_alarm');toast('Gentle chime active');$('#preferences-dialog')?.remove();});$('#sound-btn-loud')?.addEventListener('click',()=>{window.SoundEngine?.setSoundPref('loud');window.SoundEngine?.play('shift_alarm');toast('High-urgency industrial alarm set');$('#preferences-dialog')?.remove();});}
function openPasswordChange(){closeAccountMenu();const existing=$('#password-dialog');if(existing){existing.remove();return}document.body.insertAdjacentHTML('beforeend',`<section class="profile-dialog" id="password-dialog"><div><button class="dialog-close" aria-label="Close">${Icons.close(16)}</button><p class="eyebrow">ACCOUNT SECURITY</p><h2>Change password</h2><form class="access-form" id="password-form"><label>Current password<input name="currentPassword" type="password" required autocomplete="current-password" /></label><label>New password<input name="newPassword" type="password" minlength="10" required autocomplete="new-password" /></label><label>Confirm new password<input name="confirmPassword" type="password" minlength="10" required autocomplete="new-password" /></label><p class="form-message" id="password-message"></p><button class="primary" type="submit">Update password</button></form></div></section>`);$('.dialog-close').addEventListener('click',()=>$('#password-dialog').remove());$('#password-form').addEventListener('submit',async(event)=>{event.preventDefault();const form=Object.fromEntries(new FormData(event.currentTarget));if(form.newPassword!==form.confirmPassword){$('#password-message').textContent='New passwords do not match.';return}try{await api('/api/auth/password',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});$('#password-dialog').remove();toast('Password updated successfully.')}catch(error){$('#password-message').textContent=error.message}})}
function signOut(){closeAccountMenu();$('#logout-button').click()}
function openSupportDesk(){
  closeAccountMenu();
  const existing=$('#support-desk-dialog');
  if(existing){existing.remove();return}
  document.body.insertAdjacentHTML('beforeend',`<section class="profile-dialog" id="support-desk-dialog"><div><button class="dialog-close" aria-label="Close">${Icons.close(16)}</button><p class="eyebrow">CUSTOMER CARE</p><h2>Contact Support</h2><p style="font-size:13px;opacity:0.8;margin-bottom:12px;">Every ticket routes directly to ShiftRelay Customer Care for review and solution.</p><form class="access-form" id="support-ticket-form"><label>Category<select name="category"><option value="Missing or Incorrect Shift Hours">Missing or Incorrect Shift Hours</option><option value="Wrong Bank Account / PenCom RSA PIN">Wrong Bank Account / PenCom RSA PIN</option><option value="Attendance / Geofence Issue">Attendance / Geofence Issue</option><option value="App Bug / Account Access">App Bug / Account Access</option><option value="Billing / Payroll Query">Billing / Payroll Query</option></select></label><label>Priority<select name="priority"><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></label><label>Subject<input name="subject" type="text" required placeholder="Short summary" /></label><label>Details<textarea name="details" rows="3" required placeholder="Describe the issue..."></textarea></label><p class="form-message" id="support-ticket-msg"></p><button class="primary" type="submit">Submit Support Ticket</button></form><div style="margin-top:16px;padding-top:12px;border-top:1px solid rgba(148,163,184,0.22);"><div style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">My Recent Tickets</div><div id="support-ticket-history" style="font-size:12.5px;opacity:0.85;">Loading...</div></div></div></section>`);
  $('#support-desk-dialog .dialog-close').addEventListener('click',()=>$('#support-desk-dialog').remove());
  async function loadMyTickets(){
    const box=$('#support-ticket-history');
    if(!box)return;
    try{
      const data=await api('/api/support/tickets');
      const list=data.tickets||[];
      if(!list.length){box.textContent='No support tickets yet.';return}
      box.innerHTML=list.slice(0,5).map(t=>{
        const msgs=Array.isArray(t.messages)&&t.messages.length?t.messages:[{author:t.name||'Me',role:'user',body:t.details||''}];
        return `<div style="padding:10px 12px;border-radius:10px;background:rgba(148,163,184,0.08);margin-bottom:8px;border:1px solid rgba(148,163,184,0.18);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
            <strong>${escape(t.id)} • ${escape(t.category)}</strong>
            <span style="font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;background:rgba(16,185,129,0.14);color:#10b981;">${escape(t.status)}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:8px;">
            ${msgs.map(m=>`<div style="padding:6px 9px;border-radius:7px;font-size:12px;background:${m.role==='support'?'rgba(16,185,129,0.12)':'rgba(15,23,42,0.18)'};border-left:3px solid ${m.role==='support'?'#10b981':'#38bdf8'};"><strong>${escape(m.author)}:</strong> ${escape(m.body)}</div>`).join('')}
          </div>
          <div style="display:flex;gap:6px;">
            <input type="text" id="sup-reply-${escape(t.id)}" placeholder="Reply to Customer Care..." style="flex:1;padding:6px 9px;border-radius:7px;border:1px solid rgba(148,163,184,0.28);font-size:12px;background:transparent;color:inherit;" />
            <button type="button" class="secondary" style="padding:5px 10px;font-size:11.5px;min-height:32px;" onclick="window.sendUserSupportReply('${escape(t.id)}')">Reply</button>
          </div>
        </div>`;
      }).join('');
    }catch(_){box.textContent='Sign in to view ticket history.';}
  }
  window.sendUserSupportReply=async function(recId){
    const inp=document.getElementById('sup-reply-'+recId);
    const message=(inp?.value||'').trim();
    if(!message)return;
    try{
      await api(`/api/support/tickets/${encodeURIComponent(recId)}/reply`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});
      if(inp)inp.value='';
      loadMyTickets();
      toast('Reply sent to Customer Care.');
    }catch(err){toast(err.message||'Could not send reply.');}
  };
  loadMyTickets();
  $('#support-ticket-form').addEventListener('submit',async(event)=>{
    event.preventDefault();
    const form=Object.fromEntries(new FormData(event.currentTarget));
    const msg=$('#support-ticket-msg');
    try{
      const res=await api('/api/support/tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      if(msg)msg.textContent=`Ticket ${res.ticket?.id||''} sent to Customer Care.`;
      event.currentTarget.reset();
      loadMyTickets();
      toast('Support ticket sent to Customer Care.');
    }catch(error){
      if(msg)msg.textContent=error.message;
    }
  });
}
function renderAccountMenu(){if(accountMenu())return;const isDark=document.documentElement.dataset.theme==='dark';document.body.insertAdjacentHTML('beforeend',`<aside class="account-menu hidden" id="account-menu"><button class="account-profile" data-account-action="profile"><span class="avatar" id="account-avatar"></span><span><strong>${escape(state.user?.name||'My profile')}</strong><small>Edit profile photo and details</small></span></button><div class="account-menu-list"><button data-account-action="toggle-theme"><span id="account-menu-theme-label">${isDark?'Switch to Light Mode':'Switch to Dark Mode'}</span></button><button data-account-action="preferences">Preferences</button><button data-account-action="support">Contact Support</button><button data-account-action="password">Change password</button>${state.user?.role==='owner'?'<button data-account-action="settings">Organisation settings</button>':''}<button data-account-action="delete-account">Delete account</button><button data-account-action="signout" class="danger">Sign out</button></div><footer>© ${new Date().getFullYear()} ShiftRelay</footer></aside>`);const avatar=$('#account-avatar');if(state.user?.avatar_data_url)avatar.innerHTML=`<img src="${state.user.avatar_data_url}" alt="" />`;else avatar.textContent=(state.user?.name||'?').split(' ').map((part)=>part[0]).join('');accountMenu().addEventListener('click',(event)=>{const action=event.target.closest('[data-account-action]')?.dataset.accountAction;if(action==='profile'){closeAccountMenu();openProfile()}if(action==='toggle-theme'){window.toggleTheme?.();closeAccountMenu()}if(action==='preferences')openPreferences();if(action==='support')openSupportDesk();if(action==='password')openPasswordChange();if(action==='settings'){closeAccountMenu();go('settings')}if(action==='delete-account')window.location.assign('/delete-account.html');if(action==='signout')signOut()})}
document.addEventListener('click',(event)=>{if(event.target.closest('#account-menu-button')||event.target.closest('#mobile-menu-button')){renderAccountMenu();const menu=accountMenu();menu.classList.toggle('hidden');$('#account-menu-button')?.setAttribute('aria-expanded',String(!menu.classList.contains('hidden')))}else if(!event.target.closest('#account-menu'))closeAccountMenu()});
