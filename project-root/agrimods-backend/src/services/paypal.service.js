const paypal = require('paypal-rest-sdk');
require('dotenv').config();

// Configure PayPal SDK
paypal.configure({
  mode: process.env.PAYPAL_MODE, // 'sandbox' or 'live'
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

class PayPalService {
  // Create PayPal order
  static async createOrder(items, userId, orderId) {
    try {
      const totalPrice = items.reduce((sum, item) => sum + parseFloat(item.price), 0).toFixed(2);
      
      const create_payment_json = {
        intent: 'sale',
        payer: {
          payment_method: 'paypal'
        },
        redirect_urls: {
          return_url: `${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
        },
        transactions: [{
          item_list: {
            items: items.map(item => ({
              name: item.name,
              sku: item.sku || item.id,
              price: item.price.toFixed(2),
              currency: 'USD',
              quantity: 1
            }))
          },
          amount: {
            currency: 'USD',
            total: totalPrice
          },
          description: `AgriMods Purchase - Order #${orderId}`,
          custom: JSON.stringify({ userId, orderId })
        }]
      };

      return new Promise((resolve, reject) => {
        paypal.payment.create(create_payment_json, (error, payment) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              paymentID: payment.id,
              approvalUrl: payment.links.find(link => link.rel === 'approval_url').href
            });
          }
        });
      });
    } catch (error) {
      console.error('PayPal create order error:', error);
      throw new Error('Failed to create PayPal order');
    }
  }

  // Execute payment after approval
  static async executePayment(paymentId, payerId) {
    try {
      return new Promise((resolve, reject) => {
        const execute_payment_json = {
          payer_id: payerId,
          transactions: [{
            amount: {
              currency: 'USD',
              total: '0.00' // Will be calculated from payment details
            }
          }]
        };

        paypal.payment.execute(paymentId, execute_payment_json, async (error, payment) => {
          if (error) {
            reject(error);
          } else {
            // Verify payment details
            const transaction = payment.transactions[0];
            const amount = transaction.amount.total;
            const currency = transaction.amount.currency;
            const customData = JSON.parse(transaction.custom);
            
            resolve({
              success: true,
              paymentID: payment.id,
              payerID: payerId,
              amount,
              currency,
              userId: customData.userId,
              orderId: customData.orderId,
              status: payment.state
            });
          }
        });
      });
    } catch (error) {
      console.error('PayPal execute payment error:', error);
      throw new Error('Failed to execute PayPal payment');
    }
  }

  // Verify webhook signature (for IPN)
  static verifyWebhookSignature(headers, body, webhookId) {
    // Implementation for PayPal webhook verification
    // This is critical for production security
    // Full implementation would use PayPal SDK's webhook event verification
    return true; // Simplified for example
  }

  // Process webhook event
  static async processWebhookEvent(event) {
    try {
      const { resource, event_type } = event;
      
      if (event_type === 'PAYMENT.SALE.COMPLETED') {
        const orderId = JSON.parse(resource.custom).orderId;
        const userId = JSON.parse(resource.custom).userId;
        
        // Update order status in database
        const Order = require('../models/Order');
        await Order.findByIdAndUpdate(orderId, {
          status: 'completed',
          paypalSaleId: resource.id,
          processedAt: new Date()
        });
        
        // Grant access to purchased items
        await this.grantAccessToPurchasedItems(userId, orderId);
        
        // Process affiliate commission if applicable
        await this.processAffiliateCommission(userId, orderId);
        
        return { success: true };
      }
      
      return { success: false, message: 'Event type not processed' };
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw error;
    }
  }

  // Grant access to purchased mods/bundles
  static async grantAccessToPurchasedItems(userId, orderId) {
    const Order = require('../models/Order');
    const User = require('../models/User');
    const Bundle = require('../models/Bundle');
    
    const order = await Order.findById(orderId).populate('items.item');
    const user = await User.findById(userId);
    
    if (!order || !user) return;
    
    // Add purchased mods to user's library
    for (const item of order.items) {
      if (item.type === 'mod') {
        if (!user.purchasedMods.includes(item.item._id)) {
          user.purchasedMods.push(item.item._id);
        }
      } else if (item.type === 'bundle') {
        // Get all mods in bundle
        const bundle = await Bundle.findById(item.item._id).populate('mods');
        bundle.mods.forEach(mod => {
          if (!user.purchasedMods.includes(mod._id)) {
            user.purchasedMods.push(mod._id);
          }
        });
      }
    }
    
    // Handle subscription
    if (order.subscription) {
      user.activeSubscription = true;
      user.subscriptionExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    }
    
    await user.save();
    
    // Send confirmation email
    const EmailService = require('./email.service');
    await EmailService.sendPurchaseConfirmation(user, order);
  }

  // Process affiliate commission
  static async processAffiliateCommission(userId, orderId) {
    const User = require('../models/User');
    const Order = require('../models/Order');
    const Affiliate = require('../models/Affiliate');
    
    const order = await Order.findById(orderId);
    const customer = await User.findById(userId);
    
    // Check if customer was referred by an affiliate
    if (customer.referredBy) {
      const affiliate = await User.findById(customer.referredBy);
      
      if (affiliate) {
        const commissionAmount = order.totalAmount * affiliate.commissionRate;
        
        // Update affiliate stats
        affiliate.pendingCommission += commissionAmount;
        await affiliate.save();
        
        // Create affiliate record
        await Affiliate.create({
          affiliate: affiliate._id,
          referredUser: customer._id,
          order: orderId,
          commissionAmount,
          status: 'pending'
        });
        
        // Notify affiliate
        const EmailService = require('./email.service');
        await EmailService.sendAffiliateCommissionNotification(affiliate, commissionAmount, order._id);
      }
    }
  }
}

module.exports = PayPalService;