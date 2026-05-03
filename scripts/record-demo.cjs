const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('C:/Users/ericg/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'demo-recordings');
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const frameRate = 4;
const durationSeconds = 54.5;

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const framesDir = path.join(outputDir, `frames-${stamp}`);
  await fs.mkdir(framesDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 }
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/?demoVideo=1', { waitUntil: 'networkidle' });
  await page.getByText('Jurassic Park 2 The Chaos Continues', { exact: false }).waitFor({ timeout: 15000 });

  await page.getByRole('button', { name: 'Play audio' }).click();

  const totalFrames = Math.ceil(durationSeconds * frameRate);
  for (let frame = 0; frame < totalFrames; frame += 1) {
    const framePath = path.join(framesDir, `frame-${String(frame).padStart(4, '0')}.png`);
    await page.screenshot({ path: framePath });
    await page.waitForTimeout(1000 / frameRate);
  }

  await context.close();
  await browser.close();

  console.log(framesDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
