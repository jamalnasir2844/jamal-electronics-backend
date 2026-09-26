const mongoose = require('mongoose');
const Withdrawal = require('../models/Withdrawal');
const Customer = require('../models/Customer');
const ShopSettings = require('../models/ShopSettings');
const { generateTransactionReference } = require('../utils/generateTransactionReference');

const getWithdrawals = async (req, res) => {
  try {
    const { search, page = 1, limit = 20, startDate, endDate, customerId } = req.query;
    const filter = { isDeleted: false };

    if (search) {
      filter.$or = [
        { transactionReference: { $regex: search, $options: 'i' } },
        { customerNameSnapshot: { $regex: search, $options: 'i' } },
        { phoneSnapshot: { $regex: search, $options: 'i' } },
      ];
    }

    if (customerId) filter.customer = customerId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    const total = await Withdrawal.countDocuments(filter);
    const withdrawals = await Withdrawal.find(filter)
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: withdrawals,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate('customer');
    if (!withdrawal || withdrawal.isDeleted)
      return res.status(404).json({ success: false, message: 'Withdrawal not found.' });
    res.json({ success: true, data: withdrawal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createWithdrawal = async (req, res) => {
  try {
    const { customerName, phone, withdrawalAmount, paymentMethod, notes } = req.body;

    if (!customerName || customerName.trim() === '') {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }
    if (!phone || phone.trim() === '') {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }
    const numAmount = Number(withdrawalAmount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Withdrawal amount must be greater than 0.' });
    }

    const cleanPhone = phone.trim();
    const cleanName = customerName.trim();

    // Get or create customer by phone
    let customer = await Customer.findOne({ phone: cleanPhone });
    if (!customer) {
      customer = await Customer.create({ name: cleanName, phone: cleanPhone });
    } else if (customer.name !== cleanName) {
      customer.name = cleanName;
      await customer.save();
    }

    // Get shop settings for rate snapshot
    let settings = await ShopSettings.findOne();
    if (!settings) {
      settings = await ShopSettings.create({ shopName: 'Jamal Electronics' });
    }

    const chargeRateSnapshot = settings.chargeRate || 20;
    const chargePerSnapshot = settings.chargePer || 1000;

    // Calculate service charge
    const serviceCharge = (numAmount / chargePerSnapshot) * chargeRateSnapshot;
    const customerPaid = numAmount + serviceCharge;

    const transactionReference = await generateTransactionReference();

    const withdrawal = await Withdrawal.create({
      customer: customer._id,
      customerNameSnapshot: cleanName,
      phoneSnapshot: cleanPhone,
      withdrawalAmount: numAmount,
      chargeRateSnapshot,
      chargePerSnapshot,
      serviceCharge,
      customerPaid,
      paymentMethod: paymentMethod || 'Cash',
      transactionReference,
      notes: notes || '',
      createdBy: req.user?._id || null,
    });

    // Update customer PCO totals
    await Customer.findByIdAndUpdate(customer._id, {
      $inc: {
        totalWithdrawals: numAmount,
        totalCharges: serviceCharge,
        transactionCount: 1,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal completed successfully.',
      data: { withdrawal, customer },
    });
  } catch (error) {
    console.error('createWithdrawal error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal || withdrawal.isDeleted) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found.' });
    }

    // Reverse customer totals
    if (withdrawal.customer) {
      await Customer.findByIdAndUpdate(
        withdrawal.customer,
        {
          $inc: {
            totalWithdrawals: -withdrawal.withdrawalAmount,
            totalCharges: -withdrawal.serviceCharge,
            transactionCount: -1,
          },
        }
      );
    }

    await Withdrawal.findByIdAndUpdate(req.params.id, { isDeleted: true });

    res.json({ success: true, message: 'Withdrawal deleted and customer totals updated.' });
  } catch (error) {
    console.error('deleteWithdrawal error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getWithdrawals, getWithdrawal, createWithdrawal, deleteWithdrawal };
