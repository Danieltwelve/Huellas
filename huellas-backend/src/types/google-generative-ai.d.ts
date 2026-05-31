declare module '@google/generative-ai' {
  export class GoogleGenerativeAI {
    constructor(apiKey?: string | { apiKey?: string });
    getGenerativeModel(opts: { model: string }): {
      generateContent(prompt: string): Promise<{
        response:
          | {
              text(): Promise<string>;
            }
          | Promise<{ text(): Promise<string> }>;
      }>;
    };
  }
}
