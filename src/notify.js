// Tells the user how a run on their computer went: a result email and a Windows or Mac notification.
// A failure here is only logged, so it can never hide the booking result.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import nodemailer from 'nodemailer';

// Sends only if SMTP_USERNAME, SMTP_PASSWORD and MAIL_TO are all set.
async function sendEmail(result, text) {
  const { SMTP_USERNAME: user, SMTP_PASSWORD: pass, MAIL_TO: to } = process.env;
  if (!user || !pass || !to) return;
  const transport = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } });
  await transport.sendMail({
    from: `Pickleball Booker <${user}>`,
    to,
    subject: `Pickleball: ${result.status} - ${result.label}`,
    text,
  });
}

// The text travels in environment variables so nothing in it is treated as PowerShell.
const TOAST_SCRIPT = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
$type = [Windows.UI.Notifications.ToastTemplateType]::ToastText02
$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($type)
$lines = $xml.GetElementsByTagName('text')
$lines.Item(0).AppendChild($xml.CreateTextNode($env:TOAST_TITLE)) | Out-Null
$lines.Item(1).AppendChild($xml.CreateTextNode($env:TOAST_BODY)) | Out-Null
$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($xml))
`;

async function showToast(result) {
  if (process.platform !== 'win32') return;
  await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', TOAST_SCRIPT], {
    env: { ...process.env, TOAST_TITLE: `Pickleball: ${result.status}`, TOAST_BODY: `${result.label}\n${result.message}` },
  });
}

// The text is passed as arguments, so nothing in it is treated as AppleScript.
const MAC_SCRIPT = 'on run argv\n display notification (item 2 of argv) with title (item 1 of argv)\nend run';

async function showMacNotification(result) {
  if (process.platform !== 'darwin') return;
  await promisify(execFile)('osascript', ['-e', MAC_SCRIPT, `Pickleball: ${result.status}`, `${result.label}\n${result.message}`]);
}

export async function notify(result, text) {
  if (result.status === 'skipped') return; // nights with nothing to book stay quiet
  for (const send of [() => sendEmail(result, text), () => showToast(result), () => showMacNotification(result)]) {
    try {
      await send();
    } catch (err) {
      console.log(`Could not send a notification: ${err.message}`);
    }
  }
}
