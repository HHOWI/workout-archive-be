import nodemailer from "nodemailer";
import { ErrorDecorator } from "../decorators/ErrorDecorator";

export class EmailService {
  /**
   * 이메일 인증 관련 메서드
   */
  // 이메일 인증 메일 발송
  @ErrorDecorator("EmailService.sendVerificationEmail")
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const transporter = this.createMailTransporter();
    const verificationUrl = this.generateVerificationUrl(token);
    const mailOptions = this.createMailOptions(to, verificationUrl);

    await transporter.sendMail(mailOptions);
  }

  // 메일 전송자 생성
  private createMailTransporter(): nodemailer.Transporter {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // 인증 URL 생성
  private generateVerificationUrl(token: string): string {
    return `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  }

  // 메일 옵션 생성
  private createMailOptions(
    to: string,
    verificationUrl: string
  ): nodemailer.SendMailOptions {
    return {
      from: "Workout Archive",
      to,
      subject: "이메일 인증",
      html: `<p>이메일 인증을 완료하려면 <a href="${verificationUrl}">여기</a>를 클릭하세요.</p>`,
    };
  }
}
