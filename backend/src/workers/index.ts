import { Worker, Queue, QueueEvents, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { DesignPreviewService } from '../modules/design-preview/design-preview.service';
import { DesignPreviewCadService } from '../modules/design-preview/design-preview_cad.service';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  // Required by BullMQ for blocking commands
  maxRetriesPerRequest: null,
});

export const designQueueName = 'designPreviewsQueue';
export const cadQueueName = 'cadGenerationQueue';

export const designQueue = new Queue(designQueueName, { connection });
export const cadQueue = new Queue(cadQueueName, { connection });

// Workers
const designService = new DesignPreviewService();
new Worker(
  designQueueName,
  async job => {
    const { projectId } = job.data as { projectId: string };
    await designService.runGenerateDesignPreviews(projectId);
  },
  { connection, concurrency: Number(process.env.DESIGN_QUEUE_CONCURRENCY || 1) }
);

const cadService = new DesignPreviewCadService();
new Worker(
  cadQueueName,
  async job => {
    const { projectId } = job.data as { projectId: string };
    await cadService.runGeneration(projectId);
  },
  { connection, concurrency: Number(process.env.CAD_QUEUE_CONCURRENCY || 1) }
);

// Queue events (optional logging)
new QueueEvents(designQueueName, { connection });
new QueueEvents(cadQueueName, { connection });

console.log('Workers started: design and cad with Redis');


