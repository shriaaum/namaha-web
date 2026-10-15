let context = {};
let completed = false;
export const setExitIntentContext = (next) => { context = { ...context, ...next }; };
export const getExitIntentContext = () => context;
export const markBookingCompleted = () => { completed = true; };
export const isBookingCompleted = () => completed;
