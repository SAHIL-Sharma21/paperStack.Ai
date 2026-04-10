import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type {
  LlmToolCallingPort,
  LlmToolLoopResult,
} from './llm-tool-calling.port';
import { GeminiChatLlmService } from './gemini-chat-llm.service';
import { GroqChatLlmService } from './groq-chat-llm.service';
import { GroqToolAgentService } from './groq-tool-agent.service';
import { LLM_CHAT_PORT, LLM_TOOL_CALLING_PORT } from './llm.tokens';

const toolCallingUnsupported: LlmToolCallingPort = {
  runToolLoop(): Promise<LlmToolLoopResult> {
    return Promise.reject(
      new Error(
        'Tool calling is only implemented for LLM_PROVIDER=groq. Set LLM_PROVIDER=groq or add a LlmToolCallingPort adapter for your provider.',
      ),
    );
  },
};

@Module({
  imports: [ConfigModule],
  providers: [
    GroqChatLlmService,
    GeminiChatLlmService,
    GroqToolAgentService,
    {
      provide: LLM_CHAT_PORT,
      useFactory: (
        config: ConfigService,
        groq: GroqChatLlmService,
        gemini: GeminiChatLlmService,
      ) => {
        const id = config.get<string>('LLM_PROVIDER', 'groq').toLowerCase();
        if (id === 'gemini') return gemini;
        if (id === 'groq') return groq;
        throw new Error(
          `LLM_PROVIDER="${id}" is not supported. Use "groq" or "gemini". To add Anthropic, implement LlmChatPort and register it here.`,
        );
      },
      inject: [ConfigService, GroqChatLlmService, GeminiChatLlmService],
    },
    {
      provide: LLM_TOOL_CALLING_PORT,
      useFactory: (
        config: ConfigService,
        groqTools: GroqToolAgentService,
      ): LlmToolCallingPort => {
        const id = config.get<string>('LLM_PROVIDER', 'groq').toLowerCase();
        if (id === 'groq') return groqTools;
        return toolCallingUnsupported;
      },
      inject: [ConfigService, GroqToolAgentService],
    },
  ],
  exports: [LLM_CHAT_PORT, LLM_TOOL_CALLING_PORT, GroqToolAgentService],
})
export class LlmModule {}
