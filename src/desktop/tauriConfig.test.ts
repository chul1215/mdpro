import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function readJson<T = Record<string, unknown>>(relativePath: string): T {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8')) as T;
}

describe('macOS desktop app packaging', () => {
  it('exposes Tauri desktop scripts and CLI dependency', () => {
    const pkg = readJson<{
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
    }>('package.json');

    expect(pkg.scripts?.['desktop:dev']).toBe('tauri dev');
    expect(pkg.scripts?.['desktop:build']).toBe('tauri build');
    expect(pkg.devDependencies).toHaveProperty('@tauri-apps/cli');
  });

  it('defines a macOS-ready Tauri application shell', () => {
    expect(existsSync(join(root, 'src-tauri/src/main.rs'))).toBe(true);
    expect(existsSync(join(root, 'src-tauri/build.rs'))).toBe(true);
    expect(existsSync(join(root, 'src-tauri/Cargo.toml'))).toBe(true);

    const config = readJson<{
      productName?: string;
      identifier?: string;
      build?: { beforeBuildCommand?: string; frontendDist?: string; beforeDevCommand?: string; devUrl?: string };
      app?: { windows?: Array<{ title?: string; width?: number; height?: number; minWidth?: number; minHeight?: number }> };
      bundle?: { active?: boolean; targets?: string[]; category?: string; macOS?: { minimumSystemVersion?: string } };
    }>('src-tauri/tauri.conf.json');

    expect(config.productName).toBe('MD Practice');
    expect(config.identifier).toBe('com.chul1215.mdpractice');
    expect(config.build?.beforeBuildCommand).toBe('npm run build');
    expect(config.build?.frontendDist).toBe('../dist');
    expect(config.build?.beforeDevCommand).toBe('npm run dev');
    expect(config.build?.devUrl).toBe('http://localhost:5173');
    expect(config.app?.windows?.[0]).toMatchObject({
      title: 'MD Practice',
      width: 1280,
      height: 900,
      minWidth: 900,
      minHeight: 640,
    });
    expect(config.bundle?.active).toBe(true);
    expect(config.bundle?.targets).toEqual(expect.arrayContaining(['app', 'dmg']));
    expect(config.bundle?.category).toBe('Productivity');
    expect(config.bundle?.macOS?.minimumSystemVersion).toBe('12.0');
  });

});
