import fs from 'fs';
import path from 'path';

type BumpType = 'major' | 'minor' | 'patch';

function bumpVersion(current: string, type: BumpType): string {
  const [major, minor, patch] = current.split('.').map(Number);
  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
  }
}

function main() {
  const type = (process.argv[2] || 'patch') as BumpType;
  if (!['major', 'minor', 'patch'].includes(type)) {
    console.error('Usage: ts-node bump-version.ts [major|minor|patch]');
    process.exit(1);
  }

  const pkgPath = path.resolve(__dirname, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const oldVersion = pkg.version;
  const newVersion = bumpVersion(oldVersion, type);

  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

  // 同步更新 package-lock.json
  const lockPath = path.resolve(__dirname, '../package-lock.json');
  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
    lock.version = newVersion;
    if (lock.packages?.['']) lock.packages[''].version = newVersion;
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
  }

  console.log(`版本: ${oldVersion} → ${newVersion}`);
}

main();
