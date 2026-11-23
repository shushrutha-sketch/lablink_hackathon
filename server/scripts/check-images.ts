import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE_BYTES = 300 * 1024; // 300 KB

export function checkImages(): { success: boolean; errors: string[] } {
  const errors: string[] = [];

  const baseDir = process.cwd().endsWith('server') ? process.cwd() : path.join(process.cwd(), 'server');
  const manifestPath = path.resolve(baseDir, 'media', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { success: false, errors: [`Manifest file ${manifestPath} does not exist.`] };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const mediaDir = path.resolve(baseDir, 'media', 'equipment');

  const expectedSlugs = [
    'dso-100mhz-4ch',
    'handheld-scope-50mhz',
    'bench-psu-30v-5a',
    'soldering-station',
    'logic-analyzer-8ch',
    'esp32-devkit-kit',
    'arduino-uno-kit',
    'iot-sensor-kit',
    'raspberry-pi-4',
    'robotic-arm-4dof',
    'mobile-robot-4wd',
    'fdm-3d-printer',
    'jetson-nano-kit',
    'gpu-workstation',
  ];

  for (const slug of expectedSlugs) {
    const entry = manifest[slug];
    if (!entry) {
      errors.push(`Manifest missing entry for slug: ${slug}`);
      continue;
    }

    if (!entry.sourceUrl) {
      errors.push(`${slug}: Missing sourceUrl attribute`);
    }
    if (!entry.licence) {
      errors.push(`${slug}: Missing licence attribute`);
    }
    if (!entry.alt || entry.alt.trim().length < 20) {
      errors.push(`${slug}: alt text must be at least 20 characters, found ${entry.alt?.length || 0}`);
    }
    if (entry.verified !== true) {
      errors.push(`${slug}: verified flag must be true`);
    }

    const filePath = path.join(mediaDir, entry.file);
    if (!fs.existsSync(filePath)) {
      errors.push(`${slug}: Image file ${entry.file} does not exist in server/media/equipment/`);
      continue;
    }

    const ext = path.extname(entry.file).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      errors.push(`${slug}: Image extension ${ext} is not allowed. Must be one of ${ALLOWED_EXTENSIONS.join(', ')}`);
    }

    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      errors.push(`${slug}: Image file size (${(stat.size / 1024).toFixed(1)} KB) exceeds 300 KB limit`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

if (process.argv[1]?.endsWith('check-images.ts') || process.argv[1]?.endsWith('check-images.js')) {
  console.log('Running equipment images verification check...');
  const result = checkImages();
  if (!result.success) {
    console.error('Image check FAILED with errors:');
    result.errors.forEach(err => console.error('  - ' + err));
    process.exit(1);
  } else {
    console.log('✅ Image check PASSED: All 14 equipment images verified against manifest specifications.');
  }
}
