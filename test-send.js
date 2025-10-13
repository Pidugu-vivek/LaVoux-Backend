import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

(async () => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false }
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: 'your_personal_test_email@domain.com', // change to your test recipient
      subject: 'SendGrid test',
      text: 'This is a test'
    });
    console.log('SEND OK:', info);
  } catch (err) {
    console.error('SEND ERROR:', err);
  }
})();