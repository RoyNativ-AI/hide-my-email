export default {
  async email(message, env, ctx) {
    try {
      const recipient = message.to;
      const from = message.from;

      console.log(`📧 Received email from ${from} to: ${recipient}`);

      // Step 1: Lookup alias
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
        await message.setReject(`Alias not found`);
        return;
      }

      const lookupData = await lookupResponse.json();

      if (!lookupData.forward) {
        console.log(`⚠️ Not forwarding: ${lookupData.reason || 'Inactive'}`);
        await message.setReject(lookupData.reason || 'Alias not active');
        return;
      }

      console.log(`✅ Forwarding to: ${lookupData.recipient}`);

      // Step 2: Get email content
      const rawEmail = await new Response(message.raw).text();
      let subject = 'Forwarded Email';

      if (message.headers && message.headers.get('subject')) {
        subject = message.headers.get('subject');
      }

      // Step 3: Forward via API (using Resend)
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
          recipient: lookupData.recipient,
          subject: subject,
          text: rawEmail,
          rawEmail: rawEmail
        })
      });

      if (!forwardResponse.ok) {
        console.error(`❌ Forward failed: ${forwardResponse.status}`);
        await message.setReject('Failed to forward email');
        return;
      }

      console.log(`🎉 Email forwarded successfully!`);

    } catch (error) {
      console.error('❌ Error:', error);
      await message.setReject('Internal error');
    }
  }
};
