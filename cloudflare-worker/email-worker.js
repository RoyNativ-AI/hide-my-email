/**
 * Cloudflare Email Worker
 * Receives emails and forwards them via API (using Resend)
 *
 * How to deploy:
 * 1. Go to Cloudflare Dashboard → Email Routing → Email Workers
 * 2. Create new worker
 * 3. Paste this code
 * 4. Set environment variables:
 *    - API_URL: https://your-app.herokuapp.com
 *    - WORKER_API_KEY: your-secret-key
 */

export default {
  async email(message, env, ctx) {
    try {
      const recipient = message.to;
      const from = message.from;

      console.log(`📧 Received email from ${from} to: ${recipient}`);

      // Step 1: Call API to lookup the alias
      const lookupUrl = `${env.API_URL}/api/aliases/lookup/${encodeURIComponent(recipient)}`;

      const lookupResponse = await fetch(lookupUrl, {
        method: 'GET',
        headers: {
          'X-API-Key': env.WORKER_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!lookupResponse.ok) {
        console.error(`❌ Lookup failed: ${lookupResponse.status}`);
        await message.setReject(`Alias not found or inactive`);
        return;
      }

      const lookupData = await lookupResponse.json();

      // Check if we should forward
      if (!lookupData.forward) {
        console.log(`⚠️ Not forwarding: ${lookupData.reason || 'Unknown reason'}`);
        await message.setReject(lookupData.reason || 'Alias not active');
        return;
      }

      const realRecipient = lookupData.recipient;

      console.log(`✅ Forwarding to: ${realRecipient}`);

      // Step 2: Get email content
      const rawEmail = await new Response(message.raw).text();
      const reader = message.raw.getReader();

      // Extract subject and body
      let subject = 'Forwarded Email';
      let textBody = '';
      let htmlBody = '';

      // Simple parsing from headers
      const headers = message.headers;
      if (headers.get('subject')) {
        subject = headers.get('subject');
      }

      // Step 3: Send to API for forwarding via Resend
      const forwardUrl = `${env.API_URL}/api/forward`;

      const forwardResponse = await fetch(forwardUrl, {
        method: 'POST',
        headers: {
          'X-API-Key': env.WORKER_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: from,
          to: recipient,
          recipient: realRecipient,
          subject: subject,
          text: textBody || 'Email content',
          html: htmlBody,
          rawEmail: rawEmail
        })
      });

      if (!forwardResponse.ok) {
        const errorData = await forwardResponse.json().catch(() => ({}));
        console.error(`❌ Forward failed: ${forwardResponse.status}`, errorData);
        await message.setReject('Failed to forward email');
        return;
      }

      console.log(`🎉 Email forwarded successfully!`);

    } catch (error) {
      console.error('❌ Error processing email:', error);
      await message.setReject('Internal error processing email');
    }
  }
};
