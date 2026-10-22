const key = String(process.env.REACT_APP_RAZORPAY_KEY_ID || "").trim();

if (!/^rzp_(?:live|test)_[A-Za-z0-9]+$/.test(key)) {
  console.error("Missing or invalid REACT_APP_RAZORPAY_KEY_ID build argument.");
  process.exit(1);
}

console.log("Razorpay public checkout key is configured for this build.");
