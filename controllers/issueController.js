import issueModel from '../models/issueModel.js';
import nodemailer from 'nodemailer';

const getTransporter = async () => {
  let transporter;
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false }
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
  }
  return transporter;
};

// Create a new issue (public or authenticated)
export const createIssue = async (req, res) => {
  try {
    const userId = req.body.userId || undefined;
    const { name, email, subject, category, orderId, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'name, email, subject and message are required' });
    }
    const issue = await issueModel.create({ userId, name, email, subject, category, orderId, message });
    return res.status(201).json({ success: true, issue });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: list issues with optional filters
export const listIssues = async (req, res) => {
  try {
    const { status, email, orderId, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (email) filter.email = email;
    if (orderId) filter.orderId = orderId;
    if (q) filter.$or = [
      { subject: { $regex: q, $options: 'i' } },
      { message: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } }
    ];
    const issues = await issueModel.find(filter).sort({ createdAt: -1 }).limit(200);
    return res.status(200).json({ success: true, issues });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: get single issue
export const getIssue = async (req, res) => {
  try {
    const issue = await issueModel.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    return res.status(200).json({ success: true, issue });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: update status or add admin note
export const updateIssue = async (req, res) => {
  try {
    const { status, note } = req.body;
    const issue = await issueModel.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    if (status) issue.status = status;
    if (note) issue.adminNotes.push({ note });
    await issue.save();

    // If resolved, send an email to the reporter
    if (status === 'resolved') {
      try {
        const transporter = await getTransporter();
        const subject = `Your issue has been resolved: ${issue.subject}`;
        const resolutionText = note ? `\n\nResolution note: ${note}` : '';
        const text = `Hello ${issue.name || ''},\n\nYour issue has been marked as resolved.\n\nSubject: ${issue.subject}\nCategory: ${issue.category || 'General'}${resolutionText}\n\nIf you believe this is not resolved, just reply to this email.`;
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || `no-reply@${process.env.FRONTEND_URL?.replace(/^https?:\/\//,'') || 'local'}`,
          to: issue.email,
          subject,
          text,
          html: `<p>${text.replace(/\n/g,'<br/>')}</p>`
        });
      } catch (mailErr) {
        console.error('Failed to send resolution email', mailErr);
        // Do not fail the request if email sending fails
      }
    }

    return res.status(200).json({ success: true, issue });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
