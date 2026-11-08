import fs from 'fs';

let content = fs.readFileSync('server.mjs', 'utf8');

// 1. Farouk Bello (SRE) - Multi-sample consensus & GPS drift compensation
const targetGeofence = `          } else if (verificationMode === 'gps_snapshot' && body.coords && body.coords.latitude) {
            const lat = Number(body.coords.latitude);
            const lng = Number(body.coords.longitude);
            distanceMeters = calculateHaversineDistanceMeters(lat, lng, hubLat, hubLng);
            if (distanceMeters <= perimeterMeters) {
              geofenceStatus = 'within_geofence';
              verificationDetails = \`GPS Verified On-Site (\${distanceMeters}m from \${hubName})\`;
            } else {
              geofenceStatus = 'outside_geofence_flagged';
              const distStr = distanceMeters >= 1000 ? \`\${(distanceMeters / 1000).toFixed(1)} km\` : \`\${distanceMeters}m\`;
              verificationDetails = \`⚠️ Flagged: \${distStr} outside approved perimeter\`;
            }`;

const replacementGeofence = `          } else if (verificationMode === 'gps_snapshot' && body.coords && body.coords.latitude) {
            // Farouk Bello (SRE) - Multi-Sample Consensus & Weather Drift Buffer (Authorized by Executive Director)
            let effectiveLat = Number(body.coords.latitude);
            let effectiveLng = Number(body.coords.longitude);
            if (Array.isArray(body.coordsSamples) && body.coordsSamples.length >= 3) {
              const sortedLats = body.coordsSamples.map(s => Number(s.latitude)).sort((a,b) => a - b);
              const sortedLngs = body.coordsSamples.map(s => Number(s.longitude)).sort((a,b) => a - b);
              effectiveLat = sortedLats[Math.floor(sortedLats.length / 2)];
              effectiveLng = sortedLngs[Math.floor(sortedLngs.length / 2)];
            }
            distanceMeters = calculateHaversineDistanceMeters(effectiveLat, effectiveLng, hubLat, hubLng);
            const driftMarginMeters = 15; // 15m soft-zone buffer for concrete canopy/weather interference
            if (distanceMeters <= perimeterMeters) {
              geofenceStatus = 'within_geofence';
              verificationDetails = \`GPS Verified On-Site (\${distanceMeters}m from \${hubName})\`;
            } else if (distanceMeters <= (perimeterMeters + driftMarginMeters)) {
              geofenceStatus = 'within_geofence';
              verificationDetails = \`GPS Multi-Sample Verified (\${distanceMeters}m from \${hubName} · Weather Drift Compensated)\`;
            } else {
              geofenceStatus = 'outside_geofence_flagged';
              const distStr = distanceMeters >= 1000 ? \`\${(distanceMeters / 1000).toFixed(1)} km\` : \`\${distanceMeters}m\`;
              verificationDetails = \`⚠️ Flagged: \${distStr} outside approved perimeter\`;
            }`;

// 2. Ngozi Eze (QA) - Access-Control-Max-Age: 86400
const targetCors = `'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',`;
const replacementCors = `'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',\n    'Access-Control-Max-Age': '86400',`;

// Replace normalizing line endings
content = content.replace(/\r\n/g, '\n');
const normalizedTarget = targetGeofence.replace(/\r\n/g, '\n');

if (content.includes(normalizedTarget)) {
  content = content.replace(normalizedTarget, replacementGeofence);
  console.log('Successfully patched geofence logic (RIFA-4)');
} else {
  console.log('Warning: targetGeofence snippet not found directly');
}

if (content.includes(targetCors)) {
  content = content.replaceAll(targetCors, replacementCors);
  console.log('Successfully patched CORS preflight cache (RIFA-3)');
}

fs.writeFileSync('server.mjs', content, 'utf8');
console.log('server.mjs updated and saved.');
