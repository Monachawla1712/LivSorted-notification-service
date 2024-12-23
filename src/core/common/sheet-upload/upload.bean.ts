import { ErrorBean } from '../dto/error-bean';
import { HeaderMapping } from './header.mapping';

export class UploadBean extends HeaderMapping {
  userId: string;
  templateName: string;
  campaignId: string;
  fillers: {};
  validDays: number;
  errors: ErrorBean[] = [];
  public static getHeaderMapping() {
    return 'userId:User Id,templateName:Template Name,fillers:Fillers,validDays:Valid days';
  }
}
