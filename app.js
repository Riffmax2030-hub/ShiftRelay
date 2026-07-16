const captureView = document.querySelector('#capture-view');
const handoverView = document.querySelector('#handover-view');
const successView = document.querySelector('#success-view');
const notes = document.querySelector('#shift-notes');
const defaultNotes = notes.value;
const generateButton = document.querySelector('#generate-button');
const statusMessage = document.querySelector('#analysis-status');

const demoHandover = {
  summary: '3 items need the incoming team’s attention.',
  actions: [
    { title: 'Monitor cold-room temperature', priority: 'high', due: 'Before 23:00', owner: 'Night supervisor', evidence: 'Temperature briefly reached 9°C at 17:40. It is currently stable at 4°C; generator has been checked.' },
    { title: 'Confirm delayed pharmacy delivery', priority: 'medium', due: 'By 22:30', owner: 'Charge nurse', evidence: 'Supplier promised delivery by 20:00, but no tracking number was provided. Four insulin doses remain in stock.' },
    { title: 'Call Mr. Otieno’s family', priority: 'low', due: 'After 21:30 round', owner: 'Ward nurse', evidence: 'Family is awaiting a discharge update. Doctor’s signature is still pending.' }
  ],
  missing_context: [{ question: 'Who has the maintenance-line number?', why_it_matters: 'The night team needs to respond immediately if the temperature rises again.' }]
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character]);
}

function renderHandover(handover) {
  document.querySelector('#handover-summary').textContent = handover.summary;
  const actionCards = handover.actions.map((action) => `<article class="priority-card"><div class="card-label"><span class="severity ${escapeHtml(action.priority)}">${escapeHtml(action.priority)} priority</span><span>${escapeHtml(action.due)}</span></div><h3>${escapeHtml(action.title)}</h3><p>${escapeHtml(action.evidence)}</p><div class="card-footer"><span>Owner: <b>${escapeHtml(action.owner)}</b></span><span class="source">Source: shift update</span></div></article>`).join('');
  const gap = handover.missing_context[0];
  const gapCard = gap ? `<article class="gap-card"><span class="icon gap">?</span><div><p class="eyebrow">MISSING DETAIL</p><h3>${escapeHtml(gap.question)}</h3><p>${escapeHtml(gap.why_it_matters)}</p><button id="resolve-gap">Mark as resolved</button></div></article>` : '';
  document.querySelector('#handover-grid').innerHTML = actionCards + gapCard;
  document.querySelector('#resolve-gap')?.addEventListener('click', (event) => {
    event.currentTarget.closest('.gap-card').innerHTML = '<span class="icon task">✓</span><div><p class="eyebrow">CONTEXT ADDED</p><h3>Context marked as resolved.</h3><p>The incoming team has the information needed to act.</p></div>';
  });
}

generateButton.addEventListener('click', async () => {
  if (!notes.value.trim()) {
    notes.focus();
    notes.placeholder = 'Add at least one shift update to create a handover.';
    return;
  }
  generateButton.disabled = true;
  generateButton.textContent = 'Analysing update…';
  let handover = demoHandover;
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: notes.value }) });
    if (!response.ok) throw new Error('Live analysis is not configured.');
    const result = await response.json();
    handover = result.handover;
    statusMessage.textContent = 'Live GPT-5.6 Sol analysis completed securely on the server.';
  } catch {
    statusMessage.textContent = 'Showing the included demo handover. Add OPENAI_API_KEY and OPENAI_MODEL to use live GPT-5.6 Sol analysis.';
  } finally {
    generateButton.disabled = false;
    generateButton.innerHTML = 'Generate handover <span>→</span>';
  }
  renderHandover(handover);
  captureView.classList.add('hidden');
  handoverView.classList.remove('hidden');
  document.querySelectorAll('.step')[0].classList.remove('active');
  document.querySelectorAll('.step')[1].classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelector('#clear-button').addEventListener('click', () => { notes.value = ''; notes.focus(); });
document.querySelector('#edit-button').addEventListener('click', () => {
  handoverView.classList.add('hidden');
  captureView.classList.remove('hidden');
  document.querySelectorAll('.step')[1].classList.remove('active');
  document.querySelectorAll('.step')[0].classList.add('active');
});
document.querySelector('#resolve-gap').addEventListener('click', (event) => {
  event.currentTarget.closest('.gap-card').innerHTML = '<span class="icon task">✓</span><div><p class="eyebrow">CONTEXT ADDED</p><h3>Maintenance contact is saved with the handover.</h3><p>The night supervisor can now respond immediately if the temperature rises.</p></div>';
});
document.querySelector('#relay-button').addEventListener('click', () => {
  handoverView.classList.add('hidden');
  successView.classList.remove('hidden');
  document.querySelectorAll('.step')[1].classList.remove('active');
  document.querySelectorAll('.step')[2].classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
document.querySelector('#new-handover').addEventListener('click', () => {
  successView.classList.add('hidden');
  captureView.classList.remove('hidden');
  notes.value = defaultNotes;
  document.querySelectorAll('.step')[2].classList.remove('active');
  document.querySelectorAll('.step')[0].classList.add('active');
});
