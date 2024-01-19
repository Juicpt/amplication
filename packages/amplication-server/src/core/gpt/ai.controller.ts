import { AiService } from "../gpt/ai.service";
import {
  AiConversationComplete,
  KAFKA_TOPICS,
} from "@amplication/schema-registry";
import { AmplicationLogger } from "@amplication/util/nestjs/logging";
import { Controller, Inject } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";

@Controller("ai-controller")
export class AiController {
  constructor(
    private readonly aiService: AiService,
    @Inject(AmplicationLogger) private readonly logger: AmplicationLogger
  ) {}

  @EventPattern(KAFKA_TOPICS.AI_CONVERSATION_COMPLETED_TOPIC)
  async onAiCoversationCompleted(
    @Payload() message: AiConversationComplete.Value
  ): Promise<void> {
    this.logger.debug(
      `RECEIVED: onCoversationCompleted ${message.userActionId} `,
      {
        result: message.result,
      }
    );
    try {
      await this.aiService.onConversationCompleted(message);
      this.logger.debug(
        `COMPLETED: onCoversationCompleted ${message.userActionId}`
      );
    } catch (error) {
      this.logger.error(error.message, error, { message });
    }
  }
}
