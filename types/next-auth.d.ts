import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      company?: string;
    };
  }
  interface User { 
    id: string;
    company?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    company?: string;
  }
}
