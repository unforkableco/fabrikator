import { prisma } from './prisma.service';

export class ConversationService {
  /**
   * Create a new conversation for a project
   */
  async createConversation(projectId: string, context: string) {
    const conversation = await prisma.conversation.create({
      data: {
        projectId,
        context
      }
    });

    return conversation;
  }

  /**
   * Get all conversations for a project
   */
  async getProjectConversations(projectId: string) {
    const conversations = await prisma.conversation.findMany({
      where: { projectId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return conversations;
  }

  /**
   * Get a single conversation with messages
   */
  async getConversation(id: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return conversation;
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(conversationId: string, data: {
    role: 'user' | 'assistant';
    content: string;
  }) {
    const message = await prisma.message.create({
      data: {
        conversationId,
        role: data.role,
        content: data.content
      }
    });

    return message;
  }

  /**
   * Get the last message from a conversation
   */
  async getLastMessage(conversationId: string) {
    const message = await prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' }
    });

    return message;
  }

  /**
   * Get all messages for a conversation
   */
  async getConversationMessages(conversationId: string) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }
    });

    return messages;
  }
} 