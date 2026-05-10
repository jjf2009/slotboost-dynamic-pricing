import { NextResponse } from 'next/server';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { AuthService } from '../../../lib/services/auth.service';

// 1. Controller Responsibility: Define Request Validation Schema using Zod
const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: "Invalid email" }),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  phone: z.string().optional(),
  role: z.enum(["professional", "client"]),
  serviceType: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // 2. Parse payload safely
    const body = await req.json();

    // 3. Controller Responsibility: Validate HTTP Request Input
    const validatedData = registerSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { message: 'Validation failed', errors: validatedData.error.flatten().fieldErrors },
        { status: StatusCodes.BAD_REQUEST } // Status 400
      );
    }

    // 4. Controller cleanly calls Service (Handing over business logic)
    const { user, token } = await AuthService.registerUser(validatedData.data);

    // 5. Controller Responsibility: Return HTTP Response Success
    const response = NextResponse.json(
      { message: 'User registered successfully', user, token },
      { status: StatusCodes.CREATED } // Status 201
    );

    // Set the cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 50, // 50 days
      path: "/",
    });

    return response;

  } catch (error: any) {
    // 6. Controller Responsibility: Formatting HTTP Errors gracefully
    console.error('Registration Error:', error);

    // If the service deliberately threw our custom duplicate error:
    if (error.message === 'USER_ALREADY_EXISTS') {
      return NextResponse.json(
        { message: 'A user with this email already exists' },
        { status: StatusCodes.CONFLICT } // Status 409
      );
    }

    // Otherwise, it was an unexpected failure
    return NextResponse.json(
      { message: 'Internal server error while processing registration' },
      { status: StatusCodes.INTERNAL_SERVER_ERROR } // Status 500
    );
  }
}
