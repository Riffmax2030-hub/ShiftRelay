const DEFAULT_SECTOR_CHECKLIST = {
  supervisor: [
    'I reviewed operational risks, active incidents, and compliance notices.',
    'Every priority task has an assigned owner and completion window.',
    'Team staffing, workspace systems, and shift resources are verified ready.',
    'The incoming team member has a clear escalation contact.'
  ],
  incoming: [
    'I understand the priority tasks and open operational items for this shift.',
    'I completed my pre-shift workstation readiness and compliance checks.',
    'I know the owner, deadline, and escalation path for urgent items.',
    'I accept responsibility for the listed shift actions.'
  ]
};
const shiftChecklist = {
  get supervisor() {
    const custom = window._srActiveUser?.industryProfile?.handoverChecklist?.supervisor;
    return Array.isArray(custom) && custom.length ? custom : DEFAULT_SECTOR_CHECKLIST.supervisor;
  },
  get incoming() {
    const custom = window._srActiveUser?.industryProfile?.handoverChecklist?.incoming;
    return Array.isArray(custom) && custom.length ? custom : DEFAULT_SECTOR_CHECKLIST.incoming;
  }
};
function checklistMarkup(items){return items.map((item,index)=>'<label class="checklist-item"><input type="checkbox" data-check-item="'+index+'" /><span>'+escape(item)+'</span></label>').join('')}
async function checklistHandover(id){const handovers=await getHandovers();const handover=handovers.find((item)=>item.id===id);if(!handover)throw new Error('Handover no longer exists.');return handover}
async function showChecklist(id,type){try{const item=await checklistHandover(id);const relay=type==='supervisor';dashboardHeader(relay?'Supervisor review':'Start shift',relay?'SHIFT QUALITY CHECK':'INCOMING SHIFT CHECKLIST');$('#dashboard').innerHTML='<section class="workspace-card checklist-card"><p class="eyebrow">'+(relay?'REVIEW BEFORE RELAY':'READY TO TAKE OVER')+'</p><h2>'+escape(item.handover.summary)+'</h2><p>Confirm the checks below before you continue this handover.</p><div class="handover-actions">'+item.handover.actions.map((action)=>'<p><b>'+escape(action.title)+'</b> — '+escape(action.owner)+', '+escape(action.due)+'</p>').join('')+'</div><div class="checklist-list">'+checklistMarkup(shiftChecklist[type])+'</div><button class="primary" id="complete-checklist" disabled>'+ (relay?'Confirm and relay handover':'Accept shift and actions')+'</button></section>';const button=$('#complete-checklist');const boxes=[...document.querySelectorAll('[data-check-item]')];boxes.forEach((box)=>box.addEventListener('change',()=>button.disabled=!boxes.every((entry)=>entry.checked)));button.addEventListener('click',()=>{
  if(typeof window.openSignaturePad==='function'){
    window.openSignaturePad(id,{
      role:relay?'supervisor':'incoming',
      summary:item.handover.summary,
      onSigned:(sigDataUrl)=>{
        updateHandover(id,relay?'relay':'acknowledge');
      }
    });
  }else{
    updateHandover(id,relay?'relay':'acknowledge');
  }
})}catch(error){toast(error.message)}}
function startSupervisorReview(id){return showChecklist(id,'supervisor')}
function startIncomingChecklist(id){return showChecklist(id,'incoming')}
