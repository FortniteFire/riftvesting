// Copies the repo's images/ folder into public/images so the built site can serve the slab photos.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(process.env.DATA_ROOT ?? '..');
const src = resolve(root, 'images');
const dst = resolve('public/images');
if (existsSync(dst)) rmSync(dst, { recursive: true });
mkdirSync(dst, { recursive: true });
if (existsSync(src)) cpSync(src, dst, { recursive: true });
console.log(`copied images from ${src}`);
