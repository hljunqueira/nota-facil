import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prismaAdmin } from "./prismaAdmin";
import { loginSchema } from "./validations";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain:
          process.env.NODE_ENV === "production"
            ? ".appnotafacil.online"
            : undefined,
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const rawEmail = (credentials as any)?.email;
        const rawSenha = (credentials as any)?.senha || (credentials as any)?.password;

        const parsed = loginSchema.safeParse({ email: rawEmail, senha: rawSenha });
        if (!parsed.success) {
          return null;
        }

        const { email, senha } = parsed.data;
        const cleanInput = email.toLowerCase().trim();

        // 1. Tenta autenticar como usuário de Tenant
        const tenantUser = await prismaAdmin.user.findFirst({
          where: { email: { equals: cleanInput, mode: "insensitive" } },
          include: { tenant: true },
        });

        if (tenantUser) {
          const isValid = await bcrypt.compare(senha, tenantUser.senhaHash);
          if (!isValid) return null;

          // 1.1 Se o cadastro ainda estiver em análise pela equipe administrativa
          if (tenantUser.tenant?.statusCadastro === "PENDENTE_ANALISE") {
            throw new Error("CADASTRO_EM_ANALISE");
          }

          // 1.2 Se o cadastro foi rejeitado pela administração
          if (tenantUser.tenant?.statusCadastro === "REJEITADO") {
            throw new Error(
              tenantUser.tenant?.motivoRejeicao
                ? `CADASTRO_REJEITADO:${tenantUser.tenant.motivoRejeicao}`
                : "CADASTRO_REJEITADO"
            );
          }

          // 1.3 Se a conta do tenant estiver suspensa, impede o login
          if (
            tenantUser.tenant?.statusConta === "SUSPENSO_ADMIN" ||
            tenantUser.tenant?.statusConta === "SUSPENSO_PAGAMENTO"
          ) {
            throw new Error("CONTA_SUSPENSA");
          }

          return {
            id: tenantUser.id,
            email: tenantUser.email,
            name: tenantUser.nome,
            role: "TENANT",
            tenantId: tenantUser.tenantId,
            tenantName:
              tenantUser.tenant?.nomeFantasia ||
              tenantUser.tenant?.razaoSocial ||
              "Oficina",
            ambiente: tenantUser.tenant?.ambiente ?? "HOMOLOGACAO",
          };
        }

        // 2. Se não encontrou no Tenant, tenta autenticar como PlatformAdmin
        const adminUser = await prismaAdmin.platformAdmin.findFirst({
          where: {
            OR: [
              { email: { equals: cleanInput, mode: "insensitive" } },
              { nome: { equals: cleanInput, mode: "insensitive" } },
              ...(cleanInput === "admin" || cleanInput === "henrique" || cleanInput === "hljunqueira"
                ? [{ nome: { contains: "Henrique", mode: "insensitive" as const } }]
                : []),
            ],
          },
        });

        if (adminUser) {
          const isValid = await bcrypt.compare(senha, adminUser.senhaHash);
          if (!isValid) return null;

          return {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.nome,
            role: "ADMIN",
            tenantId: null,
            tenantName: "Administrador da Plataforma",
            ambiente: null,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        token.ambiente = user.ambiente;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "TENANT";
        session.user.tenantId = token.tenantId as string | null;
        session.user.tenantName = token.tenantName as string | null;
        session.user.ambiente = (token.ambiente as any) ?? null;
      }
      return session;
    },
  },
};

export default authOptions;
