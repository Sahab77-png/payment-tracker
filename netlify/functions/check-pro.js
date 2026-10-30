const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const email = event.queryStringParameters.email;
  if (!email) return { statusCode: 400, body: "Email required" };

  const store = getStore('pro-users');
  const status = await store.get(email);
  
  return {
    statusCode: 200,
    body: JSON.stringify({ isPro: status === 'pro' })
  };
};
