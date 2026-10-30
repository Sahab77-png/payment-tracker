// netlify/functions/razorpay-webhook.js
const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const signature = event.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const body = event.body;

  // ছিগনেচাৰ যাচাই (নিরাপত্তাৰ বাবে অতি জৰুৰী)
  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (expectedSignature !== signature) {
    return { statusCode: 400, body: "Invalid signature" };
  }

  const payload = JSON.parse(body);
  if (payload.event === 'payment.captured') {
    const payment = payload.payload.payment.entity;
    const email = payment.email;

    // Netlify Blobs ত গ্ৰাহকক Pro হিচাপে ছেভ কৰা
    const store = getStore('pro-users');
    await store.set(email, 'pro');
  }

  return { statusCode: 200, body: "OK" };
};
