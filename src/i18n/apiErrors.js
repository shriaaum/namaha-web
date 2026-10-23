/*
 * The API answers errors with English `message` text. In English it is shown
 * as-is; in Hindi/Telugu a known message is shown via its i18n key, and an
 * unknown one falls back to the page's own translated error so the user never
 * sees an English sentence on a localized page.
 */
const KNOWN_MESSAGES = {
  'Invalid OTP': 'apiErrors.invalidOtp',
  'OTP expired': 'apiErrors.otpExpired',
  'Mobile required': 'apiErrors.mobileRequired',
  'Mobile and OTP are required': 'apiErrors.mobileOtpRequired',
  'Session expired. Please login again': 'apiErrors.sessionExpired',
  'Invalid or expired token': 'apiErrors.sessionExpired',
  'Account inactive': 'apiErrors.accountInactive',
  'User not found': 'apiErrors.userNotFound',
  'Devotee not found': 'apiErrors.userNotFound',
  'Devotee login required': 'apiErrors.loginRequired',
  'Name is required': 'apiErrors.nameRequired',
  'Mobile, name, dob & zodiac are required': 'apiErrors.profileFieldsRequired',
  'Image upload failed': 'apiErrors.imageUploadFailed',
  'Invalid phone number': 'apiErrors.invalidPhone',
  'Past date not allowed': 'apiErrors.pastDate',
  'Invalid or expired coupon code': 'apiErrors.couponInvalid',
  'This coupon has expired': 'apiErrors.couponExpired',
  'This coupon is no longer active': 'apiErrors.couponInactive',
  'Pooja not found': 'apiErrors.poojaNotFound',
  'Booking not found': 'apiErrors.bookingNotFound',
  'Invalid booking ID': 'apiErrors.bookingNotFound',
  'Failed to fetch bookings': 'apiErrors.bookingsLoadFailed',
  'Please enter your name.': 'apiErrors.enterName',
  'Please enter a valid email.': 'apiErrors.enterEmail',
  'Please enter a valid 10-digit mobile number.': 'apiErrors.enterMobile',
  'Please enter a complete delivery address with a 6-digit pincode.': 'apiErrors.enterAddress',
  'Quantity must be between 1 and 10.': 'apiErrors.quantityRange',
  'Prasadam is currently unavailable.': 'apiErrors.prasadamUnavailable',
  'Unable to start payment. Please try again.': 'apiErrors.paymentStartFailed',
  'Invalid payment signature.': 'apiErrors.paymentVerifyFailed',
  'Missing payment details.': 'apiErrors.paymentVerifyFailed',
  'Order not found.': 'apiErrors.orderNotFound',
  'Order not found': 'apiErrors.orderNotFound',
  'Server error': 'apiErrors.serverError',
};

/** Localized text for an API message, or `fallback` when it is empty/unknown on a non-English page. */
export function localizeApiMessage(message, fallback, t, language) {
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) return fallback;
  const key = KNOWN_MESSAGES[text];
  if (key) return t(key);
  return language === 'en' ? text : fallback;
}

/** Same as localizeApiMessage, reading the message from an axios error. */
export const localizeApiError = (err, fallback, t, language) =>
  localizeApiMessage(err?.response?.data?.message, fallback, t, language);
