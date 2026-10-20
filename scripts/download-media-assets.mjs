import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const assets = [
  // Avatars
  { dir: 'uploads/avatars', name: 'avatar-amina.jpg', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80' },
  { dir: 'uploads/avatars', name: 'avatar-david.jpg', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
  { dir: 'uploads/avatars', name: 'avatar-faith.jpg', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80' },
  { dir: 'uploads/avatars', name: 'avatar-jordan.jpg', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80' },
  { dir: 'uploads/avatars', name: 'avatar-maria.jpg', url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80' },
  { dir: 'uploads/avatars', name: 'avatar-marcus.jpg', url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&auto=format&fit=crop&q=80' },
  { dir: 'uploads/avatars', name: 'avatar-kwame.jpg', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80' },
  { dir: 'uploads/avatars', name: 'avatar-elena.jpg', url: 'https://images.unsplash.com/photo-1594824813689-58b908354224?w=400&auto=format&fit=crop&q=80' },
  { dir: 'uploads/avatars', name: 'avatar-carlos.jpg', url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400&auto=format&fit=crop&q=80' },
  { dir: 'uploads/avatars', name: 'avatar-zainab.jpg', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' },

  // Covers
  { dir: 'uploads/covers', name: 'cover-operations.jpg', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&auto=format&fit=crop&q=80' },
  { dir: 'uploads/covers', name: 'cover-supervisor.jpg', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80' },
  { dir: 'uploads/covers', name: 'cover-healthcare.jpg', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&auto=format&fit=crop&q=80' },
  { dir: 'uploads/covers', name: 'cover-culinary.jpg', url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&auto=format&fit=crop&q=80' },
  { dir: 'uploads/covers', name: 'cover-logistics.jpg', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop&q=80' },
  { dir: 'uploads/covers', name: 'cover-engineering.jpg', url: 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?w=1200&auto=format&fit=crop&q=80' },

  // Feed Photos
  { dir: 'uploads/feed', name: 'feed-triage-handover.jpg', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&auto=format&fit=crop&q=80' },
  { dir: 'uploads/feed', name: 'feed-kitchen-prep.jpg', url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=900&auto=format&fit=crop&q=80' },
  { dir: 'uploads/feed', name: 'feed-warehouse-safety.jpg', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&auto=format&fit=crop&q=80' },
  { dir: 'uploads/feed', name: 'feed-plant-machinery.jpg', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&auto=format&fit=crop&q=80' }
];

async function run() {
  for (const item of assets) {
    try {
      await mkdir(item.dir, { recursive: true });
      const targetPath = join(item.dir, item.name);
      console.log(`Downloading ${item.name}...`);
      const res = await fetch(item.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(targetPath, buf);
      console.log(`✓ Saved ${targetPath} (${buf.byteLength} bytes)`);
    } catch (err) {
      console.error(`✗ Failed ${item.name}:`, err.message);
    }
  }
}

run();
