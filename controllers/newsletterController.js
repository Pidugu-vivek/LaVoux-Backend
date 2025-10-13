import Newsletter from '../models/newsletterModel.js'
import nodemailer from 'nodemailer'

const generateCoupon = () => {
  return `WELCOME20-${Math.random().toString(36).slice(2,8).toUpperCase()}`
}

const sendCouponEmail = async (to, name = '', coupon) => {
  let transporter
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false }
    })
  } else {
    const testAccount = await nodemailer.createTestAccount()
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass }
    })
  }

  const subject = 'Your one-time 20% welcome coupon'
  const text = `${name || 'Hello'},\n\nThanks for subscribing. Use this one-time coupon to get 20% off your order:\n\n${coupon}\n\nThis coupon is valid for a single use only.\n\nThanks.`
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || `no-reply@${process.env.FRONTEND_URL?.replace(/^https?:\/\//,'') || 'local'}`,
    to,
    subject,
    text,
    html: `<p>${text.replace(/\n/g,'<br/>')}</p>`
  })

  // helpful during dev
  const preview = nodemailer.getTestMessageUrl(info)
  return preview || null
}

export const subscribe = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ success: false, message: 'Email required' })

    const existing = await Newsletter.findOne({ email: email.toLowerCase() })
    if (existing) {
      if (existing.claimed) {
        return res.status(200).json({ success: false, alreadyClaimed: true, message: 'Coupon already claimed for this email' })
      } else {
        // resend same coupon
        const previewUrl = await sendCouponEmail(email, '', existing.couponCode)
        return res.status(200).json({ success: true, message: 'Coupon resent to your email', code: existing.couponCode, previewUrl })
      }
    }

    const coupon = generateCoupon()
    const doc = await Newsletter.create({ email: email.toLowerCase(), couponCode: coupon, claimed: false })
    const previewUrl = await sendCouponEmail(email, '', coupon)
    return res.status(200).json({ success: true, message: 'Coupon sent to your email', code: coupon, previewUrl })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ success: false, message: 'Coupon required' })

    const doc = await Newsletter.findOne({ couponCode: code.toUpperCase() })
    if (!doc) return res.status(404).json({ success: false, message: 'Invalid coupon' })
    if (doc.claimed) return res.status(400).json({ success: false, message: 'Coupon already used' })

    // Return discount details (change percent as needed)
    return res.status(200).json({ success: true, coupon: { code: doc.couponCode, type: 'percent', value: 20 } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const redeemCoupon = async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ success: false, message: 'Coupon required' })

    const doc = await Newsletter.findOne({ couponCode: code.toUpperCase() })
    if (!doc) return res.status(404).json({ success: false, message: 'Invalid coupon' })
    if (doc.claimed) return res.status(400).json({ success: false, message: 'Coupon already used' })

    doc.claimed = true
    await doc.save()

    return res.status(200).json({ success: true, message: 'Coupon redeemed' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// check status by email
export const status = async (req, res) => {
  try {
    const email = (req.query.email || '').toLowerCase()
    if (!email) return res.status(400).json({ success: false, message: 'Email required' })
    const doc = await Newsletter.findOne({ email })
    if (!doc) return res.status(200).json({ success: true, claimed: false })
    return res.status(200).json({ success: true, claimed: !!doc.claimed })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}
