import { prisma } from '../../prisma/prisma.service';
import { Component3D, Component3DType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export interface CreateComponent3DRequest {
  name: string;
  type: Component3DType;
  category: string;
  metadata?: any;
  isGenerated?: boolean;
}

export interface UploadSTLRequest {
  componentId: string;
  fileName: string;
  fileBuffer: Buffer;
}

export class Design3DService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', '3d');
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async createComponent(data: CreateComponent3DRequest): Promise<Component3D> {
    return prisma.component3D.create({
      data: {
        name: data.name,
        type: data.type,
        category: data.category,
        metadata: data.metadata || {},
        isGenerated: data.isGenerated || false
      }
    });
  }

  async getComponent(componentId: string): Promise<Component3D | null> {
    return prisma.component3D.findUnique({
      where: { id: componentId }
    });
  }

  async getComponents(filters?: {
    type?: Component3DType;
    category?: string;
    isGenerated?: boolean;
  }): Promise<Component3D[]> {
    const where: any = {};
    
    if (filters?.type) where.type = filters.type;
    if (filters?.category) where.category = filters.category;
    if (filters?.isGenerated !== undefined) where.isGenerated = filters.isGenerated;

    return prisma.component3D.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateComponent(
    componentId: string, 
    data: Partial<CreateComponent3DRequest>
  ): Promise<Component3D> {
    const updateData: any = { updatedAt: new Date() };
    
    if (data.name) updateData.name = data.name;
    if (data.type) updateData.type = data.type;
    if (data.category) updateData.category = data.category;
    if (data.metadata) updateData.metadata = data.metadata;
    if (data.isGenerated !== undefined) updateData.isGenerated = data.isGenerated;

    return prisma.component3D.update({
      where: { id: componentId },
      data: updateData
    });
  }

  async deleteComponent(componentId: string): Promise<boolean> {
    try {
      const component = await this.getComponent(componentId);
      
      // Delete associated STL file if exists
      if (component?.filePath) {
        const fullPath = path.join(process.cwd(), component.filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      await prisma.component3D.delete({
        where: { id: componentId }
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting component:', error);
      return false;
    }
  }

  async uploadSTL(data: UploadSTLRequest): Promise<Component3D> {
    const component = await this.getComponent(data.componentId);
    if (!component) {
      throw new Error('Component not found');
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (data.fileBuffer.length > maxSize) {
      throw new Error('File size exceeds 50MB limit');
    }

    // Validate STL file format (basic check)
    if (!this.isValidSTL(data.fileBuffer)) {
      throw new Error('Invalid STL file format');
    }

    // Generate unique filename
    const fileExtension = path.extname(data.fileName) || '.stl';
    const uniqueFileName = `${component.id}_${Date.now()}${fileExtension}`;
    const relativePath = path.join('uploads', '3d', uniqueFileName);
    const fullPath = path.join(process.cwd(), relativePath);

    // Save file
    fs.writeFileSync(fullPath, data.fileBuffer);

    // Update component with file information
    const updatedComponent = await prisma.component3D.update({
      where: { id: data.componentId },
      data: {
        filePath: relativePath,
        fileSize: data.fileBuffer.length,
        updatedAt: new Date()
      }
    });

    return updatedComponent;
  }

  private isValidSTL(buffer: Buffer): boolean {
    // Basic STL validation
    if (buffer.length < 80) return false;

    // Check for ASCII STL
    const header = buffer.toString('ascii', 0, 5);
    if (header.toLowerCase() === 'solid') {
      return true; // ASCII STL
    }

    // Check for Binary STL
    if (buffer.length >= 84) {
      const numTriangles = buffer.readUInt32LE(80);
      const expectedSize = 84 + (numTriangles * 50);
      return buffer.length === expectedSize;
    }

    return false;
  }

  async getSTLFile(componentId: string): Promise<{ filePath: string; fileName: string } | null> {
    const component = await this.getComponent(componentId);
    if (!component?.filePath) {
      return null;
    }

    const fullPath = path.join(process.cwd(), component.filePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    return {
      filePath: fullPath,
      fileName: `${component.name}.stl`
    };
  }

  async searchComponents(query: string): Promise<Component3D[]> {
    return prisma.component3D.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getComponentStats(): Promise<{
    total: number;
    byType: Record<Component3DType, number>;
    byCategory: Record<string, number>;
  }> {
    const components = await prisma.component3D.findMany();
    
    const stats = {
      total: components.length,
      byType: {
        DESIGN: 0,
        FUNCTIONAL: 0,
        ELECTRONIC: 0,
        MECHANICAL: 0
      } as Record<Component3DType, number>,
      byCategory: {} as Record<string, number>
    };

    components.forEach(comp => {
      stats.byType[comp.type]++;
      stats.byCategory[comp.category] = (stats.byCategory[comp.category] || 0) + 1;
    });

    return stats;
  }
}