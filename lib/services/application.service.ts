import { ApplicationStatus, ApplicationMethod } from "@prisma/client";
import { ApplicationModel } from "../models/application.model";

export interface CreateApplicationInput {
  company: string;
  role: string;
  status: ApplicationStatus;
  method: ApplicationMethod;
  appliedDate: string;
  notes?: string;
}

export class ApplicationService {
  static async createApplication(
    input: CreateApplicationInput,
    userId: string,
  ) {
    const { company, role, status, method, appliedDate, notes } = input;

    const application = await ApplicationModel.create(
      company,
      role,
      status,
      method,
      new Date(appliedDate),
      notes ?? null,
      userId,
    );

    return application;
  }

  static async getUserApplications(userId: string) {
    const applications = await ApplicationModel.findByUserId(userId);

    return applications;
  }

  static async updateApplication(
    applicationId: string,
    userId: string,
    updates: Partial<CreateApplicationInput>,
  ) {
    const modelUpdates: any = { ...updates };
    if (updates.appliedDate) {
      modelUpdates.appliedDate = new Date(updates.appliedDate);
    }

    const updated = await ApplicationModel.update(
      applicationId,
      userId,
      modelUpdates,
    );

    if (!updated) {
      throw new Error("APPLICATION_NOT_FOUND");
    }

    return updated;
  }

  static async deleteApplication(applicationId: string, userId: string) {
    const deleted = await ApplicationModel.delete(applicationId, userId);

    if (!deleted) {
      throw new Error("APPLICATION_NOT_FOUND");
    }

    return { success: true };
  }
}
