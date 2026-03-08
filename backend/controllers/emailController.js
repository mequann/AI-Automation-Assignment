const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.sendEmail = async (req, res) => {
  const { to, subject, text } = req.body;
  try {
    await sgMail.send({
      to,
      from:
        process.env.SENDGRID_VERIFIED_SENDER ||
        "mecham381@gmail.com",
      subject,
      text,
    });
    res.json({ message: "Email sent" });
  } catch (err) {
    console.error("SendGrid error:", err.message);
    res
      .status(500)
      .json({ error: "Failed to send email", details: err.message });
  }
};
