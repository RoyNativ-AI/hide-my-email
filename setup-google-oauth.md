# הגדרת Google OAuth למערכת Hide My Email

## שלב 1: יצירת פרויקט ב-Google Cloud Console

1. כנס ל: https://console.cloud.google.com
2. לחץ על "Select a project" ואז "New Project"
3. תן שם לפרויקט: "Hide My Email Service"
4. לחץ "Create"

## שלב 2: הפעלת Google APIs

1. בתפריט השמאלי: APIs & Services → Library
2. חפש ו-Enable:
   - Google+ API (או Google Identity API)
   - Gmail API

## שלב 3: יצירת OAuth 2.0 Credentials

1. לך ל: APIs & Services → Credentials
2. לחץ "Create Credentials" → "OAuth client ID"
3. בחר "Web application"
4. הגדר:
   - **Name**: "Hide My Email Web Client"
   - **Authorized JavaScript origins**:
     - http://localhost:3001
     - https://yourdomain.com (לפרודקשן)
   - **Authorized redirect URIs**:
     - http://localhost:3001
     - http://localhost:3001/auth/callback

## שלב 4: העתקת Credentials

1. העתק את ה-Client ID
2. העתק את ה-Client Secret
3. הכנס אותם לקבצי .env:

```bash
# Backend (.env)
GOOGLE_CLIENT_ID=your_real_client_id_here
GOOGLE_CLIENT_SECRET=your_real_client_secret_here

# Frontend (frontend/.env)
VITE_GOOGLE_CLIENT_ID=your_real_client_id_here
```

## שלב 5: OAuth Consent Screen

1. לך ל: APIs & Services → OAuth consent screen
2. בחר "External" (אלא אם יש לך G Suite)
3. מלא:
   - **App name**: "Hide My Email"
   - **User support email**: המייל שלך
   - **Developer contact**: המייל שלך
   - **Scopes**: email, profile

## שלב 6: Test Users (בתקופת הפיתוח)

1. בOAuth consent screen, לחץ "Add Users"
2. הוסף את המייל שלך לרשימת test users

## שלב 7: הפעלת המערכת מחדש

אחרי עדכון ה-credentials, הפעל מחדש:

```bash
# עצור את השרתים
Ctrl+C

# הפעל מחדש
npm run dev (בbackend)
cd frontend && npm run dev (בfrontend)
```

## Troubleshooting נפוצים

### "OAuth client was not found"
- בדוק שה-Client ID נכון בקבצי .env
- וודא שהדומיין מוגדר ב-Authorized origins

### "redirect_uri_mismatch"
- בדוק שה-callback URL מוגדר נכון בGoogle Console

### "invalid_client"
- בדוק שה-Client Secret נכון (רק בbackend)
- וודא שהפרויקט פעיל בGoogle Cloud

## דוגמת קבצי Environment (אחרי הגדרת Google):

```env
# .env (Backend)
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPx-your-real-secret-here

# frontend/.env
VITE_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
```