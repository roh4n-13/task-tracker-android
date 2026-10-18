# Rolling Task Tracker Android — Simple Hinglish Guide

Ye app tasks ko manage karta hai aur optional Google Sheets sync support karta hai. Android app ka UI `app/src/main/assets/index.html` mein hai.

## 1. App mein kya hai?

- **Smart Dashboard:** app khulte hi dashboard; total, pending, completed, overdue, due-today aur in-progress tasks; Smart Next Action; upcoming deadlines; follow-ups aur blocked tasks.
- **Task List:** add, edit, status update, delete, search, filters, parked/recurring/done views aur visualizations.
- **One-tap Daily Report:** report button current saved task data se report banata hai aur clipboard mein copy karne ki koshish karta hai. Android app mein report WhatsApp mein paste/share kar sakte ho.
- **Google Sheets Connect:** Apps Script Web App URL aur `SECRET_TOKEN` enter karke connection verify kar sakte ho.
- **Offline-first:** local tasks device par save hote hain; pending changes internet aane par sync queue se bheje jaate hain.
- **Daily reminder:** Android notification receiver pending/due work ke liye reminder schedule karta hai. Android version ke hisaab se notification permission enable karni pad sakti hai.

## 2. Google Sheet connect karna

1. Apni Google Sheet kholo.
2. **Extensions → Apps Script** select karo.
3. Repository ki `TaskTracker_GoogleAppsScript.gs` file ka code bound Apps Script project mein update karo. Existing project replace karne se pehle backup bana lena.
4. Apps Script mein **Project Settings → Script Properties** kholo.
5. Ek property add karo: **Property = `SECRET_TOKEN`**, **Value = apna naya strong token**. Token ko GitHub, README ya screenshots mein mat daalna.
6. **Deploy → Manage deployments** kholo, Web App deployment edit karo aur **New version** deploy karo. Web App access ko apni security requirement ke mutabik set karo; public access dene se pehle risk samajh lo.
7. Deployed Web App ka URL copy karo. URL `https://script.google.com/macros/s/.../exec` se end hona chahiye.
8. App mein **Connect Google Sheets** kholo. URL aur wahi token enter karo jo Script Properties mein set kiya hai. **Connect & sync** dabao.
9. Connection verify hone ke baad **Sync now** dabao aur tasks check karo.

**Note:** GitHub mein `.gs` file update karne se Google Apps Script automatically deploy nahi hota. Apps Script editor mein deployment manually update karna hota hai. URL/token app ke current device ke local storage mein save hote hain; token sensitive hai.

## 3. Sync aur deleted rows

- Task add/edit/complete/delete karne par app sync queue mein change rakhta hai. Same task ke multiple pending edits ko latest change se compact kiya jata hai.
- Pending changes ek batch mein send hote hain; phir app ek complete snapshot read karke poore task data ko verify karta hai. Isse har task ke liye baar-baar 4 reads karne wala slow pattern hataya gaya hai.
- Successful sync par app `Tasks` aur `Completed Tasks` dono ka combined snapshot read karta hai.
- Sheet se manually delete ki gayi row next successful automatic snapshot refresh par app se bhi remove honi chahiye. App se delete ki gayi row dono Sheets tabs se remove honi chahiye.
- Failed request ya incomplete snapshot valid data nahi maana jaata. Unverified local changes queue mein rehte hain aur remote snapshot apply karte waqt preserve hote hain.
- Sheet mein status `Done` karne se task `Completed Tasks` mein move hota hai; completed task ko dobara non-Done status dene se `Tasks` mein wapas move hota hai.
- **Background limitation:** Android app band/force-stop hone par WebView JavaScript polling nahi chalti. Automatic 20-second polling app open/visible hone par kaam karti hai; app dobara kholte hi sync trigger hota hai. Android background/closed-app sync is not promised by this version.
- Pehli baar connect karne se pehle sheet aur phone dono ka backup rakhna achha hai.

## 4. APK download karna

1. GitHub repo kholo: https://github.com/roh4n-13/task-tracker-android
2. **Actions → Build Task Tracker APK** kholo.
3. Latest successful run select karo.
4. Page ke neeche **Artifacts → TaskTracker-debug-APK** download karo.
5. ZIP extract karo; andar `app-debug.apk` milega.
6. APK phone mein bhejo, open karo, aur agar Android pooche toh us file manager/browser ke liye **Install unknown apps** allow karo. Install ke baad permission chaaho toh off kar dena.

Agar artifact nahi dikh raha, build successful nahi hua hoga ya artifact expire ho gaya hoga.

## 5. APK apne Windows laptop par build karna

Requirements: Android SDK Platform 35, JDK 17+, Git, aur Gradle/Android Studio setup.

PowerShell mein repository folder ke andar:

```powershell
node scripts/verify-app.mjs
gradle assembleDebug
```

APK yahan banega:

```text
app\build\outputs\apk\debug\app-debug.apk
```

Agar `gradle` command nahi milti, Android Studio install karke project open/sync karo. Is repository mein Gradle wrapper available na ho toh direct command tabhi chalegi jab Gradle installed ho.

## 6. Tests aur checklist

Automated source check:

```powershell
node scripts/verify-app.mjs
```

Manual testing:

- [ ] App open hote hi Smart Dashboard dikhta hai.
- [ ] Dashboard counts saved tasks se match karte hain.
- [ ] Add, edit, complete aur delete task kaam karta hai.
- [ ] Google Sheets URL/token enter karke real connection verify hota hai.
- [ ] Multiple pending edits sync in one batch and complete task fields match.
- [ ] While the app is visible, manual Sheet edits/deletes appear after automatic refresh without pressing Sync now.
- [ ] Sync ke baad sheet aur app ke tasks match karte hain.
- [ ] `Tasks` ya `Completed Tasks` se row manually delete karke sync karne par row app se bhi gayab hoti hai.
- [ ] One-tap daily report copy hoti hai.
- [ ] Notification permission enabled hone par reminder aata hai.
- [ ] APK install hota hai aur phone par open hota hai.

Automated tests aur successful build real Google Sheet ya physical Android phone testing ka replacement nahi hain. Live Sheet aur phone par test kiye bina unhe verified mat samjho.

## 7. Troubleshooting

- **URL error:** full Web App URL paste karo, `/exec` ending check karo.
- **Unauthorized / wrong token:** app ka token aur Script Properties ka `SECRET_TOKEN` exactly same hona chahiye.
- **Google login page khul raha hai:** deployment access aur Web App settings check karo.
- **Changes sync nahi hote:** internet, token, deployment version aur Apps Script execution errors check karo. App ko open rakho for automatic refresh; issue diagnose karne ke liye **Sync now** bhi try kar sakte ho.
- **Deleted row app mein dikh rahi hai:** successful sync complete hua ya nahi check karo; failed sync par local list ko blindly clear mat karo.
- **Reminder nahi aata:** Android Settings → Apps → Rolling Task Tracker → Notifications enable karo. Battery saver/inexact alarms notification ko delay kar sakte hain.
- **APK install block hota hai:** trusted build artifact use karo; Android ki unknown-app install permission check karo.

## 8. Security

- `SECRET_TOKEN` ko source code ya GitHub mein commit mat karo.
- Agar token public ho gaya ho, Apps Script Script Properties mein token rotate karo aur app mein naya token save karo.
- Web App URL aur token wale screenshots/backups share mat karo.
- Real spreadsheet par testing se pehle backup bana lo.
