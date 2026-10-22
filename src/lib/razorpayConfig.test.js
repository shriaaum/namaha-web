import { getRazorpayPublicKey, RAZORPAY_PUBLIC_KEY_ENV } from "./razorpayConfig";

describe("Razorpay checkout configuration", () => {
  test("accepts a valid public live or test checkout key", () => {
    expect(getRazorpayPublicKey({ [RAZORPAY_PUBLIC_KEY_ENV]: "rzp_test_checkout123" }))
      .toBe("rzp_test_checkout123");
  });

  test("rejects a missing, malformed, or secret key", () => {
    expect(getRazorpayPublicKey({})).toBeNull();
    expect(getRazorpayPublicKey({ [RAZORPAY_PUBLIC_KEY_ENV]: "" })).toBeNull();
    expect(getRazorpayPublicKey({ [RAZORPAY_PUBLIC_KEY_ENV]: "not-a-public-key" })).toBeNull();
    expect(getRazorpayPublicKey({ [RAZORPAY_PUBLIC_KEY_ENV]: "Razorpay-secret" })).toBeNull();
  });
});
