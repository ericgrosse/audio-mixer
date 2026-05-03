const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('C:/Users/ericg/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'demo-recordings');
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rawDir = path.join(outputDir, 'raw');
  await fs.mkdir(rawDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: {
      dir: rawDir,
      size: { width: 1600, height: 900 }
    }
  });

  const recordStart = Date.now();
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/?demoVideo=1', { waitUntil: 'networkidle' });
  await page.getByText('Jurassic Park 2 The Chaos Continues', { exact: false }).waitFor({ timeout: 15000 });
  await page.waitForFunction(() => window.__runAudioMixerDemo && window.__stopAudioMixerDemoRecording);
  const durationMs = await page.evaluate(() => window.__audioMixerDemoDurationMs);

  const trimOffsetSeconds = (Date.now() - recordStart) / 1000;
  await page.evaluate(() => {
    window.__runAudioMixerDemo();
    return true;
  });
  await page.waitForTimeout(durationMs + 1000);

  const audioDataUrl = await page.evaluate(() => {
    if (window.__audioMixerDemoRecordingDataUrl) {
      return window.__audioMixerDemoRecordingDataUrl;
    }
    return window.__stopAudioMixerDemoRecording();
  });
  const audioBase64 = audioDataUrl.split(',')[1];
  const audioPath = path.join(outputDir, `processed-audio-${stamp}.webm`);
  await fs.writeFile(audioPath, Buffer.from(audioBase64, 'base64'));

  const video = page.video();
  await context.close();
  await browser.close();

  const rawVideoPath = await video.path();
  const videoPath = path.join(outputDir, `smooth-video-${stamp}.webm`);
  await fs.copyFile(rawVideoPath, videoPath);

  console.log(JSON.stringify({ audioPath, durationSeconds: durationMs / 1000, trimOffsetSeconds, videoPath }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
