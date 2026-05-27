import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');

    if (!apiKey) {
      throw new Error(
        'GOOGLE_API_KEY no está definida en las variables de entorno',
      );
    }

    this.modelName =
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash-lite';

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  getGenerativeModel() {
    return this.genAI.getGenerativeModel({ model: this.modelName });
  }
}
