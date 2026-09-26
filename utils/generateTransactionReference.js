const Withdrawal = require('../models/Withdrawal');
const Deposit = require('../models/Deposit');

const generateTransactionReference = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const count = await Withdrawal.countDocuments({
    transactionReference: { $regex: `^JE-WD-${dateStr}` },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `JE-WD-${dateStr}-${seq}`;
};

const generateDepositReference = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const count = await Deposit.countDocuments({
    transactionReference: { $regex: `^JE-DP-${dateStr}` },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `JE-DP-${dateStr}-${seq}`;
};

module.exports = { generateTransactionReference, generateDepositReference };
