import crypto from 'crypto';

export function verifySlackSignature(req, res, next) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const timestamp = req.headers['x-slack-request-timestamp'];
  const signature = req.headers['x-slack-signature'];
  
  if (!timestamp || !signature) {
    return res.status(400).send('Missing Slack headers');
  }

  // Prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    return res.status(400).send('Request too old');
  }

  const sigBaseString = `v0:${timestamp}:${JSON.stringify(req.body)}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBaseString)
    .digest('hex');

  if (crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  )) {
    next();
  } else {
    res.status(400).send('Invalid signature');
  }
}