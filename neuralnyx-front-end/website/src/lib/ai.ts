import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

// Get the API key from environment variables
const getApiKey = () => {
  return import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
};

export const aiService = {
  copilot: async ({ content }: { content: string }) => {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error("OpenAI API key is missing");
      }

      const openai = createOpenAI({ apiKey });
      const response = await generateText({
        model: openai("gpt-4o-mini"),
        temperature: 1,
        system: `You are an advanced AI writing assistant, similar to VSCode Copilot but for general text. Your task is to predict and generate the next part of the text based on the given context.
  
  Rules:
  - Continue the text naturally up to the next punctuation mark (., ,, ;, :, ?, or !).
  - Maintain style and tone. Don't repeat given text.
  - For unclear context, provide the most likely continuation.
  - Handle code snippets, lists, or structured text if needed.
  - Don't include """ in your response.
  - CRITICAL: Always end with a punctuation mark.
  - CRITICAL: Avoid starting a new block. Do not use block formatting like >, #, 1., 2., -, etc. The suggestion should continue in the same block as the context.
  - If no context is provided or you can't generate a continuation, return empty string without explanation.
      `,
        prompt: content,
      });
      return response.text;
    } catch (error) {
      console.error("Error generating copilot with AI:", error);
      return null;
    }
  },
  suggestTitle: async ({
    title,
    metaDescription,
    content,
  }: {
    title: string;
    metaDescription: string;
    content: string;
  }) => {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error("OpenAI API key is missing");
      }
      const openai = createOpenAI({ apiKey });
      const response = await generateText({
        model: openai("gpt-4o-mini"),
        temperature: 1,
        system: `You are a SEO expert. Your task is to suggest a title for the following content. Ensure the output is not enclosed in quotes.`,
        prompt: `Suggest a title given the following title, meta description and content.
        Existing Title: ${title}
        Meta Description: ${metaDescription}
        Content: ${content}`,
      });
      console.log("AI Response:", response);
      return response.text;
    } catch (error) {
      console.error("Error generating suggested title with AI:", error);
      return null;
    }
  },
  suggestMetaDescription: async ({
    title,
    metaDescription,
    content,
  }: {
    title: string;
    metaDescription: string;
    content: string;
  }) => {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error("OpenAI API key is missing");
      }
      const openai = createOpenAI({ apiKey });
      const response = await generateText({
        model: openai("gpt-4o-mini"),
        temperature: 1,
        system: `You are a SEO expert. Your task is to suggest a meta description given the following title, existing meta description and content. Ensure the output is not enclosed in quotes.`,
        prompt: `Suggest a meta description given the following title, meta description and content.
        Title: ${title}
        Existing Meta Description: ${metaDescription}
        Content: ${content}`,
      });
      return response.text;
    } catch (error) {
      console.error(
        "Error generating suggested meta description with AI:",
        error
      );
      return null;
    }
  },
};
