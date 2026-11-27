// Hand-authored fixture.
// Not model output. Not an official OpenCode asset.
const docs = searchDocs("invoice approval policy");
let email;
try {
  email = await sendEmail({
    to: "ops@example.com",
    subject: "Policy check",
    body: "hits=" + docs.hits.length,
  });
} catch (error) {
  return {
    stopped: "sendEmail",
    message: error && error.message ? error.message : String(error),
    docs: docs,
  };
}
let charge;
try {
  charge = await chargeCard({
    amountCents: 4200,
    currency: "USD",
    memo: "desk demo",
  });
} catch (error) {
  return {
    stopped: "chargeCard",
    message: error && error.message ? error.message : String(error),
    docs: docs,
    email: email,
  };
}
return {
  stopped: null,
  docs: docs,
  email: email,
  charge: charge,
};
