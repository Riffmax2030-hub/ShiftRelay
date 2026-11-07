const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'phase1-shell.js');
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

console.log('Original line count:', lines.length);

// ── 1. Role Helpers (around line 238) ────────────────────────────────────────
const roleHelperIdx = lines.findIndex(l => l.includes('function isManagerRole(role)'));
const roleHelperEnd = lines.findIndex((l, i) => i > roleHelperIdx && l.includes('return isManager ? allowedManager.includes(viewName) : allowedWorker.includes(viewName);'));

if (roleHelperIdx !== -1 && roleHelperEnd !== -1) {
  const newRoleHelpers = [
    '  function isManagerRole(role) {',
    "    return role === 'supervisor' || role === 'owner' || role === 'executive' || role === 'admin';",
    '  }',
    '',
    '  function isExecutiveRole(role) {',
    "    return role === 'owner' || role === 'executive' || role === 'admin';",
    '  }',
    '',
    '  function isAuthorizedView(viewName, isManager, role) {',
    '    const allowedWorker = [',
    "      'today', 'handovers', 'me', 'schedule', 'earnings', 'rewards',",
    "      'assistant', 'time-away', 'timeaway-leave', 'timesheets',",
    "      'settings', 'open-shifts', 'kiosk', 'gate-kiosk', 'compliance', 'notifications'",
    '    ];',
    '    const allowedSupervisor = [',
    "      'overview', 'schedule', 'handovers', 'team', 'approvals', 'me',",
    "      'timesheets', 'open-shifts', 'earnings', 'rewards', 'assistant',",
    "      'time-away', 'timeaway-leave', 'compliance', 'settings', 'kiosk', 'gate-kiosk', 'notifications'",
    '    ];',
    '    const allowedExecutive = [',
    "      'analytics', 'overview', 'schedule', 'team', 'approvals', 'me',",
    "      'compliance', 'payroll', 'timesheets', 'handovers', 'open-shifts',",
    "      'earnings', 'rewards', 'assistant', 'time-away', 'timeaway-leave',",
    "      'settings', 'kiosk', 'gate-kiosk', 'notifications'",
    '    ];',
    "    if (role === 'owner' || role === 'executive' || role === 'admin') {",
    '      return allowedExecutive.includes(viewName);',
    '    }',
    "    if (role === 'supervisor') {",
    '      return allowedSupervisor.includes(viewName);',
    '    }',
    '    return allowedWorker.includes(viewName);',
    '  }'
  ];
  lines.splice(roleHelperIdx, (roleHelperEnd + 2) - roleHelperIdx, ...newRoleHelpers);
  console.log('1. Updated role helpers.');
}

// ── 2. MountShell Default View & Role Resolution ─────────────────────────────
const mountDefaultsIdx = lines.findIndex(l => l.includes('const defaultView = isManager ?'));
const mountDefaultsEnd = lines.findIndex((l, i) => i > mountDefaultsIdx && l.includes("view = 'overview';"));

if (mountDefaultsIdx !== -1 && mountDefaultsEnd !== -1) {
  const newMountDefaults = [
    '    const isExecutive = isExecutiveRole(user.role);',
    "    const isSupervisor = user.role === 'supervisor';",
    '    const isManager = isExecutive || isSupervisor;',
    "    const defaultView = isExecutive ? 'analytics' : (isSupervisor ? 'overview' : 'today');",
    '    let view = activeView || defaultView;',
    '    // Prevent cross-role view mismatch',
    "    if (!isManager && (view === 'overview' || view === 'payroll' || view === 'analytics' || view === 'approvals')) {",
    "      view = 'today';",
    "    } else if (isSupervisor && view === 'today') {",
    "      view = 'overview';",
    "    } else if (isExecutive && view === 'today') {",
    "      view = 'analytics';",
    '    }'
  ];
  lines.splice(mountDefaultsIdx - 1, (mountDefaultsEnd + 2) - (mountDefaultsIdx - 1), ...newMountDefaults);
  console.log('2. Updated mountShell default view routing.');
}

// ── 3. Desktop Sidebar Navigation ────────────────────────────────────────────
const sidebarIdx = lines.findIndex(l => l.includes('<!-- Desktop Sidebar'));
const sidebarEnd = lines.findIndex((l, i) => i > sidebarIdx && l.includes('<!-- Main Scrollable Area'));

if (sidebarIdx !== -1 && sidebarEnd !== -1) {
  const newSidebarLines = [
    '          <!-- Desktop Sidebar (3 Distinct Roles: Executive vs Supervisor vs Worker) -->',
    '          <nav class="sr-sidebar" aria-label="Sidebar navigation">',
    '            <div class="sr-sidebar-role-badge">',
    "              ${isExecutive ? 'Corporate Executive' : isSupervisor ? 'Shift Supervisor' : 'Frontline Specialist'}",
    '            </div>',
    '            ${isExecutive ? `',
    '              <!-- 6 Clean Tabs: Corporate Executive Layer -->',
    '              <button class="sr-nav-btn ${view === \'analytics\' ? \'active\' : \'\'}" data-sr-view="analytics">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
    '                <span>Executive</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${view === \'schedule\' ? \'active\' : \'\'}" data-sr-view="schedule">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    '                <span>Schedule</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${(view === \'team\' || view === \'approvals\') ? \'active\' : \'\'}" data-sr-view="team">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    '                <span>Workforce</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${view === \'compliance\' ? \'active\' : \'\'}" data-sr-view="compliance">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
    '                <span>Compliance</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${view === \'payroll\' ? \'active\' : \'\'}" data-sr-view="payroll">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/><polyline points="15 15 21 21 15 21"/></svg>',
    '                <span>Finance</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${view === \'settings\' ? \'active\' : \'\'}" data-sr-view="settings" style="margin-top:auto;">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    '                <span>Organisation</span>',
    '              </button>',
    '            ` : isSupervisor ? `',
    '              <!-- 6 Clean Tabs: Shift Supervisor Floor Layer -->',
    '              <button class="sr-nav-btn ${view === \'overview\' ? \'active\' : \'\'}" data-sr-view="overview">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
    '                <span>Shift Ops</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${view === \'schedule\' ? \'active\' : \'\'}" data-sr-view="schedule">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    '                <span>Schedule</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${(view === \'timesheets\' || view === \'time-away\') ? \'active\' : \'\'}" data-sr-view="timesheets">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    '                <span>Attendance</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${(view === \'team\' || view === \'approvals\') ? \'active\' : \'\'}" data-sr-view="team">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    '                <span>Team</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${view === \'handovers\' ? \'active\' : \'\'}" data-sr-view="handovers">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    '                <span>Handovers</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${view === \'settings\' ? \'active\' : \'\'}" data-sr-view="settings" style="margin-top:auto;">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    '                <span>Settings</span>',
    '              </button>',
    '            ` : `',
    '              <!-- 6 Clean Tabs: Frontline Worker Layer -->',
    '              <button class="sr-nav-btn ${view === \'today\' ? \'active\' : \'\'}" data-sr-view="today">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    '                <span>Today</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${view === \'schedule\' ? \'active\' : \'\'}" data-sr-view="schedule">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    '                <span>Schedule</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${(view === \'time-away\' || view === \'timesheets\') ? \'active\' : \'\'}" data-sr-view="timesheets">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    '                <span>Attendance</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${(view === \'earnings\' || view === \'rewards\') ? \'active\' : \'\'}" data-sr-view="earnings">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    '                <span>Earnings</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${view === \'open-shifts\' ? \'active\' : \'\'}" data-sr-view="open-shifts">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/></svg>',
    '                <span>Shifts</span>',
    '              </button>',
    '              <button class="sr-nav-btn ${view === \'settings\' ? \'active\' : \'\'}" data-sr-view="settings" style="margin-top:auto;">',
    '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    '                <span>Settings</span>',
    '              </button>',
    '            `}',
    '          </nav>'
  ];
  lines.splice(sidebarIdx, sidebarEnd - sidebarIdx, ...newSidebarLines);
  console.log('3. Updated desktop sidebar.');
}

// ── 4. Mobile Bottom Dock Navigation ─────────────────────────────────────────
const dockIdx = lines.findIndex(l => l.includes('<!-- Mobile Bottom Dock'));
const dockEnd = lines.findIndex((l, i) => i > dockIdx && l.includes('</nav>'));

if (dockIdx !== -1 && dockEnd !== -1) {
  const newDockLines = [
    '        <!-- Mobile Bottom Dock (3 Distinct Roles: Executive vs Supervisor vs Worker) -->',
    '        <nav class="sr-mobile-dock" aria-label="Mobile navigation">',
    '          ${isExecutive ? `',
    '            <!-- 6 Tabs: Corporate Executive Mobile Dock -->',
    '            <button class="sr-dock-item ${view === \'analytics\' ? \'active\' : \'\'}" data-sr-view="analytics">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
    '              <span class="sr-dock-label">Executive</span>',
    '            </button>',
    '            <button class="sr-dock-item ${view === \'schedule\' ? \'active\' : \'\'}" data-sr-view="schedule">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    '              <span class="sr-dock-label">Schedule</span>',
    '            </button>',
    '            <button class="sr-dock-item ${(view === \'team\' || view === \'approvals\') ? \'active\' : \'\'}" data-sr-view="team">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
    '              <span class="sr-dock-label">Workforce</span>',
    '            </button>',
    '            <button class="sr-dock-item ${view === \'compliance\' ? \'active\' : \'\'}" data-sr-view="compliance">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
    '              <span class="sr-dock-label">Compliance</span>',
    '            </button>',
    '            <button class="sr-dock-item ${view === \'payroll\' ? \'active\' : \'\'}" data-sr-view="payroll">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    '              <span class="sr-dock-label">Finance</span>',
    '            </button>',
    '            <button class="sr-dock-item ${view === \'settings\' ? \'active\' : \'\'}" data-sr-view="settings">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    '              <span class="sr-dock-label">Organisation</span>',
    '            </button>',
    '          ` : isSupervisor ? `',
    '            <!-- 6 Tabs: Shift Supervisor Mobile Dock -->',
    '            <button class="sr-dock-item ${view === \'overview\' ? \'active\' : \'\'}" data-sr-view="overview">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
    '              <span class="sr-dock-label">Shift Ops</span>',
    '            </button>',
    '            <button class="sr-dock-item ${view === \'schedule\' ? \'active\' : \'\'}" data-sr-view="schedule">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    '              <span class="sr-dock-label">Schedule</span>',
    '            </button>',
    '            <button class="sr-dock-item ${(view === \'timesheets\' || view === \'time-away\') ? \'active\' : \'\'}" data-sr-view="timesheets">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    '              <span class="sr-dock-label">Attendance</span>',
    '            </button>',
    '            <button class="sr-dock-item ${(view === \'team\' || view === \'approvals\') ? \'active\' : \'\'}" data-sr-view="team">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
    '              <span class="sr-dock-label">Team</span>',
    '            </button>',
    '            <button class="sr-dock-item ${view === \'handovers\' ? \'active\' : \'\'}" data-sr-view="handovers">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    '              <span class="sr-dock-label">Handovers</span>',
    '            </button>',
    '            <button class="sr-dock-item ${view === \'settings\' ? \'active\' : \'\'}" data-sr-view="settings">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33-1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    '              <span class="sr-dock-label">Settings</span>',
    '            </button>',
    '          ` : `',
    '            <!-- 6 Tabs: Frontline Worker Mobile Dock -->',
    '            <button class="sr-dock-item ${view === \'today\' ? \'active\' : \'\'}" data-sr-view="today">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    '              <span class="sr-dock-label">Today</span>',
    '            </button>',
    '            <button class="sr-dock-item ${view === \'schedule\' ? \'active\' : \'\'}" data-sr-view="schedule">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    '              <span class="sr-dock-label">Schedule</span>',
    '            </button>',
    '            <button class="sr-dock-item ${(view === \'time-away\' || view === \'timesheets\') ? \'active\' : \'\'}" data-sr-view="timesheets">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    '              <span class="sr-dock-label">Attendance</span>',
    '            </button>',
    '            <button class="sr-dock-item ${(view === \'earnings\' || view === \'rewards\') ? \'active\' : \'\'}" data-sr-view="earnings">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    '              <span class="sr-dock-label">Earnings</span>',
    '            </button>',
    '            <button class="sr-dock-item ${view === \'open-shifts\' ? \'active\' : \'\'}" data-sr-view="open-shifts">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/></svg>',
    '              <span class="sr-dock-label">Shifts</span>',
    '            </button>',
    '            <button class="sr-dock-item ${view === \'settings\' ? \'active\' : \'\'}" data-sr-view="settings">',
    '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    '              <span class="sr-dock-label">Settings</span>',
    '            </button>',
    '          `}',
    '        </nav>'
  ];
  lines.splice(dockIdx, (dockEnd + 1) - dockIdx, ...newDockLines);
  console.log('4. Updated mobile bottom dock.');
}

// ── 5. Persona Switcher Click Handler Navigation ────────────────────────────
const personaClickIdx = lines.findIndex(l => l.includes("const targetHome = (p === 'supervisor'"));
if (personaClickIdx !== -1) {
  lines[personaClickIdx] = "          const targetHome = p === 'owner' ? 'analytics' : (p === 'supervisor' ? 'overview' : 'today');";
  console.log('5. Updated persona switcher targetHome.');
}

// ── 6. Fix renderExecutiveAnalytics Container Selector ───────────────────────
const execMainIdx = lines.findIndex(l => l.includes("const main = document.getElementById('sr-main');"));
if (execMainIdx !== -1) {
  lines[execMainIdx] = "    const main = document.getElementById('sr-content-area') || document.getElementById('sr-main');";
  console.log('6. Fixed renderExecutiveAnalytics container selector.');
}

// ── 7. Add Switch to Shift Ops button to Executive Analytics Header ─────────
const execExportIdx = lines.findIndex(l => l.includes('id="sr-analytics-export-btn"'));
if (execExportIdx !== -1) {
  const btnLines = [
    '            <button type="button" class="sr-btn sr-btn-secondary" id="sr-btn-switch-to-shiftops" style="font-size:12px;padding:7px 14px;display:flex;align-items:center;gap:6px;border-color:rgba(16,185,129,0.3);color:var(--sr-primary);" title="Switch to Frontline Shift Operations Layer">',
    '              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
    '              <span>Shift Floor Layer</span>',
    '            </button>'
  ];
  lines.splice(execExportIdx - 1, 0, ...btnLines);
  console.log('7. Added Shift Floor Layer button to Executive Header.');
}

// ── 8. Bind Executive Switcher & Disburse in renderExecutiveAnalytics ────────
const execListenIdx = lines.findIndex(l => l.includes("document.getElementById('sr-analytics-export-btn')?.addEventListener"));
if (execListenIdx !== -1) {
  const listenLines = [
    "    document.getElementById('sr-btn-switch-to-shiftops')?.addEventListener('click', () => {",
    "      navigate('overview');",
    '    });',
    '',
    "    document.getElementById('sr-btn-exec-disburse')?.addEventListener('click', () => {",
    "      navigate('payroll');",
    '    });',
    ''
  ];
  lines.splice(execListenIdx, 0, ...listenLines);
  console.log('8. Bound Executive Layer listeners.');
}

// ── 9. Update Tour Slides for Executive and Supervisor ────────────────────────
const tourSupervisorIdx = lines.findIndex(l => l.includes('supervisor: ['));
const tourOwnerEndIdx = lines.findIndex((l, i) => i > tourSupervisorIdx && l.includes('function clearTourHighlights()'));

if (tourSupervisorIdx !== -1 && tourOwnerEndIdx !== -1) {
  const newTourBlock = [
    '    supervisor: [',
    '      {',
    '        step: 1,',
    "        view: 'overview',",
    "        target: '#sr-sup-water-clock, #sr-sup-clock-card',",
    "        title: '1. Supervisor Personal Clock-In & Live Roster',",
    "        body: 'Supervisors run shifts too: tap your personal circular thumbprint button to clock in while monitoring live on-site staff presence below.'",
    '      },',
    '      {',
    '        step: 2,',
    "        view: 'overview',",
    "        target: '#sr-btn-override-tunde, .sr-live-roster-list',",
    "        title: '2. Geofence Exception Override & Handover Relay',",
    "        body: 'Approve minor auxiliary gate GPS drift in one click and relay outgoing shift handover briefings to incoming workers.'",
    '      },',
    '      {',
    '        step: 3,',
    "        view: 'schedule',",
    "        target: '.sr-obsidian-drag-handle, #sr-content-area',",
    "        title: '3. Obsidian Drag-and-Drop Shift Assigning',",
    "        body: 'Drag team members between morning, afternoon, and night shifts with live Obsidian balance indicators.'",
    '      },',
    '      {',
    '        step: 4,',
    "        view: 'timesheets',",
    "        target: '#sr-tl-content-slot, [data-sr-view=\"timesheets\"]',",
    "        title: '4. Audit Team Attendance & Authorize Timesheets',",
    "        body: 'Verify actual clock-in/out records and authorize completed team timesheets ahead of the monthly payroll run.'",
    '      },',
    '      {',
    '        step: 5,',
    "        view: 'handovers',",
    "        target: '[data-sr-mgr-tab=\"pending\"], #sr-content-area',",
    "        title: '5. Certify Shift Relay Briefs & Safety Logs',",
    "        body: 'Review handover notes, equipment status, and certified shift logs before relieving outgoing crews.'",
    '      }',
    '    ],',
    '    owner: [',
    '      {',
    '        step: 1,',
    "        view: 'analytics',",
    "        target: '.sr-analytics-2col, #sr-analytics-export-btn',",
    "        title: '1. Executive Intelligence & Multi-Hub Cockpit',",
    "        body: 'Monitor live organization headcount, multi-hub operational index across Lagos and Kano, and executive payroll budget vs. burn in real time.'",
    '      },',
    '      {',
    '        step: 2,',
    "        view: 'compliance',",
    "        target: '#sr-content-area',",
    "        title: '2. Zero-Trust Perimeter Breach & Audit Compliance',",
    "        body: 'Track real-time biometric and geofence perimeter breach logs and generate NDPA-compliant audit vouchers.'",
    '      },',
    '      {',
    '        step: 3,',
    "        view: 'payroll',",
    "        target: '#sr-btn-batch-payroll, #sr-content-area',",
    "        title: '3. Verified Batch Payroll & Paystack Settlement Release',",
    "        body: 'Review audited shift hours and disburse net batch pay directly to bank accounts via Paystack integration.'",
    '      },',
    '      {',
    '        step: 4,',
    "        view: 'analytics',",
    "        target: '#sr-content-area',",
    "        title: '4. PenCom & State PAYE Statutory Remittance',",
    "        body: 'Review automated statutory withholding schedules: PenCom Pension, State PAYE, NSITF, and NHF vouchers.'",
    '      },',
    '      {',
    '        step: 5,',
    "        view: 'analytics',",
    "        target: '#sr-analytics-export-btn',",
    "        title: '5. Export Executive Audit Brief & Certificates',",
    "        body: 'Download or export the official NDPA & Statutory Compliance Certificate and executive audit briefs.'",
    '      }',
    '    ]',
    '  };'
  ];
  lines.splice(tourSupervisorIdx, tourOwnerEndIdx - tourSupervisorIdx, ...newTourBlock);
  console.log('9. Updated tour slides.');
}

// ── 10. Update Supervisor Overview Banner Badge & Context ────────────────────
const bannerBadgeIdx = lines.findIndex(l => l.includes("${user.role === 'owner' ? 'ORGANISATION OWNER' : 'SHIFT SUPERVISOR'}"));
if (bannerBadgeIdx !== -1) {
  lines[bannerBadgeIdx] = "              ${user.role === 'owner' ? 'ORGANISATION OWNER' : 'SHIFT SUPERVISOR (FLOOR OPS)'}";
  console.log('10. Updated supervisor banner badge.');
}

// Re-assemble and write back
const newContent = lines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Done! Updated phase1-shell.js line count:', lines.length);
