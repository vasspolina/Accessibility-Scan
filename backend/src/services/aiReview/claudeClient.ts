import Anthropic from "@anthropic-ai/sdk";
import { env, hasAnthropicKey } from "../../config/env.js";

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic | null {
  if (!hasAnthropicKey) return null;
  if (!client) {
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const CLAUDE_MODEL = "claude-sonnet-5";
