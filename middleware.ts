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
    const user = await verifyToken(token);
    
    // If token is invalid and it's a protected route, redirect to login
    if (!user && isProtectedRoute) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("token");
      return response;
    }

    if (user) {
      // 1. Role-based Access Control: Clients cannot access professional routes
      if (isProtectedRoute && user.role !== "professional") {
        return NextResponse.redirect(new URL("/", request.url));
      }

      // 2. Already logged in: Redirect away from login/register to the appropriate "home"
      if (isAuthRoute) {
        const dest = user.role === "professional" ? "/professional/dashboard" : "/";
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/professional/:path*", "/login", "/register"],
};