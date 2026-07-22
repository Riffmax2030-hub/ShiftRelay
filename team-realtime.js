let teamEventStream;
function connectTeamRealtime(){
  if(!state.user||teamEventStream)return;
  const stream=new EventSource(`/api/events?user=${encodeURIComponent(state.user.id)}`);teamEventStream=stream;
  stream.addEventListener('team-message',()=>{if($('#page-title')?.textContent==='Team')renderCommunity();refreshNotifications()});
  stream.addEventListener('private-message',()=>{if($('#page-title')?.textContent==='Team')renderCommunity();refreshNotifications()});
  stream.onerror=()=>{stream.close();teamEventStream=null;setTimeout(connectTeamRealtime,8000)};
}
document.addEventListener('DOMContentLoaded',connectTeamRealtime);
