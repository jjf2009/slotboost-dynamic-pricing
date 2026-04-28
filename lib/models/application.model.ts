import { db } from "../db";

export interface Application {
  id: string;
  company: string;
  role: string;
  status: "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED";
  method: "COLD EMAIL" | "OFFICAL MEANS";
  appliedDate: Date;
  notes?: string;
  userId: string;
}

export class ApplicationModel {

  // Create new application
  static async create(
    company: string,
    role: string,
    status: Application["status"],
    method: Application["method"],
    appliedDate: Date,
    notes: string | null,
    userId: string
  ): Promise<Application> {

    const query = `
      INSERT INTO applications
      (company, role, status, method, applied_date, notes, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, company, role, status, method, applied_date AS "appliedDate", notes, user_id AS "userId";
    `;

    const values = [company, role, status, method, appliedDate, notes, userId];

    const result = await db.query(query, values);

    return result.rows[0];
  }


  // Get all applications for a user
  static async findByUserId(userId: string): Promise<Application[]> {

    const query = `
      SELECT id, company, role, status, method,
      applied_date AS "appliedDate",
      notes,
      user_id AS "userId"
      FROM applications
      WHERE user_id = $1
      ORDER BY applied_date DESC;
    `;

    const result = await db.query(query, [userId]);

    return result.rows;
  }


  // Find single application by ID
  static async findById(id: string): Promise<Application | null> {

    const query = `
      SELECT id, company, role, status, method,
      applied_date AS "appliedDate",
      notes,
      user_id AS "userId"
      FROM applications
      WHERE id = $1
      LIMIT 1;
    `;

    const result = await db.query(query, [id]);

    return result.rows[0] || null;
  }


  // Update an application
  static async update(
    id: string,
    userId: string,
    data: Partial<Application>
  ): Promise<Application | null> {

    const query = `
      UPDATE applications
      SET company = COALESCE($1, company),
          role = COALESCE($2, role),
          status = COALESCE($3, status),
          method = COALESCE($4, method),
          applied_date = COALESCE($5, applied_date),
          notes = COALESCE($6, notes)
      WHERE id = $7 AND user_id = $8
      RETURNING id, company, role, status, method,
      applied_date AS "appliedDate",
      notes,
      user_id AS "userId";
    `;

    const values = [
      data.company ?? null,
      data.role ?? null,
      data.status ?? null,
      data.method ?? null,
      data.appliedDate ?? null,
      data.notes ?? null,
      id,
      userId
    ];

    const result = await db.query(query, values);

    return result.rows[0] || null;
  }


  // Delete application
  static async delete(id: string, userId: string): Promise<boolean> {

    const query = `
      DELETE FROM applications
      WHERE id = $1 AND user_id = $2;
    `;

    const result = await db.query(query, [id, userId]);

    return (result.rowCount ?? 0) > 0;
  }

}