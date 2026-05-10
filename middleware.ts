import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  // Define protected routes
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/professional");
  const isAuthRoute = request.nextUrl.pathname.startsWith("/login") || 
                     request.nextUrl.pathname.startsWith("/register");

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token) {
    const user = verifyToken(token);
    
    // If token is invalid and it's a protected route, redirect to login
    if (!user && isProtectedRoute) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("token");
      return response;
    }

    // If already logged in and trying to access login/register, redirect to dashboard
    if (user && isAuthRoute) {
      return NextResponse.redirect(new URL("/professional/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/professional/:path*", "/login", "/register"],
};