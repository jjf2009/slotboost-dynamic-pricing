// Twilio client wrapper
// Note: twilio package must be installed: npm install twilio

export function getTwilioClient() {
  // Dynamically import to avoid issues in edge runtime
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilio = require('twilio')
  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  )
}

export const TWILIO_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER!
