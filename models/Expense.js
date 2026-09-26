const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Rent', 'Electricity', 'Transport', 'Salary', 'Maintenance', 'Internet', 'Other'],
      default: 'Other',
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
