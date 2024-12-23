import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as nodemailer from 'nodemailer';
import { LogEntity } from '../notification/log.entity';
import { TemplateService } from '../template/template.service';
import { CommonService } from '../core/common/common.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Config } from '../config/configuration';
import { ClientService } from '../core/client/client.service';
import { EmailNotificationDto } from './dto/email.dto';
import { EmailChannel } from '../core/enums/email.channel';
import * as https from 'https';
import * as fs from 'fs';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  constructor(
    private templateService: TemplateService,
    private commonService: CommonService,
    private clientService: ClientService,
    private httpService: HttpService,
    private configService: ConfigService<Config, true>,
    @InjectRepository(LogEntity)
    private readonly logRepository: Repository<LogEntity>,
  ) {
    const auth = {
      user: this.configService.get<string>('smtp_username'),
      pass: this.configService.get<string>('smtp_password'),
    };
    console.log(auth);

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: this.configService.get<string>('smtp_username'),
        pass: this.configService.get<string>('smtp_password'),
      },
    });
  }
  async sendEmail(request: EmailNotificationDto) {
    const template = await this.templateService.getTemplateByName(
      request.templateName,
    );
    if (template.channel !== EmailChannel.EMAIL.toString()) {
      throw new HttpException(
        { message: 'Template channel does not match' },
        HttpStatus.BAD_REQUEST,
      );
    }
    let recipientEmail = request.emailId;
    if (
      recipientEmail == undefined ||
      recipientEmail == '' ||
      recipientEmail == null
    ) {
      recipientEmail = await this.commonService.getClientEmail(request.userId);
    }

    const message = {
      from: `<${this.configService.get<string>('smtp_from_email')}>`,
      to: recipientEmail,
      subject: this.commonService.replaceFillers(
        template.title,
        request.fillers,
      ),
      text: this.commonService.replaceFillers(template.body, request.fillers),
    };
    let filePath;
    if (request.attachmentUrl) {
      filePath = await this.downloadFile(
        request.attachmentUrl,
        './downloaded-file.pdf',
      );
      message['attachments'] = [
        {
          filename: 'Purchase_Order.pdf',
          contentType: 'application/pdf',
          path: filePath,
        },
      ];
    }
    const info = await this.transporter.sendMail(message);
    if (filePath) {
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          console.error('File does not exist:', err);
        } else {
          // Delete the local file after the email is sent
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error('Error deleting file:', unlinkErr);
            } else {
              console.log('File deleted successfully.');
            }
          });
        }
      });
    }

    if (!info.response || !info.response.startsWith('250')) {
      throw new HttpException(
        { message: 'Something went wrong while sending email request.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return {
      success: true,
      message: 'Email sent successfully',
    };
  }
  downloadFile = (url, destination) => {
    return new Promise((resolve, reject) => {
      https
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(
              new Error(
                `Failed to download file. Status code: ${response.statusCode}`,
              ),
            );
          }

          const fileStream = fs.createWriteStream(destination);
          response.pipe(fileStream);

          fileStream.on('finish', () => {
            resolve(destination);
          });

          fileStream.on('error', (err) => {
            reject(err);
          });
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  };
}
