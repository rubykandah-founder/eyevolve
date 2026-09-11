import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

type JsonResponseOptions = {
  promptFile: string;
  schemaName: string;
  schema: Record<string, unknown>;
  input: unknown;
  timeout?: number;
};

export const hasOpenAiKey = () => Boolean(process.env.OPENAI_API_KEY);

export const readPrompt = async (promptFile: string) =>
  readFile(path.join(process.cwd(), "src", "prompts", promptFile), "utf8");

export async function requestStructuredJson({
  promptFile,
  schemaName,
  schema,
  input,
  timeout = 9000,
}: JsonResponseOptions) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const systemPrompt = await readPrompt(promptFile);
    const response = await client.responses.create(
      {
        model: process.env.OPENAI_MODEL ?? "gpt-5.6-terra",
        input: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema,
          },
        },
      },
      { timeout },
    );

    return JSON.parse(response.output_text) as unknown;
  } catch {
    return null;
  }
}
