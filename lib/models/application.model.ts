import { prisma } from "../db";
import { ApplicationStatus, ApplicationMethod } from "@prisma/client";

export interface Application {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  method: ApplicationMethod;
  appliedDate: Date;
  notes?: string | null;
  userId: string;
}

export class ApplicationModel {

  // Create new application
  static async create(
    company: string,
    role: string,
    status: ApplicationStatus,
    method: ApplicationMethod,
    appliedDate: Date,
    notes: string | null,
    userId: string
  ): Promise<Application> {
    return prisma.application.create({
      data: {
        company,
        role,
        status,
        method,
        appliedDate,
        notes,
        userId,
      },
    });
  }


  // Get all applications for a user
  static async findByUserId(userId: string): Promise<Application[]> {
    return prisma.application.findMany({
      where: { userId },
      orderBy: { appliedDate: 'desc' },
    });
  }


  // Find single application by ID
  static async findById(id: string): Promise<Application | null> {
    return prisma.application.findUnique({
      where: { id },
    });
  }


  // Update an application
  static async update(
    id: string,
    userId: string,
    data: Partial<Application>
  ): Promise<Application | null> {
    // Note: userId check is added to ensure security
    return prisma.application.update({
      where: { 
        id,
        userId: userId // Only update if it belongs to the user
      },
      data: {
        company: data.company,
        role: data.role,
        status: data.status,
        method: data.method,
        appliedDate: data.appliedDate,
        notes: data.notes,
      },
    });
  }


  // Delete application
  static async delete(id: string, userId: string): Promise<boolean> {
    try {
      await prisma.application.delete({
        where: { 
          id,
          userId: userId // Only delete if it belongs to the user
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

}