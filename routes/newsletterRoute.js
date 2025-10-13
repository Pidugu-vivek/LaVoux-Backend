import express from 'express'
import { subscribe, validateCoupon, redeemCoupon, status } from '../controllers/newsletterController.js'

const router = express.Router()

router.post('/subscribe', subscribe)
// validate only (doesn't mark used)
router.post('/validate', validateCoupon)
// mark coupon used (call this after successful order/payment)
router.post('/redeem', redeemCoupon)
router.get('/status', status)

export default router