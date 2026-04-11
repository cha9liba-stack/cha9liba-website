/**
 * Google Analytics integration
 * 
 * To enable Google Analytics:
 * 1. Install react-ga4: npm install react-ga4
 * 2. Set GA_MEASUREMENT_ID environment variable
 * 3. Uncomment the Google Analytics initialization code below
 */

// Uncomment these imports when Google Analytics is enabled
// import ReactGA from "react-ga4";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export function initAnalytics() {
  // Uncomment and configure Google Analytics when ready
  /*
  if (GA_MEASUREMENT_ID) {
    ReactGA.initialize(GA_MEASUREMENT_ID);
    console.log("[Analytics] Google Analytics initialized with ID:", GA_MEASUREMENT_ID);
  } else {
    console.log("[Analytics] GA_MEASUREMENT_ID not set. Analytics not enabled.");
  }
  */

  console.log("[Analytics] Google Analytics integration not enabled. To enable, install react-ga4 and configure.");
}

export function trackPageView(page: string) {
  // Uncomment when Google Analytics is enabled
  // ReactGA.send({ hitType: "pageview", page });
  console.log("[Analytics] Page view tracked:", page);
}

export function trackEvent(category: string, action: string, label?: string, value?: number) {
  // Uncomment when Google Analytics is enabled
  // ReactGA.event({ category, action, label, value });
  console.log("[Analytics] Event tracked:", { category, action, label, value });
}

export function trackContractCreation(contractNumber: string) {
  trackEvent("Contract", "Created", contractNumber);
}

export function trackContractUpdate(contractNumber: string) {
  trackEvent("Contract", "Updated", contractNumber);
}

export function trackContractDeletion(contractNumber: string) {
  trackEvent("Contract", "Deleted", contractNumber);
}

export function trackBookingAttempt(registration: string) {
  trackEvent("Booking", "Attempted", registration);
}

export function trackBookingSuccess(registration: string) {
  trackEvent("Booking", "Success", registration);
}

export function trackInvoiceCreation(invoiceNumber: string, amount: number) {
  trackEvent("Invoice", "Created", invoiceNumber, amount);
}
