import { NextResponse } from "next/server";
import {StatusCodes} from 'http-status-codes';
import { z } from 'zod';
import { AuthService } from "@/lib/services/auth.service";

const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email" }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
})

export async function POST(req:Request){
    try {
        const body = await req.json();

        const validatedData = loginSchema.safeParse(body);
        if (!validatedData.success) {
            return NextResponse.json(
                { message: 'Validation failed', errors: validatedData.error.flatten().fieldErrors },
                { status: StatusCodes.BAD_REQUEST });
        }
    const {user, token} = await AuthService.loginUser(validatedData.data);

    const response = NextResponse.json(
      { message: 'Login successful', user, token },
      { status: StatusCodes.OK }
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

    }catch(error:any){
        console.error('Registration Error:', error);

            // If the service deliberately threw our custom duplicate error:
    if (error.message === 'INVALID_CREDENTIALS') {
      return NextResponse.json(
        { message: 'Email or password is not correct' },
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