export abstract class HeaderMapping {
  static getHeaderMapping(): string {
    throw new Error('Must be implemented by child class');
  }
}
