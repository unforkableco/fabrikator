import axios from 'axios';
import fs from 'fs';
import path from 'path';

export interface ImageGenerationRequest {
  prompt: string;
  size?: '1024x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

export interface ImageGenerationResponse {
  url: string;
  revisedPrompt?: string;
  error?: string;
}

export class ImageGenerationService {
  private static instance: ImageGenerationService;
  private apiKey: string;
  private baseUrl: string;
  private uploadDir: string;

  private constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.baseUrl = 'https://api.openai.com/v1/images/generations';
    this.uploadDir = path.join(process.cwd(), 'uploads', 'design-previews');
    
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required for image generation');
    }
    
    this.ensureUploadDir();
  }

  public static getInstance(): ImageGenerationService {
    if (!ImageGenerationService.instance) {
      ImageGenerationService.instance = new ImageGenerationService();
    }
    return ImageGenerationService.instance;
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Generate an image using DALL-E API
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      console.log('Generating image with prompt:', request.prompt);
      console.log('Using DALL-E 3 API endpoint:', this.baseUrl);

      // Use the provided prompt as-is; style constraints are handled upstream
      let enhancedPrompt = (request.prompt || '').trim();
      
      console.log('Final prompt:', enhancedPrompt);
      console.log('Prompt length:', enhancedPrompt.length);

      const response = await axios.post(
        this.baseUrl,
        {
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: request.size || '1024x1024',
          quality: request.quality || 'standard', // minimalistic
          style: request.style || 'natural', // minimalistic
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const imageUrl = response.data.data[0].url;
      const revisedPrompt = response.data.data[0].revised_prompt;
      console.log('DALL-E revised prompt:', revisedPrompt);

      console.log('Image generated successfully with simplified prompt');
      
      return {
        url: imageUrl,
        revisedPrompt,
      };
    } catch (error: any) {
      console.error('Error generating image with DALL-E 3:', error.response?.status, error.response?.data || error.message);
      
      let errorMessage = 'Failed to generate image';
      
      if (error.response?.status === 429) {
        errorMessage = 'DALL-E 3 rate limit exceeded. Please wait a moment and try again.';
        console.error('DALL-E 3 rate limit details:', {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data
        });
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid image generation request. Please try with a simpler description.';
      } else if (error.response?.status === 401) {
        errorMessage = 'OpenAI API key is invalid or expired.';
      } else if (error.response?.status === 403) {
        errorMessage = 'OpenAI API access denied. Please check your account status.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'OpenAI service is temporarily unavailable. Please try again later.';
      }
      
      return {
        url: '',
        error: errorMessage,
      };
    }
  }

  /**
   * Download and save image to local storage
   */
  async downloadAndSaveImage(imageUrl: string, filename: string): Promise<string> {
    try {
      console.log('Downloading image from:', imageUrl);
      
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });

      const filePath = path.join(this.uploadDir, filename);
      fs.writeFileSync(filePath, response.data);

      console.log('Image saved to:', filePath);
      
      // Return relative path for database storage
      return path.relative(process.cwd(), filePath);
    } catch (error: any) {
      console.error('Error downloading image:', error.message);
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  /**
   * Generate multiple design previews
   */
  async generateDesignPreviews(prompts: string[]): Promise<ImageGenerationResponse[]> {
    const results: ImageGenerationResponse[] = [];
    
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      console.log(`Generating design preview ${i + 1}/${prompts.length}`);
      
      const result = await this.generateImage({
        prompt,
        size: '1024x1024',
        quality: 'standard',
        style: 'natural',
      });
      
      results.push(result);
      
      // Add delay between requests to avoid rate limiting
      if (i < prompts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    
    return results;
  }

  /**
   * Generate multiple design preview images with variations
   */
  async generateDesignVariations(prompt: string, count: number = 3): Promise<ImageGenerationResponse[]> {
    console.log(`Generating ${count} image variations for prompt:`, prompt);
    
    const variations = [];
    
    for (let i = 0; i < count; i++) {
      try {
        // Keep parameters identical to aim for minimalistic consistency
        const variationParams: ImageGenerationRequest = {
          prompt,
          size: '1024x1024',
          quality: 'standard',
          style: 'natural',
        };
        
        console.log(`Generating variation ${i + 1}/${count}...`);
        const result = await this.generateImage(variationParams);
        variations.push(result);
        
        // Small delay between requests to avoid rate limiting
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } catch (error) {
        console.error(`Failed to generate variation ${i + 1}:`, error);
        variations.push({ url: '', error: `Failed to generate variation ${i + 1}` });
      }
    }
    
    console.log(`Generated ${variations.length} variations successfully`);
    return variations;
  }

  /**
   * Clean up old images
   */
  async cleanupOldImages(maxAgeHours: number = 24): Promise<void> {
    try {
      const files = fs.readdirSync(this.uploadDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log('Cleaned up old image:', file);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old images:', error);
    }
  }
}
