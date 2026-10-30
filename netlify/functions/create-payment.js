// netlify/functions/create-payment.js
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { email } = JSON.parse(event.body); // গ্ৰাহকৰ ইমেইল (ঐচ্ছিক)

  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  
  const response = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify({
      amount: 3300, // ৩৩ টকা (পইচাত)
      currency: "INR",
      description: "VerifyTool Pro Subscription",
      customer: { email: email || "guest@example.com" },
      notify: { email: true },
      reminder_enable: true,
      callback_url: "https://আপোনাৰ-ছাইট-নাম.netlify.app/verify.html?payment=success",
      callback_method: "get"
    })
  });

  const data = await response.json();
  return { statusCode: 200, body: JSON.stringify({ url: data.short_url }) };
};
