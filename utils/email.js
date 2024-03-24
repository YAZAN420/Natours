const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ');
    this.url = url;
    this.from = `Yazan Mahfooz <${process.env.EMAIL_FROM}>`;
  }
  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return 1;
    }
    return nodemailer.createTransport({
      host: 'sandbox.smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: '8ec903f252ded9',
        pass: 'a3c5a4eea710e0',
      },
    });
  }
  // Send the actual email
  async send(template, subject) {
    //1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });
    //2) Define email Options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html,
    };
    //3) Create a Transport And Send Email
    await this.newTransport().sendMail(mailOptions);
  }
  async sendWelcome() {
    await this.send('Welcome', 'Welcome To The Natours Family');
  }
  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your Password Reset Token (Valid For Only 10 Minutes)'
    );
  }
};
