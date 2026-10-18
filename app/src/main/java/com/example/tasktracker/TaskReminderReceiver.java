package com.example.tasktracker;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class TaskReminderReceiver extends BroadcastReceiver {
    public static final String PREFS_NAME = "rolling_task_tracker_reminders";
    public static final String TASKS_JSON_KEY = "tasks_json";
    public static final String ACTION_DAILY_REMINDER = "com.example.tasktracker.DAILY_REMINDER";
    private static final String CHANNEL_ID = "task_reminders";
    private static final String LAST_NOTIFICATION_KEY = "last_notification_date";
    private static final int ALARM_REQUEST_CODE = 421;
    private static final int NOTIFICATION_ID = 1042;

    public static void scheduleDailyReminder(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, TaskReminderReceiver.class);
        intent.setAction(ACTION_DAILY_REMINDER);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                ALARM_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag()
        );

        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, 9);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (!next.getTime().after(new Date())) next.add(Calendar.DAY_OF_YEAR, 1);

        alarmManager.setInexactRepeating(
                AlarmManager.RTC_WAKEUP,
                next.getTimeInMillis(),
                AlarmManager.INTERVAL_DAY,
                pendingIntent
        );
    }

    private static int immutableFlag() {
        return Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null && Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            scheduleDailyReminder(context);
            return;
        }
        showDueTaskNotification(context);
    }

    private void showDueTaskNotification(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String today = todayKey();
        if (today.equals(prefs.getString(LAST_NOTIFICATION_KEY, ""))) return;

        String raw = prefs.getString(TASKS_JSON_KEY, "[]");
        int dueCount = 0;
        StringBuilder names = new StringBuilder();
        try {
            JSONArray tasks = new JSONArray(raw);
            for (int i = 0; i < tasks.length(); i++) {
                JSONObject task = tasks.optJSONObject(i);
                if (task == null) continue;
                String status = task.optString("status", "");
                if ("done".equalsIgnoreCase(status.trim())) continue;

                boolean due = dueOrOverdue(task.optString("deadline", ""))
                        || dueOrOverdue(task.optString("followup", ""))
                        || dueOrOverdue(task.optString("delivery", ""))
                        || "blocked".equalsIgnoreCase(status.trim());
                if (!due) continue;

                dueCount++;
                if (names.length() < 150) {
                    if (names.length() > 0) names.append(", ");
                    names.append(task.optString("name", "Untitled task"));
                }
            }
        } catch (Exception ignored) {
            return;
        }

        if (dueCount == 0) return;
        createNotificationChannel(context);

        Intent launchIntent = context.getPackageManager()
                .getLaunchIntentForPackage(context.getPackageName());
        PendingIntent contentIntent = launchIntent == null ? null : PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag()
        );

        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(context, CHANNEL_ID)
                : new Notification.Builder(context);
        builder.setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Task Tracker reminder")
                .setContentText(dueCount + " task(s) need attention today.")
                .setStyle(new Notification.BigTextStyle().bigText(
                        dueCount + " task(s) need attention today. " + names
                ))
                .setAutoCancel(true);
        if (contentIntent != null) builder.setContentIntent(contentIntent);

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, builder.build());
            prefs.edit().putString(LAST_NOTIFICATION_KEY, today).apply();
        }
    }

    private static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Task reminders",
                NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Daily reminders for task deadlines, follow-ups, deliveries and blocked tasks.");
        manager.createNotificationChannel(channel);
    }

    private static boolean dueOrOverdue(String value) {
        String key = normalizeDate(value);
        return !key.isEmpty() && key.compareTo(todayKey()) <= 0;
    }

    private static String normalizeDate(String value) {
        if (value == null) return "";
        String s = value.trim();
        if (s.matches("^\\d{4}-\\d{2}-\\d{2}.*")) return s.substring(0, 10);
        String[] patterns = {"dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "d-M-yyyy", "dd.MM.yyyy"};
        for (String pattern : patterns) {
            try {
                SimpleDateFormat format = new SimpleDateFormat(pattern, Locale.US);
                format.setLenient(false);
                format.setTimeZone(TimeZone.getDefault());
                Date date = format.parse(s);
                if (date != null) return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(date);
            } catch (Exception ignored) { }
        }
        return "";
    }

    private static String todayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }
}
