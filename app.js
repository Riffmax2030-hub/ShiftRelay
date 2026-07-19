const captureView = document.querySelector('#capture-view');
const handoverView = document.querySelector('#handover-view');
const successView = document.querySelector('#success-view');
const notes = document.querySelector('#shift-notes');
const defaultNotes = notes.value;
const generateButton = document.querySelector('#generate-button');
const statusMessage = document.querySelector('#analysis-status');
const userSelect = document.querySelector('#user-select');
let currentHandover = null;
let savedHandoverId = null;
let mediaRecorder;
let recordedChunks = [];

const demoHandover = { summary: '3 items need the incoming team’s attention.', actions: [ { title: 'Monitor cold-room temperature', priority: 'high', due: 'Before 23:00', owner: 'Night supervisor', evidence: 'Temperature briefly reached 9°C at 17:40. It is currently stable at 4°C; generator has been checked.' }, { title: 'Confirm delayed pharmacy delivery', priority: 'medium', due: 'By 22:30', owner: 'Charge nurse', evidence: 'Supplier promised delivery by 20:00, but no tracking number was provided. Four insulin doses remain in stock.' }, { title: 'Call Mr. Otieno’s family', priority: 'low', due: 'After 21:30 round', owner: 'Ward nurse', evidence: 'Family is awaiting a discharge update. Doctor’s signature is still pending.' } ], missing_context: [{ question: 'Who has the maintenance-line number?', why_it_matters: 'The night team needs to respond immediately if the temperature rises again.' }] };

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character]); }
async function api(path, options = {}) { const response = await fetch(path, { ...options, headers: { 'X-ShiftRelay-User': userSelect.value, ...(options.headers || {}) } }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Request failed.'); return payload; }

function renderHandover(handover) {
  currentHandover = handover;
  document.querySelector('#handover-summary').textContent = handover.summary;
  const actions = handover.actions.map((action) => `<article class="priority-card"><div class="card-label"><span class="severity ${escapeHtml(action.priority)}">${escapeHtml(action.priority)} priority</span><span>${escapeHtml(action.due)}</span></div><h3>${escapeHtml(action.title)}</h3><p>${escapeHtml(action.evidence)}</p><div class="card-footer"><span>Owner: <b>${escapeHtml(action.owner)}</b></span><span class="source">Source: shift update</span></div></article>`).join('');
  const gap = handover.missing_context[0];
  const gapCard = gap ? `<article class="gap-card"><span class="icon gap">?</span><div><p class="eyebrow">MISSING DETAIL</p><h3>${escapeHtml(gap.question)}</h3><p>${escapeHtml(gap.why_it_matters)}</p><button id="resolve-gap">Mark as resolved</button></div></article>` : '';
  document.querySelector('#handover-grid').innerHTML = actions + gapCard;
  document.querySelector('#resolve-gap')?.addEventListener('click', (event) => { event.currentTarget.closest('.gap-card').innerHTML = '<span class="icon task">✓</span><div><p class="eyebrow">CONTEXT ADDED</p><h3>Context marked as resolved.</h3><p>The incoming team has the information needed to act.</p></div>'; });
}

async function refreshInbox() {
  try {
    const { handovers } = await api('/api/handovers');
    const list = document.querySelector('#inbox-list');
    if (!handovers.length) { list.innerHTML = '<p class="empty-state">No handovers are waiting for this role.</p>'; return; }
    list.innerHTML = handovers.map((handover) => `<article class="inbox-item"><div><span class="status ${handover.status}">${escapeHtml(handover.status.replace('_', ' '))}</span><h3>${escapeHtml(handover.handover.summary)}</h3><p>${new Date(handover.createdAt).toLocaleString()} · ${handover.handover.actions.length} action items</p></div><div class="inbox-actions">${handover.status === 'awaiting_review' && userSelect.value === 'david' ? `<button data-relay="${handover.id}">Review & relay</button>` : ''}${handover.status === 'relayed' && userSelect.value === 'faith' ? `<button data-acknowledge="${handover.id}">Acknowledge</button>` : ''}${handover.acknowledgement ? '<span class="acknowledged">✓ acknowledged</span>' : ''}</div></article>`).join('');
    document.querySelectorAll('[data-relay]').forEach((button) => button.addEventListener('click', () => updateHandover(button.dataset.relay, 'relay')));
    document.querySelectorAll('[data-acknowledge]').forEach((button) => button.addEventListener('click', () => updateHandover(button.dataset.acknowledge, 'acknowledge')));
  } catch (error) { document.querySelector('#inbox-list').innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`; }
}

async function refreshNotifications() {
  try { const { notifications } = await api('/api/notifications'); document.querySelector('#notification-count').textContent = notifications.filter((item) => !item.read).length; document.querySelector('#notification-list').innerHTML = notifications.length ? notifications.map((item) => `<p class="notification ${item.read ? '' : 'unread'}">${escapeHtml(item.message)}</p>`).join('') : '<p class="empty-state">You are all caught up.</p>'; } catch {}
}
async function updateHandover(id, action) { try { await api(`/api/handovers/${id}/${action}`, { method: 'POST' }); await Promise.all([refreshInbox(), refreshNotifications()]); } catch (error) { statusMessage.textContent = error.message; } }

generateButton.addEventListener('click', async () => {
  if (!notes.value.trim()) { notes.focus(); return; }
  generateButton.disabled = true; generateButton.textContent = 'Analysing update…'; savedHandoverId = null;
  let handover = demoHandover;
  try { handover = (await api('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: notes.value }) })).handover; statusMessage.textContent = 'Live GPT-5.6 Sol analysis completed securely on the server.'; }
  catch { statusMessage.textContent = 'Showing the included demo handover. Add OPENAI_API_KEY and OPENAI_MODEL to use live GPT-5.6 Sol analysis.'; }
  generateButton.disabled = false; generateButton.innerHTML = 'Generate handover <span>→</span>'; renderHandover(handover); captureView.classList.add('hidden'); handoverView.classList.remove('hidden'); document.querySelectorAll('.step')[0].classList.remove('active'); document.querySelectorAll('.step')[1].classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelector('#save-button').addEventListener('click', async () => { if (!currentHandover) return; try { const result = await api('/api/handovers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: notes.value, handover: currentHandover, assignedTo: 'faith' }) }); savedHandoverId = result.handover.id; statusMessage.textContent = 'Handover saved and sent to the supervisor’s review queue.'; await Promise.all([refreshInbox(), refreshNotifications()]); } catch (error) { statusMessage.textContent = error.message; } });
document.querySelector('#download-button').addEventListener('click', () => { if (!currentHandover) return; const actions = currentHandover.actions.map((action, index) => `${index + 1}. ${action.title}\n   Priority: ${action.priority}\n   Owner: ${action.owner}\n   Due: ${action.due}\n   Evidence: ${action.evidence}`).join('\n\n'); const gaps = currentHandover.missing_context.map((gap) => `- ${gap.question} (${gap.why_it_matters})`).join('\n'); const brief = `SHIFTRELAY HANDOVER BRIEF\n\n${currentHandover.summary}\n\nOPEN ACTIONS\n${actions}\n\nMISSING CONTEXT\n${gaps || 'None recorded.'}\n`; const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([brief], { type: 'text/plain' })); link.download = 'shiftrelay-handover.txt'; link.click(); URL.revokeObjectURL(link.href); });
document.querySelector('#relay-button').addEventListener('click', async () => { if (!savedHandoverId) { statusMessage.textContent = 'Save this handover first. The supervisor can then review and relay it.'; return; } await updateHandover(savedHandoverId, 'relay'); handoverView.classList.add('hidden'); successView.classList.remove('hidden'); });
document.querySelector('#clear-button').addEventListener('click', () => { notes.value = ''; notes.focus(); });
document.querySelector('#edit-button').addEventListener('click', () => { handoverView.classList.add('hidden'); captureView.classList.remove('hidden'); });
document.querySelector('#new-handover').addEventListener('click', () => { successView.classList.add('hidden'); captureView.classList.remove('hidden'); notes.value = defaultNotes; });
document.querySelector('#refresh-button').addEventListener('click', () => { refreshInbox(); refreshNotifications(); });
userSelect.addEventListener('change', () => { refreshInbox(); refreshNotifications(); });
document.querySelector('#notification-button').addEventListener('click', () => document.querySelector('#notification-panel').classList.toggle('hidden'));
document.querySelector('#mark-read-button').addEventListener('click', async () => { await api('/api/notifications/read', { method: 'POST' }); refreshNotifications(); });

document.querySelector('#record-button').addEventListener('click', async () => {
  const recordButton = document.querySelector('#record-button'); const voiceStatus = document.querySelector('#voice-status');
  if (mediaRecorder?.state === 'recording') { mediaRecorder.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); recordedChunks = []; mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.addEventListener('dataavailable', (event) => recordedChunks.push(event.data));
    mediaRecorder.addEventListener('stop', async () => { stream.getTracks().forEach((track) => track.stop()); recordButton.textContent = '● Record voice update'; voiceStatus.textContent = 'Transcribing securely…'; try { const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType }); const response = await fetch('/api/transcribe', { method: 'POST', headers: { 'X-ShiftRelay-User': userSelect.value, 'Content-Type': blob.type }, body: blob }); const result = await response.json(); if (!response.ok) throw new Error(result.error); notes.value = `${notes.value}\n\n${result.transcript}`.trim(); voiceStatus.textContent = 'Voice update added to your shift note.'; } catch { voiceStatus.textContent = 'Voice transcription needs OPENAI_API_KEY and OPENAI_TRANSCRIPTION_MODEL. Your recording was not saved.'; } });
    mediaRecorder.start(); recordButton.textContent = '■ Stop recording'; voiceStatus.textContent = 'Recording…';
  } catch { voiceStatus.textContent = 'Microphone access was not granted.'; }
});

refreshInbox();
refreshNotifications();
