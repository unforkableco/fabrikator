import { prisma } from '../prisma/prisma.service';

export const ensureProjectAccess = async (accountId: string, projectId: string) => {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: accountId,
    },
  });
};

export const ensureComponentAccess = async (accountId: string, componentId: string) => {
  return prisma.component.findFirst({
    where: {
      id: componentId,
      project: {
        ownerId: accountId,
      },
    },
  });
};

export const ensureWiringSchemaAccess = async (accountId: string, schemaId: string) => {
  return prisma.wiringSchema.findFirst({
    where: {
      id: schemaId,
      project: {
        ownerId: accountId,
      },
    },
  });
};
