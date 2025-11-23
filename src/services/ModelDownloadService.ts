import { errorLogger } from "../utils/error-logger.ts";
import fs from "fs";
import path from "path";
import https from "https";
import crypto from "crypto";

/**
 * Model metadata for available models
 */
export interface ModelInfo {
  id: string;
  name: string;
  fileName: string;
  url: string;
  size: number;
  sha256?: string;
  description: string;
  recommended: boolean;
}

/**
 * Download progress information
 */
export interface DownloadProgress {
  modelId: string;
  downloadedBytes: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  status: "downloading" | "complete" | "error" | "paused";
  error?: string;
}

/**
 * Active download state for tracking in-progress downloads
 */
interface ActiveDownload {
  modelId: string;
  startTime: number;
  lastProgress: number;
}

/**
 * ModelDownloadService - Handles downloading AI models from HuggingFace
 */
export class ModelDownloadService {
  private static instance: ModelDownloadService | null = null;
  private modelsDir: string;
  private activeDownloads: Map<string, ActiveDownload> = new Map();

  // Available models catalog
  public readonly availableModels: ModelInfo[] = [
    {
      id: "qwen3-8b-q4",
      name: "Qwen 3 8B (Q4_K_M)",
      fileName: "Qwen_Qwen3-8B-Q4_K_M.gguf",
      url: "https://huggingface.co/bartowski/Qwen_Qwen3-8B-GGUF/resolve/main/Qwen_Qwen3-8B-Q4_K_M.gguf",
      size: 5030000000, // ~5.03 GB
      description: "Recommended for AMD Radeon RX 6600 (5.86GB VRAM available)",
      recommended: true,
    },
    {
      id: "qwen3-8b-q5",
      name: "Qwen 3 8B (Q5_K_M)",
      fileName: "Qwen_Qwen3-8B-Q5_K_M.gguf",
      url: "https://huggingface.co/bartowski/Qwen_Qwen3-8B-GGUF/resolve/main/Qwen_Qwen3-8B-Q5_K_M.gguf",
      size: 5850000000, // ~5.85 GB
      description: "Higher quality, uses all available VRAM",
      recommended: false,
    },
    {
      id: "qwen3-8b-iq4",
      name: "Qwen 3 8B (IQ4_XS)",
      fileName: "Qwen_Qwen3-8B-IQ4_XS.gguf",
      url: "https://huggingface.co/bartowski/Qwen_Qwen3-8B-GGUF/resolve/main/Qwen_Qwen3-8B-IQ4_XS.gguf",
      size: 4560000000, // ~4.56 GB
      description: "Smaller, faster, decent quality",
      recommended: false,
    },
  ];

  private constructor() {
    // Models directory: prefer explicit JUSTICE_MODELS_DIR, then derive from
    // JUSTICE_DB_PATH, and finally fall back to .justice-companion/models
    const modelsDir = (() => {
      const explicitDir = process.env.JUSTICE_MODELS_DIR;
      if (explicitDir && explicitDir.trim().length > 0) {
        return explicitDir;
      }

      const dbPath = process.env.JUSTICE_DB_PATH;
      if (dbPath && dbPath.trim().length > 0) {
        return path.join(path.dirname(dbPath), "models");
      }

      return path.join(process.cwd(), ".justice-companion", "models");
    })();

    this.modelsDir = modelsDir;

    // Ensure models directory exists
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }

    errorLogger.logError("ModelDownloadService initialized", {
      type: "info",
      modelsDir: this.modelsDir,
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ModelDownloadService {
    if (!ModelDownloadService.instance) {
      ModelDownloadService.instance = new ModelDownloadService();
    }
    return ModelDownloadService.instance;
  }

  /**
   * Get models directory path
   */
  getModelsDir(): string {
    return this.modelsDir;
  }

  /**
   * Check if a model is already downloaded
   */
  isModelDownloaded(modelId: string): boolean {
    const model = this.availableModels.find((m) => m.id === modelId);
    if (!model) {
      return false;
    }

    const modelPath = path.join(this.modelsDir, model.fileName);
    return fs.existsSync(modelPath);
  }

  /**
   * Get downloaded model path
   */
  getModelPath(modelId: string): string | null {
    const model = this.availableModels.find((m) => m.id === modelId);
    if (!model) {
      return null;
    }

    const modelPath = path.join(this.modelsDir, model.fileName);
    return fs.existsSync(modelPath) ? modelPath : null;
  }

  /**
   * Download a model with progress tracking
   */
  async downloadModel(
    modelId: string,
    onProgress: (progress: DownloadProgress) => void,
  ): Promise<boolean> {
    const model = this.availableModels.find((m) => m.id === modelId);
    if (!model) {
      errorLogger.logError("Model not found in catalog", { modelId });
      return false;
    }

    // Check if already downloaded
    if (this.isModelDownloaded(modelId)) {
      errorLogger.logError("Model already downloaded", {
        type: "info",
        modelId,
      });
      onProgress({
        modelId,
        downloadedBytes: model.size,
        totalBytes: model.size,
        percentage: 100,
        speed: 0,
        status: "complete",
      });
      return true;
    }

    // Check if download already in progress
    if (this.activeDownloads.has(modelId)) {
      errorLogger.logError("Download already in progress", { modelId });
      return false;
    }

    const modelPath = path.join(this.modelsDir, model.fileName);
    const tempPath = `${modelPath}.tmp`;

    try {
      errorLogger.logError("Starting model download", {
        type: "info",
        modelId,
        url: model.url,
        size: model.size,
      });

      // Download file with progress tracking
      await this.downloadFile(model.url, tempPath, model.size, (progress) => {
        onProgress({
          modelId,
          downloadedBytes: progress.downloadedBytes,
          totalBytes: progress.totalBytes,
          percentage: progress.percentage,
          speed: progress.speed,
          status: "downloading",
        });
      });

      // Verify checksum if provided
      if (model.sha256) {
        errorLogger.logError("Verifying checksum", { type: "info", modelId });

        const hash = await this.calculateSHA256(tempPath);
        if (hash !== model.sha256) {
          throw new Error(
            `Checksum verification failed. Expected: ${model.sha256}, Got: ${hash}`,
          );
        }

        errorLogger.logError("Checksum verified successfully", {
          type: "info",
          modelId,
        });
      }

      // Move temp file to final location
      fs.renameSync(tempPath, modelPath);

      errorLogger.logError("Model download complete", {
        type: "info",
        modelId,
        path: modelPath,
      });

      onProgress({
        modelId,
        downloadedBytes: model.size,
        totalBytes: model.size,
        percentage: 100,
        speed: 0,
        status: "complete",
      });

      this.activeDownloads.delete(modelId);
      return true;
    } catch (error) {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      errorLogger.logError(error as Error, {
        context: "ModelDownloadService.downloadModel",
        modelId,
      });

      onProgress({
        modelId,
        downloadedBytes: 0,
        totalBytes: model.size,
        percentage: 0,
        speed: 0,
        status: "error",
        error: errorMessage,
      });

      this.activeDownloads.delete(modelId);
      return false;
    }
  }

  /**
   * Download file with progress tracking
   */
  private downloadFile(
    url: string,
    destPath: string,
    totalSize: number,
    onProgress: (progress: DownloadProgress) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      let downloadedBytes = 0;
      let lastUpdate = Date.now();
      let lastBytes = 0;

      https
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(
              new Error(
                `HTTP ${response.statusCode}: ${response.statusMessage}`,
              ),
            );
            return;
          }

          response.on("data", (chunk) => {
            downloadedBytes += chunk.length;

            // Calculate speed every second
            const now = Date.now();
            const elapsed = (now - lastUpdate) / 1000; // seconds

            if (elapsed >= 1) {
              const speed = (downloadedBytes - lastBytes) / elapsed;
              lastUpdate = now;
              lastBytes = downloadedBytes;

              onProgress({
                modelId: "",
                downloadedBytes,
                totalBytes: totalSize,
                percentage: (downloadedBytes / totalSize) * 100,
                speed,
                status: "downloading",
              });
            }
          });

          response.pipe(file);

          file.on("finish", () => {
            file.close();
            resolve();
          });
        })
        .on("error", (error) => {
          fs.unlinkSync(destPath);
          reject(error);
        });

      file.on("error", (error: Error) => {
        fs.unlinkSync(destPath);
        reject(error);
      });
    });
  }

  /**
   * Calculate SHA256 hash of a file
   */
  private calculateSHA256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);

      stream.on("data", (chunk: Buffer) => {
        hash.update(chunk);
      });

      stream.on("end", () => {
        resolve(hash.digest("hex"));
      });

      stream.on("error", (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Delete a downloaded model
   */
  async deleteModel(modelId: string): Promise<boolean> {
    const model = this.availableModels.find((m) => m.id === modelId);
    if (!model) {
      return false;
    }

    const modelPath = path.join(this.modelsDir, model.fileName);

    if (!fs.existsSync(modelPath)) {
      return false;
    }

    try {
      fs.unlinkSync(modelPath);

      errorLogger.logError("Model deleted", {
        type: "info",
        modelId,
        path: modelPath,
      });

      return true;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: "ModelDownloadService.deleteModel",
        modelId,
      });

      return false;
    }
  }

  /**
   * Get list of all downloaded models
   */
  getDownloadedModels(): ModelInfo[] {
    return this.availableModels.filter((model) =>
      this.isModelDownloaded(model.id),
    );
  }
}

// Singleton instance
export const modelDownloadService = ModelDownloadService.getInstance();
