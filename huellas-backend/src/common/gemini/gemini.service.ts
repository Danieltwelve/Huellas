import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeminiService {
  private apiKey: string;
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

    this.apiKey = apiKey;
  }

  async getGenerativeModel(): Promise<{
    generateContent(prompt: string): Promise<{
      response:
        | { text(): Promise<string> }
        | Promise<{ text(): Promise<string> }>;
    }>;
  }> {
    try {
      // Import dinámico para que la dependencia sea opcional en tiempo de compilación
      type GoogleMod = {
        GoogleGenerativeAI: new (apiKey?: string | { apiKey?: string }) => {
          getGenerativeModel(opts: { model: string }): {
            generateContent(prompt: string): Promise<{
              response:
                | { text(): Promise<string> }
                | Promise<{ text(): Promise<string> }>;
            }>;
          };
        };
      };

      const mod = (await import('@google/generative-ai')) as GoogleMod;
      const GoogleGenerativeAI = mod.GoogleGenerativeAI;
      const client = new GoogleGenerativeAI(this.apiKey);
      return client.getGenerativeModel({ model: this.modelName });
    } catch {
      throw new Error(
        'No se pudo inicializar el cliente de Google Generative AI. Instala @google/generative-ai y revisa GOOGLE_API_KEY',
      );
    }
  }
}
