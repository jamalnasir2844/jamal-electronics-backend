const mongoose = require('mongoose');
const Deposit = require('../models/Deposit');
const Customer = require('../models/Customer');
const ShopSettings = require('../models/ShopSettings');
const { generateDepositReference } = require('../utils/generateTransactionReference');

const getDeposits = async (req, res) => {
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

    const total = await Deposit.countDocuments(filter);
    const deposits = await Deposit.find(filter)
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: deposits,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDeposit = async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id).populate('customer');
    if (!deposit || deposit.isDeleted)
      return res.status(404).json({ success: false, message: 'Deposit not found.' });
    res.json({ success: true, data: deposit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createDeposit = async (req, res) => {
  try {
    const { customerName, phone, depositAmount, paymentMethod, notes } = req.body;

    if (!customerName || customerName.trim() === '') {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }
    if (!phone || phone.trim() === '') {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }
    const numAmount = Number(depositAmount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Deposit amount must be greater than 0.' });
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

    // Calculate service charge (deducted from deposit)
    const serviceCharge = (numAmount / chargePerSnapshot) * chargeRateSnapshot;
    const customerReceived = numAmount - serviceCharge;

    const transactionReference = await generateDepositReference();

    const deposit = await Deposit.create({
      customer: customer._id,
      customerNameSnapshot: cleanName,
      phoneSnapshot: cleanPhone,
      depositAmount: numAmount,
      chargeRateSnapshot,
      chargePerSnapshot,
      serviceCharge,
      customerReceived,
      paymentMethod: paymentMethod || 'Cash',
      transactionReference,
      notes: notes || '',
      createdBy: req.user?._id || null,
    });

    // Update customer PCO totals
    await Customer.findByIdAndUpdate(customer._id, {
      $inc: {
        totalWithdrawals: numAmount,  // reuse field for total PCO transactions
        totalCharges: serviceCharge,
        transactionCount: 1,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Deposit completed successfully.',
      data: { deposit, customer },
    });
  } catch (error) {
    console.error('createDeposit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteDeposit = async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit || deposit.isDeleted) {
      return res.status(404).json({ success: false, message: 'Deposit not found.' });
    }

    // Reverse customer totals
    if (deposit.customer) {
      await Customer.findByIdAndUpdate(
        deposit.customer,
        {
          $inc: {
            totalWithdrawals: -deposit.depositAmount,
            totalCharges: -deposit.serviceCharge,
            transactionCount: -1,
          },
        }
      );
    }

    await Deposit.findByIdAndUpdate(req.params.id, { isDeleted: true });

    res.json({ success: true, message: 'Deposit deleted and customer totals updated.' });
  } catch (error) {
    console.error('deleteDeposit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDeposits, getDeposit, createDeposit, deleteDeposit };
