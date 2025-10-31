"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelSubscription = exports.getSubscriptionStatus = exports.activateTrial = exports.createCheckoutSession = void 0;
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
});
const createCheckoutSession = async (req, res) => {
    try {
        console.log('Creating checkout session backend:');
        const { priceId, userId, planName, successUrl, cancelUrl } = req.body;
        if (!priceId || !userId) {
            res.status(400).json({
                error: 'Missing required parameters'
            });
            return;
        }
        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: `${userId}@example.com`, // You might want to get actual email from your user database
            metadata: {
                userId: userId,
                planName: planName,
            },
            subscription_data: {
                metadata: {
                    userId: userId,
                    planName: planName,
                },
            },
            allow_promotion_codes: true,
        });
        res.json({ sessionId: session.id });
    }
    catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
};
exports.createCheckoutSession = createCheckoutSession;
const activateTrial = async (req, res) => {
    try {
        console.log('Activating Pro Trial backend:', req.body);
        const { userId } = req.body;
        if (!userId) {
            res.status(400).json({
                error: 'Missing userId'
            });
            return;
        }
        // Here you would typically:
        // 1. Update user's subscription status in your database
        // 2. Set trial start and end dates
        // 3. Grant access to Pro features
        // For now, we'll simulate the activation
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 days trial
        // TODO: Update your user database with trial information
        // Example:
        // await updateUserSubscription(userId, {
        //   plan: 'pro-trial',
        //   status: 'trialing',
        //   trialEnd: trialEndDate,
        //   trialStart: new Date(),
        // });
        res.json({
            success: true,
            message: 'Pro Trial activated successfully',
            trialEnd: trialEndDate.toISOString(),
        });
    }
    catch (error) {
        console.error('Error activating Pro Trial:', error);
        res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
};
exports.activateTrial = activateTrial;
const getSubscriptionStatus = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({
                error: 'Missing userId'
            });
            return;
        }
        // TODO: Get user's Stripe customer ID from your database
        // For now, we'll return a mock response
        // Example of how you would get subscription status from Stripe:
        // const customer = await stripe.customers.list({
        //   email: `${userId}@example.com`,
        //   limit: 1,
        // });
        // if (customer.data.length === 0) {
        //   res.json({
        //     hasSubscription: false,
        //     plan: null,
        //     status: null,
        //   });
        //   return;
        // }
        // const subscriptions = await stripe.subscriptions.list({
        //   customer: customer.data[0].id,
        //   status: 'all',
        //   limit: 1,
        // });
        // Mock response for now
        res.json({
            hasSubscription: false,
            plan: null,
            status: null,
            trialEnd: null,
        });
    }
    catch (error) {
        console.error('Error getting subscription status:', error);
        res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
};
exports.getSubscriptionStatus = getSubscriptionStatus;
const cancelSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.body;
        if (!subscriptionId) {
            res.status(400).json({
                error: 'Missing subscriptionId'
            });
            return;
        }
        // Cancel the subscription in Stripe
        const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);
        // TODO: Update your user database with cancellation status
        res.json({
            success: true,
            message: 'Subscription canceled successfully',
            subscription: {
                id: canceledSubscription.id,
                status: canceledSubscription.status,
                canceled_at: canceledSubscription.canceled_at,
            }
        });
    }
    catch (error) {
        console.error('Error canceling subscription:', error);
        res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
};
exports.cancelSubscription = cancelSubscription;
