const Expense = require('../models/Expense');

const getExpenses = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20, startDate, endDate } = req.query;
    const filter = {};

    if (search) filter.title = { $regex: search, $options: 'i' };
    if (category) filter.category = category;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: expenses,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });
    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createExpense = async (req, res) => {
  try {
    const { title, category, amount, description, date } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Expense title is required.' });
    if (!amount || amount < 0) return res.status(400).json({ success: false, message: 'Valid amount is required.' });

    const expense = await Expense.create({
      title,
      category: category || 'Other',
      amount,
      description,
      date: date || new Date(),
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Expense created.', data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });
    res.json({ success: true, message: 'Expense updated.', data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });
    res.json({ success: true, message: 'Expense deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getExpenses, getExpense, createExpense, updateExpense, deleteExpense };
