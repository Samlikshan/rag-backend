import { redisClient } from "../../config/redis";
import { ChatMessage } from "../../types/chat";

const SESSION_TTL = 60 * 60 * 24;

export class SessionRepository {
  async createSession(sessionId: string): Promise<void> {
    await redisClient.set(sessionId, JSON.stringify([]), "EX", SESSION_TTL);
  }

  async saveMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const history = await this.getHistory(sessionId);
    history.push(message);
    await redisClient.set(
      sessionId,
      JSON.stringify(history),
      "EX",
      SESSION_TTL,
    );
  }

  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    const data = await redisClient.get(sessionId);
    return data ? JSON.parse(data) : [];
  }

  async clearSession(sessionId: string): Promise<void> {
    await redisClient.del(sessionId);
  }
}
