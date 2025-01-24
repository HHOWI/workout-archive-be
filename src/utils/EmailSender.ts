import nodemailer from "nodemailer";

export const sendEmail = async (to: string, subject: string, text: string) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail", // Gmail 사용 시
    auth: {
      user: process.env.EMAIL_USER, // 환경변수로 설정
      pass: process.env.EMAIL_PASS, // 환경변수로 설정
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
};
