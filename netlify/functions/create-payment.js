// netlify/functions/create-payment.js
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email } = JSON.parse(event.body);
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "Razorpay API keys are missing in Netlify Environment Variables." }) 
      };
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    
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
        // 👇 আপোনাৰ ছাইটৰ প্ৰকৃত লিংক ইয়াত দিয়া হৈছে 👇
        callback_url: "https://elaborate-shortbread-d543d4.netlify.app/verify.html?payment=success",
        callback_method: "get"
      })
    });

    const data = await response.json();
    
    if (data.error) {
        return { statusCode: 400, body: JSON.stringify({ error: data.error.description || "Razorpay rejected the request" }) };
    }

    return { statusCode: 200, body: JSON.stringify({ url: data.short_url }) };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
