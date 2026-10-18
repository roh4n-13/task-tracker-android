import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const java = fs.readFileSync('app/src/main/java/com/example/tasktracker/MainActivity.java', 'utf8');
const receiver = fs.readFileSync('app/src/main/java/com/example/tasktracker/TaskReminderReceiver.java', 'utf8');
const manifest = fs.readFileSync('app/src/main/AndroidManifest.xml', 'utf8');
const backend = fs.readFileSync('TaskTracker_GoogleAppsScript.gs', 'utf8');

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
if (!scripts.length) throw new Error('No inline app script found');
new vm.Script(scripts[scripts.length - 1][1], { filename: 'index.html inline script' });

const checks = [
  ['Smart Dashboard', html.includes('Smart dashboard')],
  ['One-tap daily report', html.includes('function generateDailyReport()')],
  ['Verified JSONP snapshot reads', html.includes('function readSheetsSnapshot()')],
  ['Persistent sync queue', html.includes('SYNC_QUEUE_KEY')],
  ['Sheet deletion reconciliation', html.includes('tasks=remoteTasks')],
  ['No old hard-coded token in app', !html.includes('Rohan_TaskTracker_2026_A7x9K2mP')],
  ['Native reminder bridge', java.includes('updateReminderTasks')],
  ['Native daily reminder receiver', receiver.includes('setInexactRepeating')],
  ['Reminder receiver registered', manifest.includes('.TaskReminderReceiver')],
  ['Script Properties token lookup', backend.includes("getScriptProperties().getProperty('SECRET_TOKEN')")],
  ['No old hard-coded token in backend', !backend.includes('Rohan_TaskTracker_2026_A7x9K2mP')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exitCode = 1;
else console.log(`\nAll ${checks.length} source checks passed.`);
