"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = require("../../controllers/stripe");
const router = express_1.default.Router();
// Create Stripe checkout session
router.post('/create-checkout-session', stripe_1.createCheckoutSession);
// Activate Pro Trial
router.post('/activate-trial', stripe_1.activateTrial);
// Get subscription status
router.get('/subscription-status', stripe_1.getSubscriptionStatus);
// Cancel subscription
router.post('/cancel-subscription', stripe_1.cancelSubscription);
exports.default = router;
