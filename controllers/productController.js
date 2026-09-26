const Product = require('../models/Product');
const { cloudinary } = require('../config/cloudinary');
const streamifier = require('streamifier');

const getProducts = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20, stockStatus } = req.query;
    const filter = { isDeleted: false };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) filter.category = category;
    if (stockStatus === 'low') filter.$expr = { $lte: ['$stock', '$minimumStock'] };
    if (stockStatus === 'out') filter.stock = 0;

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('category', 'name')
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: products,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('supplier', 'name');
    if (!product || product.isDeleted)
      return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const productData = { ...req.body };

    // Clean up empty optional fields
    if (!productData.category || productData.category.trim?.() === '') delete productData.category;
    if (!productData.supplier || productData.supplier.trim?.() === '') delete productData.supplier;
    
    // Auto-generate SKU if not provided or empty
    if (!productData.sku || productData.sku.trim?.() === '') {
      productData.sku = `JE-${Date.now().toString().slice(-6)}`;
    } else {
      productData.sku = productData.sku.trim();
    }

    if (productData.purchasePrice !== undefined) productData.purchasePrice = Number(productData.purchasePrice);
    if (productData.sellingPrice !== undefined) productData.sellingPrice = Number(productData.sellingPrice);
    if (productData.stock !== undefined) productData.stock = Number(productData.stock) || 0;
    if (productData.minimumStock !== undefined) productData.minimumStock = Number(productData.minimumStock) || 5;

    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'jamal-electronics/products');
        productData.imageUrl = uploadResult.secure_url;
        productData.cloudinaryPublicId = uploadResult.public_id;
      } catch (uploadErr) {
        console.warn('Cloudinary upload warning:', uploadErr.message);
      }
    }

    const product = await Product.create(productData);
    const populated = await Product.findById(product._id).populate('category', 'name').populate('supplier', 'name');
    res.status(201).json({ success: true, message: 'Product created successfully.', data: populated });
  } catch (error) {
    console.error('createProduct error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const productData = { ...req.body };

    // Clean up empty relation fields
    if (!productData.category || productData.category === '') {
      productData.category = null;
    }
    if (!productData.supplier || productData.supplier === '') {
      productData.supplier = null;
    }
    if (productData.sku && productData.sku.trim() === '') {
      delete productData.sku;
    }

    if (productData.purchasePrice !== undefined) productData.purchasePrice = Number(productData.purchasePrice);
    if (productData.sellingPrice !== undefined) productData.sellingPrice = Number(productData.sellingPrice);
    if (productData.stock !== undefined) productData.stock = Number(productData.stock);
    if (productData.minimumStock !== undefined) productData.minimumStock = Number(productData.minimumStock);

    if (req.file) {
      const existing = await Product.findById(req.params.id);
      if (existing && existing.cloudinaryPublicId) {
        await cloudinary.uploader.destroy(existing.cloudinaryPublicId).catch(() => {});
      }
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'jamal-electronics/products');
        productData.imageUrl = uploadResult.secure_url;
        productData.cloudinaryPublicId = uploadResult.public_id;
      } catch (uploadErr) {
        console.warn('Cloudinary upload warning:', uploadErr.message);
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, productData, {
      new: true,
      runValidators: true,
    }).populate('category', 'name').populate('supplier', 'name');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product updated successfully.', data: product });
  } catch (error) {
    console.error('updateProduct error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct };
