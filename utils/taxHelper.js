const GST_RATES = { 'GST12': 5 };
const DEFAULT_GST_RATE = 18;

export const getGstRate = (taxcode) => GST_RATES[taxcode] || DEFAULT_GST_RATE;

export const toPostTax = (preTaxPrice, taxcode) => {
  return preTaxPrice * (1 + getGstRate(taxcode) / 100);
};

export const toPreTax = (postTaxPrice, taxcode) => {
  return postTaxPrice / (1 + getGstRate(taxcode) / 100);
};
