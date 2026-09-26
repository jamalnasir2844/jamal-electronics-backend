const formatCurrency = (amount, symbol = 'Rs.') => {
  return `${symbol} ${Number(amount || 0).toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

module.exports = { formatCurrency };
