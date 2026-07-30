function includesAny(text, keywords) {
  return keywords.some(k => text.includes(k));
}

function formatCurrency(amount) {
  return `₹${amount}`;
}

module.exports = { includesAny, formatCurrency };