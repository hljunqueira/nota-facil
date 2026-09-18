import { DefaultSession } from "next-auth";
import { UserRole, AmbienteFiscal } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    tenantId?: string | null;
    tenantName?: string | null;
    ambiente?: AmbienteFiscal | null;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      tenantId?: string | null;
      tenantName?: string | null;
      ambiente?: AmbienteFiscal | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    tenantId?: string | null;
    tenantName?: string | null;
    ambiente?: AmbienteFiscal | null;
  }
}
