const PayPalService = require('../services/paypal.service');
const Order = require('../models/Order');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.createPayPalOrder = catchAsync(async (req, res, next) => {
  const { bundleType, items } = req.body;
  
  // Validate bundle type (match frontend bundles)
  const validBundles = ['balkan', 'premium', 'allaccess'];
  if (bundleType && !validBundles.includes(bundleType)) {
    return next(new AppError('Invalid bundle type', 400));
  }

  // Create order record (PENDING)
  const order = await Order.create({
    user: req.user.id,
    items: items || [{ type: 'bundle', bundleType, price: bundleType === 'balkan' ? 299.99 : 199.99 }],
    totalAmount: bundleType === 'balkan' ? 299.99 : (bundleType === 'premium' ? 199.99 : 9.99),
    status: 'pending',
    paymentMethod: 'paypal'
  });

  // Create PayPal payment
  const paypalData = await PayPalService.createOrder(
    items || [{ name: `${bundleType} bundle`, price: order.totalAmount, sku: bundleType }],
    req.user.id,
    order._id
  );

  res.status(200).json({
    orderId: order._id,
    approvalUrl: paypalData.approvalUrl,
    paymentID: paypalData.paymentID
  });
});

exports.executePayPalPayment = catchAsync(async (req, res, next) => {
  const { paymentID, payerID, orderId } = req.body;
  
  // Verify order belongs to user
  const order = await Order.findOne({ _id: orderId, user: req.user.id });
  if (!order || order.status !== 'pending') return next(new AppError('Invalid order', 400));

  // Execute payment
  const result = await PayPalService.executePayment(paymentID, payerID);
  
  // Update order
  order.status = 'completed';
  order.paypalSaleId = result.paymentID;
  order.processedAt = new Date();
  await order.save();

  // Grant access (critical!)
  await PayPalService.grantAccessToPurchasedItems(req.user.id, orderId);

  res.json({ success: true, message: 'Payment successful! Download your mods.' });
});

// PayPal webhook handler (MUST be public endpoint)
exports.handlePayPalWebhook = catchAsync(async (req, res, next) => {
  // ⚠️ CRITICAL: Verify webhook signature in production!
  // For sandbox testing, skip verification (REMOVE IN PRODUCTION)
  if (process.env.NODE_ENV === 'production') {
    // Implement PayPal webhook signature verification here
    // See: https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
  }
  
  await PayPalService.processWebhookEvent(req.body);
  res.status(200).send('WEBHOOK_PROCESSED');
});