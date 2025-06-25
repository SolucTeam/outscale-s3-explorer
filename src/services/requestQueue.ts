
interface QueuedRequest {
  id: string;
  request: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: number;
  retryCount: number;
  maxRetries: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private requestCount = 0;
  private lastRequestTime = 0;
  private minInterval = 100; // Minimum 100ms between requests
  private rateLimitDelay = 1000; // Initial rate limit delay

  async enqueue<T>(
    request: () => Promise<T>,
    options: {
      priority?: number;
      maxRetries?: number;
    } = {}
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: Math.random().toString(36).substr(2, 9),
        request,
        resolve,
        reject,
        priority: options.priority || 0,
        retryCount: 0,
        maxRetries: options.maxRetries || 3
      };

      // Insert with priority (higher priority first)
      const insertIndex = this.queue.findIndex(item => item.priority < queuedRequest.priority);
      if (insertIndex === -1) {
        this.queue.push(queuedRequest);
      } else {
        this.queue.splice(insertIndex, 0, queuedRequest);
      }

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const queuedRequest = this.queue.shift()!;
      
      try {
        // Ensure minimum interval between requests
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minInterval) {
          await this.sleep(this.minInterval - timeSinceLastRequest);
        }

        this.lastRequestTime = Date.now();
        const result = await queuedRequest.request();
        queuedRequest.resolve(result);
        
        // Reset rate limit delay on success
        this.rateLimitDelay = Math.max(1000, this.rateLimitDelay * 0.8);
        
      } catch (error: any) {
        if (this.isRateLimitError(error) && queuedRequest.retryCount < queuedRequest.maxRetries) {
          // Exponential backoff for rate limit errors
          const backoffDelay = this.calculateBackoffDelay(queuedRequest.retryCount);
          console.log(`Rate limit hit, retrying in ${backoffDelay}ms`);
          
          await this.sleep(backoffDelay);
          queuedRequest.retryCount++;
          
          // Re-queue with higher priority for retry
          const insertIndex = this.queue.findIndex(item => item.priority < queuedRequest.priority + 1);
          if (insertIndex === -1) {
            this.queue.push({ ...queuedRequest, priority: queuedRequest.priority + 1 });
          } else {
            this.queue.splice(insertIndex, 0, { ...queuedRequest, priority: queuedRequest.priority + 1 });
          }
        } else {
          queuedRequest.reject(error);
        }
      }
    }

    this.processing = false;
  }

  private isRateLimitError(error: any): boolean {
    return (
      error?.status === 429 ||
      error?.response?.status === 429 ||
      error?.message?.toLowerCase().includes('rate limit') ||
      error?.message?.toLowerCase().includes('too many requests')
    );
  }

  private calculateBackoffDelay(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    const baseDelay = this.rateLimitDelay;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    
    this.rateLimitDelay = Math.min(exponentialDelay, 30000); // Cap at 30 seconds
    return Math.min(exponentialDelay + jitter, 30000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.processing = false;
  }
}

export const requestQueue = new RequestQueue();
