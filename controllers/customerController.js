const Customer = require('../models/Customer');

const getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Customer.countDocuments(filter);
    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: customers,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Customer name is required.' });
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required.' });

    const existing = await Customer.findOne({ phone });
    if (existing) return res.status(400).json({ success: false, message: 'Customer with this phone already exists.', data: existing });

    const customer = await Customer.create({ name, phone, email, address });
    res.status(201).json({ success: true, message: 'Customer created.', data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
    res.json({ success: true, message: 'Customer updated.', data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
    res.json({ success: true, message: 'Customer deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer };
