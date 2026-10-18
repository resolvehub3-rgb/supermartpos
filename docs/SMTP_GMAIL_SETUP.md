# Gmail SMTP Transactional Email Setup

Afrimart POS uses Gmail SMTP for transactional notifications, including:
- Shop registration received notices
- Registration approval/rejection emails
- Cashier staff invitations and temporary credentials
- Low-stock and product expiry operational warnings
- Subscription invoice confirmations and renewal reminders

---

## 1. Generate a Google App Password

1. Sign in to your Google Account (e.g., `notifications@yourdomain.com`).
2. Navigate to **Google Account Security**: [https://myaccount.google.com/security](https://myaccount.google.com/security)
3. Ensure **2-Step Verification** is turned ON.
4. Search for or click **App passwords** (or go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
5. Enter an app name, e.g. `Afrimart POS Server`.
6. Click **Create**.
7. Google will display a 16-character passcode (e.g. `abcd efgh ijkl mnop`). Copy this password without spaces.

---

## 2. Configure Environment Variables

Add the credentials to your environment (`.env`):

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="notifications@yourdomain.com"
SMTP_PASSWORD="abcdefghijklmnop" # 16-character App Password
SMTP_FROM_EMAIL="notifications@yourdomain.com"
SMTP_FROM_NAME="Afrimart POS Cloud"
```

*Note: The application logs email delivery attempts in the `email_delivery_logs` table for auditability.*
