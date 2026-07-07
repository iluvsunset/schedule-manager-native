const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'cron.js');
let content = fs.readFileSync(filePath, 'utf8');

// We need to wrap the email logic and webhook logic into two separate promises.
// Right after `// 4. (Removed Mailjet API keys logic)` we inject our wrapper.

const emailStartStr = `    let emailsSent = 0;
    const emailPromises = [];`;

const emailEndStr = `    console.log(\`Cron completed: \${successful} successful, \${failed} failed out of \${emailsSent} total attempts\`);`;

const webhookStartStr = `    // 7. Webhook Channel Renewal — prevent silent death of GCal push notifications
    let channelsRenewed = 0;
    let channelErrors = 0;
    try {`;

const webhookEndStr = `    } catch (renewalErr) {
      console.error('Webhook renewal phase error:', renewalErr.message);
    }`;

// First, wrap the email logic
const emailLogicBlock = content.substring(
  content.indexOf(emailStartStr),
  content.indexOf(emailEndStr) + emailEndStr.length
);

const newEmailLogicBlock = `
    const processEmailsTask = async () => {
      ${emailLogicBlock.replace(/\n/g, '\n  ')}
      return { emailsSent, successful, failed };
    };
`;

// Next, wrap the webhook logic
const webhookLogicBlock = content.substring(
  content.indexOf(webhookStartStr),
  content.indexOf(webhookEndStr) + webhookEndStr.length
);

const newWebhookLogicBlock = `
    const processWebhooksTask = async () => {
      ${webhookLogicBlock.replace(/\n/g, '\n  ')}
      return { channelsRenewed, channelErrors };
    };
`;

// Now replace both blocks with the wrapped versions, and add the Promise.allSettled at the end
const combinedReplacement = `
${newEmailLogicBlock}
${newWebhookLogicBlock}

    // Run both tasks concurrently to maximize the 10-second serverless window
    const [emailResult, webhookResult] = await Promise.all([
      processEmailsTask(),
      processWebhooksTask()
    ]);

    const { emailsSent, successful, failed } = emailResult;
    const { channelsRenewed, channelErrors } = webhookResult;
`;

// Replace the original blocks
content = content.replace(emailLogicBlock, '');
content = content.replace(webhookLogicBlock, combinedReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Cron successfully refactored!');
