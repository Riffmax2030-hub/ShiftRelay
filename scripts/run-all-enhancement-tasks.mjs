// Node 24 built-in global fetch

async function runTask(agentId, taskId, name) {
  console.log(`\nInvoking ${name} on task ${taskId}...`);
  const res = await fetch(`http://127.0.0.1:3100/api/agents/${agentId}/heartbeat/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId })
  });
  const data = await res.json();
  const runId = data.id;
  console.log(`Run started: ${runId}`);

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const rRes = await fetch(`http://127.0.0.1:3100/api/heartbeat-runs/${runId}`);
    if (rRes.ok) {
      const rData = await rRes.json();
      if (rData.status === 'succeeded' || rData.status === 'failed') {
        console.log(`Run ${runId} completed with status: ${rData.status} (exitCode: ${rData.exitCode})`);
        break;
      }
    }
  }

  // Check issue status
  const issRes = await fetch(`http://127.0.0.1:3100/api/issues/${taskId}`);
  const issData = await issRes.json();
  console.log(`Issue ${issData.identifier} is now in status: ${issData.status}`);
}

async function main() {
  await runTask('ef478085-0404-492a-83a0-31f7c0998b6a', '32086d30-7d60-4996-8e87-79ecac1e24c7', 'Ngozi Eze (QA)');
  await runTask('8047c30a-afd2-4ee9-a5b0-1d3e9692792e', '3a1c3d4e-13fd-4033-ae38-7236ad53f49c', 'Farouk Bello (SRE)');
  await runTask('af32ca4b-38b1-4f44-9efd-dd7ae6287d66', '2d506f06-e474-4890-92ac-ee64ac424274', 'Kelechi Nnamdi (Design)');
}

main();
