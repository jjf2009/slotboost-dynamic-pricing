import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const path = request.nextUrl.pathname;

  // Define protected routes
  const isProfessionalRoute = path.startsWith("/professional");
  const isClientRoute = path.startsWith("/client");
  const isProtectedRoute = isProfessionalRoute || isClientRoute;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/register");

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
      // Role-based Access Control
      if (isProfessionalRoute && user.role !== "professional") {
        return NextResponse.redirect(new URL("/client/dashboard", request.url));
      }
      if (isClientRoute && user.role !== "client") {
        return NextResponse.redirect(
          new URL("/professional/dashboard", request.url),
        );
      }

      // Already logged in: Redirect away from login/register to the appropriate "home"
      if (isAuthRoute) {
        const dest =
          user.role === "professional"
            ? "/professional/dashboard"
            : "/client/dashboard";
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/professional/:path*", "/client/:path*", "/login", "/register"],
  runtime: "nodejs",
};
