import { prisma } from '../../prisma/prisma.service';
import { AIService } from '../../services/ai.service';
import { ImageGenerationService } from '../../services/image-generation.service';
import { MaterialService } from '../material/material.service';

export interface DesignPreviewData {
  projectId: string;
}

export interface DesignOptionData {
  concept: string;
  description: string;
  imagePrompt: string;
  keyFeatures: string[];
  complexity: 'low' | 'medium' | 'high';
}

export interface GeneratedDesignsResponse {
  designs: DesignOptionData[];
}

export class DesignPreviewService {
  private aiService: AIService;
  private imageService: ImageGenerationService;
  private materialService: MaterialService;

  constructor() {
    this.aiService = AIService.getInstance();
    this.imageService = ImageGenerationService.getInstance();
    this.materialService = new MaterialService();
  }

  /**
   * Get or create design preview for a project
   */
  async getOrCreateDesignPreview(projectId: string) {
    try {
      let designPreview = await prisma.designPreview.findFirst({
        where: { projectId },
        include: {
          designs: true,
          selectedDesign: true,
        },
      });

      if (!designPreview) {
        designPreview = await prisma.designPreview.create({
          data: {
            projectId,
          },
          include: {
            designs: true,
            selectedDesign: true,
          },
        });
      }

      return designPreview;
    } catch (error) {
      console.error('Error getting/creating design preview:', error);
      throw error;
    }
  }

  /**
   * Generate new design previews using AI
   */
  async generateDesignPreviews(projectId: string) {
    try {
      console.log('Generating design previews for project:', projectId);

      // Get project and materials information
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          components: {
            include: {
              currentVersion: true,
            },
          },
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Get materials for context
      const materials = await this.materialService.listMaterials(projectId);

      // Prepare context for AI
      const materialsContext = materials.map((m: any) => ({
        name: m.currentVersion?.specs?.name || 'Unknown',
        type: m.currentVersion?.specs?.type || 'Unknown',
        specs: m.currentVersion?.specs || {},
      }));

      // Generate design concepts using AI
      console.log('Calling AI service to generate design concepts...');
      console.log('Project description:', project.description);
      console.log('Materials context:', materialsContext);
      
      let aiResponse;
      try {
        aiResponse = await this.aiService.generateDesignConcepts(
          project.description || '',
          materialsContext
        );

        console.log('AI response received:', JSON.stringify(aiResponse, null, 2));

        if (!aiResponse.design) {
          throw new Error('Failed to generate design concept - no design returned from AI');
        }

        console.log('Generated design concept successfully');
      } catch (error: any) {
        console.error('AI service error:', error);
        
        // Provide user-friendly error messages
        if (error.message.includes('rate limit')) {
          throw new Error('OpenAI is currently busy. Please wait a moment and try again.');
        } else if (error.message.includes('API key')) {
          throw new Error('OpenAI API configuration issue. Please check your API key.');
        } else if (error.message.includes('service unavailable')) {
          throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
        } else {
          throw new Error(`AI service error: ${error.message}`);
        }
      }

      // Step 2: Generate detailed image description for the single design concept
      console.log('Generating detailed image description...');
      let detailedImagePrompt;
      
      try {
        detailedImagePrompt = await this.aiService.generateImageDescription(
          project.description || '',
          materialsContext,
          aiResponse.design.description
        );
        console.log('Generated detailed prompt:', detailedImagePrompt);
      } catch (error) {
        console.error('Failed to generate detailed prompt:', error);
        // Fallback to original prompt
        detailedImagePrompt = aiResponse.design.imagePrompt;
      }
      
      // Step 3: Generate 3 image variations using the same prompt but different parameters
      console.log('Generating 3 image variations...');
      const imageResults = await this.imageService.generateDesignVariations(detailedImagePrompt, 3);

      // Create or update design preview
      let designPreview = await this.getOrCreateDesignPreview(projectId);

      // Delete existing designs if regenerating
      if (designPreview.designs.length > 0) {
        await prisma.designOption.deleteMany({
          where: { designPreviewId: designPreview.id },
        });
      }

      // Create 3 design options from the same design concept but different images
      const designOptions = [];
      for (let i = 0; i < imageResults.length; i++) {
        const imageResult = imageResults[i];
        const design = aiResponse.design; // Use the same design for all variations

        if (imageResult.url && !imageResult.error) {
          // Download and save image
          const filename = `design_${projectId}_${Date.now()}_${i}.png`;
          const imagePath = await this.imageService.downloadAndSaveImage(imageResult.url, filename);

          const designOption = await prisma.designOption.create({
            data: {
              designPreviewId: designPreview.id,
              concept: design.concept,
              description: design.description,
              imagePrompt: imageResult.revisedPrompt || detailedImagePrompt,
              imageUrl: imagePath,
              keyFeatures: design.keyFeatures || [],
              complexity: design.complexity || 'medium',
              printability: 'moderate',
            },
          });

          designOptions.push(designOption);
        }
      }

      // Update design preview with new designs
      designPreview = await prisma.designPreview.update({
        where: { id: designPreview.id },
        data: {
          selectedDesignId: null, // Reset selection when regenerating
        },
        include: {
          designs: true,
          selectedDesign: true,
        },
      });

      console.log(`Generated ${designOptions.length} design previews`);
      return designPreview;
    } catch (error) {
      console.error('Error generating design previews:', error);
      throw error;
    }
  }

  /**
   * Select a design option
   */
  async selectDesignOption(designPreviewId: string, designOptionId: string) {
    try {
      // Find the selected option to determine its generation (parent)
      const selectedOption = await prisma.designOption.findUnique({ where: { id: designOptionId } });
      if (!selectedOption) {
        throw new Error('Selected design option not found');
      }

      // Set the selected design
      const updated = await prisma.designPreview.update({
        where: { id: designPreviewId },
        data: { selectedDesignId: designOptionId },
        include: { designs: true, selectedDesign: true },
      });

      // Delete only sibling proposals from the same generation, keep previous picks (history)
      const parentId = (selectedOption as any).parentDesignOptionId || null;
      await prisma.designOption.deleteMany({
        where: {
          designPreviewId: designPreviewId,
          id: { not: designOptionId },
          // Same parent (including null for the first generation)
          parentDesignOptionId: parentId,
        },
      });

      // Update project thumbnail with the selected image
      if (updated.selectedDesign) {
        await prisma.project.update({
          where: { id: updated.projectId },
          data: { designThumbnailUrl: updated.selectedDesign.imageUrl },
        });
      }

      // Return fresh state
      return await prisma.designPreview.findUnique({
        where: { id: designPreviewId },
        include: { designs: true, selectedDesign: true },
      });
    } catch (error) {
      console.error('Error selecting design option:', error);
      throw error;
    }
  }

  /**
   * Get design preview by project ID
   */
  async getDesignPreviewByProjectId(projectId: string) {
    try {
      return await prisma.designPreview.findFirst({
        where: { projectId },
        include: {
          designs: true,
          selectedDesign: true,
        },
      });
    } catch (error) {
      console.error('Error getting design preview:', error);
      throw error;
    }
  }

  /**
   * Delete design preview and associated images
   */
  async deleteDesignPreview(designPreviewId: string) {
    try {
      // Get design options to delete associated images
      const designOptions = await prisma.designOption.findMany({
        where: { designPreviewId },
      });

      // Delete image files
      for (const option of designOptions) {
        if (option.imageUrl) {
          try {
            const fullPath = require('path').join(process.cwd(), option.imageUrl);
            if (require('fs').existsSync(fullPath)) {
              require('fs').unlinkSync(fullPath);
            }
          } catch (fileError) {
            console.warn('Could not delete image file:', option.imageUrl);
          }
        }
      }

      // Delete from database
      await prisma.designPreview.delete({
        where: { id: designPreviewId },
      });

      console.log('Design preview deleted successfully');
    } catch (error) {
      console.error('Error deleting design preview:', error);
      throw error;
    }
  }
}
