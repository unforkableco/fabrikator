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
const designWorker = new Worker(
  designQueueName,
  async job => {
    const { projectId } = job.data as { projectId: string };
    console.log(`[designWorker] start job ${job.id} projectId=${projectId}`);
    await designService.runGenerateDesignPreviews(projectId);
    console.log(`[designWorker] done job ${job.id} projectId=${projectId}`);
  },
  { connection, concurrency: Number(process.env.DESIGN_QUEUE_CONCURRENCY || 1) }
);

const cadService = new DesignPreviewCadService();
const cadWorker = new Worker(
  cadQueueName,
  async job => {
    const { projectId } = job.data as { projectId: string };
    console.log(`[cadWorker] start job ${job.id} projectId=${projectId}`);
    await cadService.runGeneration(projectId);
    console.log(`[cadWorker] done job ${job.id} projectId=${projectId}`);
  },
  { connection, concurrency: Number(process.env.CAD_QUEUE_CONCURRENCY || 1) }
);

// Queue events (optional logging)
const designEvents = new QueueEvents(designQueueName, { connection });
const cadEvents = new QueueEvents(cadQueueName, { connection });

designWorker.on('completed', (job) => {
  console.log(`[designWorker] completed job ${job.id}`);
});
designWorker.on('failed', (job, err) => {
  console.error(`[designWorker] failed job ${job?.id}:`, err?.stack || err);
});
designWorker.on('error', (err) => {
  console.error('[designWorker] worker error:', err?.stack || err);
});

cadWorker.on('completed', (job) => {
  console.log(`[cadWorker] completed job ${job.id}`);
});
cadWorker.on('failed', (job, err) => {
  console.error(`[cadWorker] failed job ${job?.id}:`, err?.stack || err);
});
cadWorker.on('error', (err) => {
  console.error('[cadWorker] worker error:', err?.stack || err);
});

designEvents.on('completed', ({ jobId }) => console.log(`[designEvents] completed ${jobId}`));
designEvents.on('failed', ({ jobId, failedReason }) => console.error(`[designEvents] failed ${jobId}: ${failedReason}`));
cadEvents.on('completed', ({ jobId }) => console.log(`[cadEvents] completed ${jobId}`));
cadEvents.on('failed', ({ jobId, failedReason }) => console.error(`[cadEvents] failed ${jobId}: ${failedReason}`));

console.log('Workers started: design and cad with Redis');


