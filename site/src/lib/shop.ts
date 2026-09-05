// Shop configuration. Fill these in when the shop opens; empty strings hide the option.
export const shop = {
  handle: '@Riftvesting',
  dmUrl: 'https://x.com/Riftvesting',
  paypalMe: '',                 // e.g. 'https://paypal.me/yourname'
  crypto: {} as Record<string, string>, // e.g. { BTC: 'bc1...', ETH: '0x...', USDC: '0x...' }
};
export const certUrl = (grader: string, cert: string) =>
  grader === 'PSA' ? `https://www.psacard.com/cert/${cert}` : null;
