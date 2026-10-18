# Rolling Task Tracker Android

An Android WebView shell for the task tracker, with local-first storage and optional Google Sheets synchronization.

## Current structure

- `app/src/main/assets/index.html`: task UI, local storage, dashboard, report generation, sync queue, and rule-based next actions.
- `app/src/main/java/com/example/tasktracker/MainActivity.java`: WebView host and native bridge for clipboard and reminder-task snapshots.
- `app/src/main/java/com/example/tasktracker/TaskReminderReceiver.java`: daily Android reminder notification.
- `TaskTracker_GoogleAppsScript.gs`: versioned Apps Script backend. The actual deployment must be updated separately in the Apps Script editor.
- `scripts/verify-app.mjs`: lightweight source/JavaScript syntax smoke check.

## Features

- Existing task list, filters, status updates, parked/recurring/done views, visualizations, and JSON backup are preserved.
- Smart Dashboard highlights overdue deadlines, deadlines due today, follow-ups, blocked work, and rule-based next actions.
- Daily report builds a copyable summary for WhatsApp.
- Google Sheets changes are queued locally, retried, and checked by reading the server snapshot back.
- When a full, valid Sheets snapshot is received, it becomes the current task list. Therefore a row manually deleted from either `Tasks` or `Completed Tasks` is removed from the app at the next successful sync. Failed or incomplete reads do not delete local data.
- The app sends a daily Android notification around 9 AM for due/overdue deadlines, follow-ups, deliveries, and blocked tasks. Android may delay inexact alarms; notifications must be enabled for the app.

## Google Sheets setup and security

**Important:** the old token was embedded in the public client source. Treat it as exposed and rotate it before relying on the integration.

1. Open the bound Google Apps Script project from the spreadsheet.
2. Replace the backend source with `TaskTracker_GoogleAppsScript.gs` from this repository.
3. In Apps Script, open **Project Settings → Script Properties** and add a property named `SECRET_TOKEN`. Set a strong, unique value. Do not commit the value to GitHub.
4. Save and update the existing Web App deployment to a **new version**. Keep access limited to the intended users where possible.
5. Open the app, press **Connect Google Sheets**, confirm the Web App URL ending in `/exec`, and enter the new Script Properties token. The token is saved in this device's local app storage, not in source code.
6. Press **Sync now** and confirm the status changes to Synced.

The Web App URL and token are still credentials. Do not share screenshots or backups containing them. Because a browser/WebView client cannot keep a token truly secret from its device owner, use deployment access restrictions appropriate for the spreadsheet.

## Build and verify

Requirements: Android Studio with Android SDK Platform 35, JDK 17+, and Gradle 8.9+ (or Android Studio's Gradle integration).

Run the source smoke check:

```bash
node scripts/verify-app.mjs
```

Build a debug APK:

```bash
gradle assembleDebug
```

Expected APK path: `app/build/outputs/apk/debug/app-debug.apk`.

GitHub Actions runs the smoke check and builds the debug APK on pushes to `main`. A branch build can be run manually from the Actions tab if the workflow is enabled for that branch.

## Regression checklist

- Add, edit, delete, and change progress for a task.
- Verify a task moved to Done remains in the Completed Tasks sheet and can be reopened.
- Turn off internet, edit a task, restore internet, and verify the queued update syncs.
- Delete an existing task row manually in Google Sheets, wait for the next sync or tap **Sync now**, and verify it disappears from the app.
- Delete a row while an unrelated local change is pending; verify the pending local change is retained and the manually deleted row is removed after reconciliation.
- Test a blocked task, overdue deadline, due follow-up, and delivery date.
- Generate the daily report and paste it into WhatsApp.
- Verify the daily notification on a device with notifications enabled.
- Export a JSON backup and confirm it contains the task data.

Automated source checks do not replace running the APK on a real Android device and verifying the deployed Apps Script against a test spreadsheet.
