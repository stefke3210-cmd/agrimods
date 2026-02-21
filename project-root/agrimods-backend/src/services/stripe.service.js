// src/services/stripe.service.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AppError = require('../utils/appError');

// Create a payment intent
const createPaymentIntent = async (amount, currency = 'usd', metadata = {}, customer = null) => {
  try {
    const paymentIntentParams = {
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    };

    if (customer) {
      paymentIntentParams.customer = customer;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency
    };
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    throw new AppError(`Payment failed: ${error.message}`, 400);
  }
};

// Create a checkout session
const createCheckoutSession = async (items, successUrl, cancelUrl, customerEmail = null, metadata = {}) => {
  try {
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description || '',
          images: item.image ? [item.image] : undefined,
          metadata: item.metadata || {}
        },
        unit_amount: Math.round(item.amount * 100), // Convert to cents
      },
      quantity: item.quantity || 1,
    }));

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      success: true,
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    throw new AppError(`Checkout failed: ${error.message}`, 400);
  }
};

// Create a subscription
const createSubscription = async (customerId, priceId, trialDays = 0) => {
  try {
    const subscriptionParams = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    };

    if (trialDays > 0) {
      subscriptionParams.trial_period_days = trialDays;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    return {
      success: true,
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      status: subscription.status
    };
  } catch (error) {
    console.error('Stripe subscription error:', error);
    throw new AppError(`Subscription failed: ${error.message}`, 400);
  }
};

// Retrieve a payment intent
const getPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      success: true,
      paymentIntent
    };
  } catch (error) {
    console.error('Stripe payment intent retrieval error:', error);
    throw new AppError(`Failed to retrieve payment: ${error.message}`, 400);
  }
};

// Retrieve a checkout session
const getCheckoutSession = async (sessionId) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items']
    });
    return {
      success: true,
      session
    };
  } catch (error) {
    console.error('Stripe session retrieval error:', error);
    throw new AppError(`Failed to retrieve session: ${error.message}`, 400);
  }
};

// Handle webhook events
const handleWebhook = (payload, signature, webhookSecret) => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return {
      success: true,
      event
    };
  } catch (error) {
    console.error('Stripe webhook error:', error);
    throw new AppError(`Webhook verification failed: ${error.message}`, 400);
  }
};

// Create a refund
const createRefund = async (paymentIntentId, amount = null, reason = 'requested_by_customer') => {
  try {
    const refundParams = {
      payment_intent: paymentIntentId,
      reason
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await stripe.refunds.create(refundParams);

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status
    };
  } catch (error) {
    console.error('Stripe refund error:', error);
    throw new AppError(`Refund failed: ${error.message}`, 400);
  }
};

// Create a customer
const createCustomer = async (email, name = null, metadata = {}) => {
  try {
    const customerParams = {
      email,
      metadata
    };

    if (name) {
      customerParams.name = name;
    }

    const customer = await stripe.customers.create(customerParams);

    return {
      success: true,
      customerId: customer.id,
      email: customer.email
    };
  } catch (error) {
    console.error('Stripe customer creation error:', error);
    throw new AppError(`Failed to create customer: ${error.message}`, 400);
  }
};

// Get customer by ID
const getCustomer = async (customerId) => {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return {
      success: true,
      customer
    };
  } catch (error) {
    console.error('Stripe customer retrieval error:', error);
    throw new AppError(`Failed to get customer: ${error.message}`, 400);
  }
};

// Update customer
const updateCustomer = async (customerId, updates) => {
  try {
    const customer = await stripe.customers.update(customerId, updates);
    return {
      success: true,
      customer
    };
  } catch (error) {
    console.error('Stripe customer update error:', error);
    throw new AppError(`Failed to update customer: ${error.message}`, 400);
  }
};

// Delete customer
const deleteCustomer = async (customerId) => {
  try {
    await stripe.customers.del(customerId);
    return {
      success: true,
      message: 'Customer deleted successfully'
    };
  } catch (error) {
    console.error('Stripe customer deletion error:', error);
    throw new AppError(`Failed to delete customer: ${error.message}`, 400);
  }
};

// List customer payment methods
const getPaymentMethods = async (customerId) => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });

    return {
      success: true,
      paymentMethods: paymentMethods.data
    };
  } catch (error) {
    console.error('Stripe payment methods error:', error);
    throw new AppError(`Failed to get payment methods: ${error.message}`, 400);
  }
};

// Create a product
const createProduct = async (name, description = null, images = [], metadata = {}) => {
  try {
    const productParams = {
      name,
      metadata
    };

    if (description) {
      productParams.description = description;
    }

    if (images.length > 0) {
      productParams.images = images;
    }

    const product = await stripe.products.create(productParams);

    return {
      success: true,
      productId: product.id,
      product
    };
  } catch (error) {
    console.error('Stripe product creation error:', error);
    throw new AppError(`Failed to create product: ${error.message}`, 400);
  }
};

// Create a price
const createPrice = async (productId, unitAmount, currency = 'usd', recurring = null) => {
  try {
    const priceParams = {
      product: productId,
      unit_amount: Math.round(unitAmount * 100), // Convert to cents
      currency
    };

    if (recurring) {
      priceParams.recurring = recurring;
    }

    const price = await stripe.prices.create(priceParams);

    return {
      success: true,
      priceId: price.id,
      price
    };
  } catch (error) {
    console.error('Stripe price creation error:', error);
    throw new AppError(`Failed to create price: ${error.message}`, 400);
  }
};

// Public methods
module.exports = {
  // Payment Intents
  createPaymentIntent,
  getPaymentIntent,

  // Checkout
  createCheckoutSession,
  getCheckoutSession,

  // Subscriptions
  createSubscription,

  // Refunds
  createRefund,

  // Customers
  createCustomer,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  getPaymentMethods,

  // Products & Prices
  createProduct,
  createPrice,

  // Webhooks
  handleWebhook,

  // Direct stripe instance for advanced usage
  stripe
};
