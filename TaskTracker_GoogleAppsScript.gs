/**
 * Rolling Task Tracker - Google Sheets Backend
 *
 * Existing features preserved:
 * 1. Add new tasks
 * 2. Update existing tasks
 * 3. Delete tasks
 * 4. Read tasks from Google Sheets
 * 5. JSONP support
 *
 * Behaviour:
 * - Done tasks are stored in "Completed Tasks".
 * - Active tasks are stored in "Tasks".
 * - Reopening a completed task moves it back to "Tasks".
 * - Delete removes a task from either sheet.
 * - Blank optional descriptive fields are saved as "N/A".
 * - Editing column D (Progress) to "Done" in the Tasks sheet
 *   moves that row to Completed Tasks.
 */

const SHEET_NAME = 'Tasks';
const COMPLETED_SHEET_NAME = 'Completed Tasks';
/**
 * Configure this value in Apps Script > Project Settings > Script Properties.
 * Property name: SECRET_TOKEN. Never commit the actual token to source control.
 */
function getSecretToken_() {
  return PropertiesService.getScriptProperties().getProperty('SECRET_TOKEN') || '';
}

const HEADERS = [
  'ID',
  'Task Name',
  'Type',
  'Progress',
  'Priority',
  'Deadline',
  'Vendor / Craftsman',
  'Contact Number',
  'Estimated Cost (INR)',
  'Actual Cost (INR)',
  'Next Follow-up',
  'Delivery Date',
  'Payment Status',
  'Link',
  'Task Focus',
  'Value Add',
  'Notes',
  'Task Added',
  'Task Started',
  'Task Completed',
  'Last Updated'
];

/**
 * Get or create a sheet and initialize headers if it is empty.
 * Existing non-empty sheets are not cleared or reformatted.
 */
function getSheet_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error(
      'Spreadsheet not found. Open Apps Script from your Google Sheet.'
    );
  }

  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);

    sheet
      .getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#20375b')
      .setFontColor('#ffffff');
  }

  return sheet;
}

function getTasksSheet_() {
  return getSheet_(SHEET_NAME);
}

function getCompletedTasksSheet_() {
  return getSheet_(COMPLETED_SHEET_NAME);
}

/**
 * Return N/A for blank optional descriptive fields.
 * IDs, task names, status, dates, and cost fields remain unchanged.
 */
function optionalValue_(value) {
  return value === undefined || value === null || String(value).trim() === ''
    ? 'N/A'
    : value;
}

/**
 * Convert a task object into a spreadsheet row.
 * Column order remains unchanged.
 */
function taskToRow_(task) {
  return [
    task.id || '',
    task.name || '',
    optionalValue_(task.type),
    task.status || '',
    optionalValue_(task.priority),
    task.deadline || '',
    optionalValue_(task.vendor),
    optionalValue_(task.contact),
    task.estimatedCost || '',
    task.actualCost || '',
    task.followup || '',
    task.delivery || '',
    task.payment || '',
    optionalValue_(task.link),
    optionalValue_(task.focus),
    optionalValue_(task.value),
    optionalValue_(task.notes),
    task.added || '',
    task.started || '',
    task.completed || '',
    new Date()
  ];
}

/**
 * Find a task row by ID.
 * Returns -1 if not found.
 */
function findTaskRow_(sheet, taskId) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return -1;
  }

  const ids = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getDisplayValues()
    .flat();

  const index = ids.indexOf(String(taskId));

  return index === -1 ? -1 : index + 2;
}

/**
 * Insert or update a task in the selected sheet.
 */
function saveTaskToSheet_(sheet, task) {
  const rowNumber = findTaskRow_(sheet, task.id);
  const row = taskToRow_(task);

  if (rowNumber !== -1) {
    sheet
      .getRange(rowNumber, 1, 1, HEADERS.length)
      .setValues([row]);

    return 'update';
  }

  sheet.appendRow(row);
  return 'add';
}

/**
 * Remove a task from a sheet if it exists.
 */
function removeTaskFromSheet_(sheet, taskId) {
  const rowNumber = findTaskRow_(sheet, taskId);

  if (rowNumber !== -1) {
    sheet.deleteRow(rowNumber);
    return true;
  }

  return false;
}

/**
 * Handle add, update, upsert and delete requests.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Missing request data.');
    }

    const data = JSON.parse(e.postData.contents);

    const expectedToken = getSecretToken_();
    if (!expectedToken || data.token !== expectedToken) {
      throw new Error('Unauthorized request.');
    }

    const action = data.action;
    const task = data.task || {};

    if (!task.id) {
      throw new Error('Missing task ID.');
    }

    if (!['upsert', 'add', 'update', 'delete'].includes(action)) {
      throw new Error('Unsupported action: ' + action);
    }

    lock.waitLock(10000);
    lockAcquired = true;

    const activeSheet = getTasksSheet_();
    const completedSheet = getCompletedTasksSheet_();

    if (action === 'delete') {
      const deletedFromTasks =
        removeTaskFromSheet_(activeSheet, task.id);

      const deletedFromCompleted =
        removeTaskFromSheet_(completedSheet, task.id);

      return json_({
        ok: true,
        action: 'delete',
        id: String(task.id),
        deleted: deletedFromTasks || deletedFromCompleted
      });
    }

    const isCompleted =
      String(task.status || '').trim().toLowerCase() === 'done';

    if (isCompleted) {
      // Save to Completed Tasks first; remove from Tasks after save succeeds.
      saveTaskToSheet_(completedSheet, task);
      removeTaskFromSheet_(activeSheet, task.id);

      return json_({
        ok: true,
        action: 'complete',
        id: String(task.id)
      });
    }

    // Save to Tasks first; remove from Completed Tasks after save succeeds.
    // This also supports reopening a completed task.
    saveTaskToSheet_(activeSheet, task);
    removeTaskFromSheet_(completedSheet, task.id);

    return json_({
      ok: true,
      action: 'active',
      id: String(task.id)
    });

  } catch (err) {
    return json_({
      ok: false,
      error: String(err)
    });

  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

/**
 * Read tasks from both sheets.
 * JSONP support is preserved.
 */
function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || 'test';
  const callback = params.callback || '';

  if (
    callback &&
    !/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(callback)
  ) {
    return json_({
      ok: false,
      error: 'Invalid callback name.'
    });
  }

  let result;

  try {
    if (action === 'test') {
      result = {
        ok: true,
        message: 'Rolling Task Tracker backend is running.'
      };

    } else if (action === 'list') {
      const expectedToken = getSecretToken_();
      if (!expectedToken || params.token !== expectedToken) {
        throw new Error('Unauthorized request.');
      }

      const activeSheet = getTasksSheet_();
      const completedSheet = getCompletedTasksSheet_();

      const tasks = readTasksFromSheet_(activeSheet);
      const completedTasks = readTasksFromSheet_(completedSheet);

      // Combine both sheets so the app can load all tasks.
      const allTasks = tasks.concat(completedTasks);

      result = {
        ok: true,
        count: allTasks.length,
        tasks: allTasks
      };

    } else {
      throw new Error('Unsupported action: ' + action);
    }

  } catch (err) {
    result = {
      ok: false,
      error: String(err)
    };
  }

  if (callback) {
    return ContentService
      .createTextOutput(
        callback + '(' + JSON.stringify(result) + ');'
      )
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return json_(result);
}

/**
 * Read task rows using the original field mapping.
 */
function readTasksFromSheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const tasks = [];

  if (lastRow < 2) {
    return tasks;
  }

  const rows = sheet
    .getRange(2, 1, lastRow - 1, HEADERS.length)
    .getDisplayValues();

  rows.forEach(function(row) {
    if (!row[0]) {
      return;
    }

    tasks.push({
      id: row[0],
      name: row[1],
      type: row[2],
      status: row[3],
      priority: row[4],
      deadline: row[5],
      vendor: row[6],
      contact: row[7],
      estimatedCost: row[8],
      actualCost: row[9],
      followup: row[10],
      delivery: row[11],
      payment: row[12],
      link: row[13],
      focus: row[14],
      value: row[15],
      notes: row[16],
      added: row[17],
      started: row[18],
      completed: row[19]
    });
  });

  return tasks;
}

/**
 * Return JSON output.
 */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Move a task from Tasks to Completed Tasks
 * when column D (Progress/Status) is set to "Done".
 */
function onEdit(e) {
  if (!e || !e.range) return;

  const editedRange = e.range;
  const sheet = editedRange.getSheet();

  // Only respond to edits in the active Tasks sheet.
  if (sheet.getName() !== SHEET_NAME) return;

  // Only respond when the edit intersects column D, excluding the header.
  if (
    editedRange.getColumn() > 4 ||
    editedRange.getLastColumn() < 4 ||
    editedRange.getLastRow() < 2
  ) {
    return;
  }

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    // Process every affected row, including multi-row pastes.
    const startRow = Math.max(2, editedRange.getRow());
    const endRow = editedRange.getLastRow();

    for (let rowNum = endRow; rowNum >= startRow; rowNum--) {
      const status = String(sheet.getRange(rowNum, 4).getDisplayValue())
        .trim()
        .toLowerCase();

      if (status !== 'done') continue;

      const rowValues = sheet
        .getRange(rowNum, 1, 1, HEADERS.length)
        .getValues()[0];

      const taskId = String(rowValues[0] || '').trim();
      if (!taskId) continue;

      const completedSheet = getCompletedTasksSheet_();

      // Avoid duplicate rows: update an existing matching ID,
      // or append the row if it does not exist yet.
      const existingRow = findTaskRow_(completedSheet, taskId);

      if (existingRow !== -1) {
        completedSheet
          .getRange(existingRow, 1, 1, HEADERS.length)
          .setValues([rowValues]);
      } else {
        completedSheet.appendRow(rowValues);
      }

      // Remove from active sheet only after saving succeeds.
      sheet.deleteRow(rowNum);
    }
  } finally {
    lock.releaseLock();
  }
}