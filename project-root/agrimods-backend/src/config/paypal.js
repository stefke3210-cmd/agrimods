// src/config/paypal.js
require('dotenv').config();
const paypal = require('paypal-rest-sdk');

// Configure PayPal
paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox', // 'sandbox' or 'live'
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

// Helper function to create payment
const createPayment = (amount, currency = 'USD', description = 'AgriMods Payment') => {
  return new Promise((resolve, reject) => {
    const create_payment_json = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
      },
      transactions: [{
        item_list: {
          items: [{
            name: description,
            sku: '001',
            price: amount,
            currency: currency,
            quantity: 1
          }]
        },
        amount: {
          currency: currency,
          total: amount.toFixed(2)
        },
        description: description
      }]
    };

    paypal.payment.create(create_payment_json, (error, payment) => {
      if (error) {
        reject(error);
      } else {
        // Get approval URL
        const approvalLink = payment.links.find(link => link.rel === 'approval_url');
        resolve({
          paymentId: payment.id,
          approvalUrl: approvalLink.href
        });
      }
    });
  });
};

// Helper function to execute payment
const executePayment = (paymentId, payerId) => {
  return new Promise((resolve, reject) => {
    const execute_payment_json = {
      payer_id: payerId
    };

    paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
      if (error) {
        reject(error);
      } else {
        resolve({
          success: true,
          paymentId: payment.id,
          state: payment.state,
          amount: payment.transactions[0].amount.total
        });
      }
    });
  });
};

// Helper function to get payment details
const getPaymentDetails = (paymentId) => {
  return new Promise((resolve, reject) => {
    paypal.payment.get(paymentId, (error, payment) => {
      if (error) {
        reject(error);
      } else {
        resolve(payment);
      }
    });
  });
};

module.exports = {
  paypal,
  createPayment,
  executePayment,
  getPaymentDetails
};
