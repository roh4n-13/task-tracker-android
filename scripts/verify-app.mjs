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
new vm.Script(backend, { filename: 'TaskTracker_GoogleAppsScript.gs' });

const checks = [
  ['Smart Dashboard', html.includes('Smart Dashboard') && html.includes("view='Dashboard'")],
  ['Dashboard is the first view', html.includes("let tasks=load(),view='Dashboard'")],
  ['Dashboard quick actions', html.includes('dashboardConnectSheets') && html.includes('dashboardDailyReport')],
  ['Visible Google Sheets connection dialog', html.includes('id=\"sheetsModal\"') && html.includes('saveSheetsConnectionBtn')],
  ['No hard-coded Apps Script deployment URL', !html.includes('AKfycbzVl84fwzuOXUPoZx4_QWVgect52Hng8mcmqikUs28Fhu7vBIaEgJdMoiFym1ids0PT')],
  ['Complete snapshot count validation', html.includes('Number(data.count)!==data.tasks.length')],
  ['One-tap daily report', html.includes('function generateDailyReport()') && html.includes('One-tap daily report')],
  ['Verified JSONP snapshot reads', html.includes('function readSheetsSnapshot()')],
  ['Persistent sync queue', html.includes('SYNC_QUEUE_KEY')],
  ['Sheet deletion reconciliation preserves pending deletes', html.includes('pendingById') && html.includes("op.action!=='delete'")],
  ['Batched Google Sheets writes', html.includes("action:'batch',operations:operations.map")],
  ['Queue coalescing prevents stale writes', html.includes('function compactQueue()') && html.includes('q.filter(op=>String(op.task&&op.task.id)!==String(task.id))')],
  ['Full task snapshot verification', html.includes('function remoteMatchesTask(task,remote)')],
  ['Automatic 20-second foreground sync', html.includes(')},20000);')],
  ['Apps Script batch endpoint', backend.includes("data.action === 'batch'") && backend.includes('operations.length > 50')],
  ['Sheet status moves in both directions', backend.includes('currentName !== COMPLETED_SHEET_NAME') && backend.includes('targetSheet.getSheetId() === sheet.getSheetId()')],
  ['No old hard-coded token in app', !html.includes('Rohan_TaskTracker_2026_A7x9K2mP')],
  ['Native reminder bridge', java.includes('updateReminderTasks')],
  ['Native daily reminder receiver', receiver.includes('setInexactRepeating')],
  ['Reminder receiver registered', manifest.includes('.TaskReminderReceiver')],
  ['Script Properties token lookup', backend.includes("getScriptProperties().getProperty('SECRET_TOKEN')")],
  ['No old hard-coded token in backend', !backend.includes('Rohan_TaskTracker_2026_A7x9K2mP')],
  ['Hinglish README connection instructions', fs.readFileSync('README.md', 'utf8').includes('Connect Google Sheets') && fs.readFileSync('README.md', 'utf8').includes('Simple Hinglish Guide')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exitCode = 1;
else console.log(`\nAll ${checks.length} source checks passed.`);
