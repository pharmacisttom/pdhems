# Account operations — AUTH-1

Open /login and enter the existing username or employee code and password. Remember-me is for private devices only. The account bar shows the current identity and role; change password there. Confirm Logout or Logout all devices with the dialog. Password changes terminate every session and require a new login. If logout fails, retry; do not assume server revocation succeeded.

Unknown credentials, disabled/suspended/locked accounts receive the same login failure. Temporary lock clears after the configured interval. During an active EMS mission, coordinate through radio/phone before logout or when authentication is unavailable; re-login and reconcile the server mission state.

The admin back office, account creation/reset, role editor, permission matrix, audit viewer and per-device session administration are not part of AUTH-1 and are not yet available. Do not distribute fixture credentials. Existing demo accounts need controlled credential rotation before deployment.
