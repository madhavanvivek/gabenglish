# Local OTP testing

## Development-only fixed code

When the API runs with `NODE_ENV=development`, the passwordless learner OTP flow accepts the fixed code:

```text
123456
```

This applies to both initial email/phone sign-in and adding a second verified contact. The development server uses a no-op delivery adapter so a challenge is marked as sent without contacting an email or SMS provider. Enter `123456` in the app's verification screen.

The fixed code is selected only by the API's development configuration. In `test` and `production`, OTPs remain random and require a configured delivery adapter. Production requests fail closed with `OTP_DELIVERY_UNAVAILABLE` until a real provider is configured. Never enable development mode on a publicly reachable deployment.

## Local setup

Keep the API environment set to:

```env
NODE_ENV=development
```

Restart the API after changing its environment. Request an OTP from the Android app and enter `123456`. OTP challenges still retain their existing expiry, attempt limit, single-use behavior, and request throttling.

## Provider integration later

Configure a real email and SMS adapter and its credentials, then remove the development no-op adapter from any non-local deployment. Do not expose the fixed code in a production API response, logs, or client bundle.
