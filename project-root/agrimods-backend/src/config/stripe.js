// src/config/stripe.js
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create a payment intent
const createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    throw new Error(`Stripe payment intent creation failed: ${error.message}`);
  }
};

// Create a checkout session
const createCheckoutSession = async (items, successUrl, cancelUrl, customerEmail = null) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.description || '',
            images: item.image ? [item.image] : undefined
          },
          unit_amount: Math.round(item.amount * 100), // Convert to cents
        },
        quantity: item.quantity || 1,
      })),
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata: {
        ...items.reduce((acc, item, index) => {
          acc[`item_${index}`] = item.name;
          return acc;
        }, {})
      }
    });

    return {
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    throw new Error(`Stripe checkout session creation failed: ${error.message}`);
  }
};

// Retrieve a payment intent
const getPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    throw new Error(`Stripe payment intent retrieval failed: ${error.message}`);
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
    return event;
  } catch (error) {
    throw new Error(`Stripe webhook verification failed: ${error.message}`);
  }
};

// Create a refund
const createRefund = async (paymentIntentId, amount = null) => {
  try {
    const refundParams = {
      payment_intent: paymentIntentId
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await stripe.refunds.create(refundParams);
    return refund;
  } catch (error) {
    throw new Error(`Stripe refund creation failed: ${error.message}`);
  }
};

module.exports = {
  stripe,
  createPaymentIntent,
  createCheckoutSession,
  getPaymentIntent,
  handleWebhook,
  createRefund
};
