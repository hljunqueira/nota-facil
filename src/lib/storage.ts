import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const bucketName = process.env.R2_BUCKET_NAME || "notafacil-invoices";
const publicBaseUrl = (process.env.R2_PUBLIC_URL || "https://storage.appnotafacil.online").replace(/\/$/, "");

// Identifica se credenciais reais do R2 foram fornecidas
const isR2Configured =
  accessKeyId &&
  secretAccessKey &&
  accountId &&
  !accessKeyId.includes("seu_") &&
  !secretAccessKey.includes("seu_");

let r2Client: S3Client | null = null;

if (isR2Configured) {
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

// Diretório local de fallback para desenvolvimento e testes
const LOCAL_STORAGE_DIR = path.join(process.cwd(), "public", "storage");

function ensureLocalDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Faz upload de um buffer/string para o Cloudflare R2 (ou fallback local seguro)
 */
export async function uploadFileToStorage(
  key: string,
  content: Buffer | string,
  contentType: string
): Promise<string> {
  const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;

  if (isR2Configured && r2Client) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await r2Client.send(command);
      return `${publicBaseUrl}/${key}`;
    } catch (err) {
      console.error(`[uploadFileToStorage] Erro ao enviar para R2 (${key}):`, err);
      // Fallback local se R2 falhar
    }
  }

  // Fallback Local
  const localFilePath = path.join(LOCAL_STORAGE_DIR, key);
  ensureLocalDirectory(path.dirname(localFilePath));
  fs.writeFileSync(localFilePath, buffer);

  const appUrl = (process.env.APP_URL || "https://appnotafacil.online").replace(/\/$/, "");
  return `${appUrl}/storage/${key}`;
}

/**
 * Upload de XML de Nota Fiscal (SEFAZ)
 */
export async function uploadInvoiceXml(
  tenantId: string,
  chaveAcesso: string,
  xmlContent: string | Buffer
): Promise<string> {
  const key = `invoices/${tenantId}/${chaveAcesso}.xml`;
  return uploadFileToStorage(key, xmlContent, "application/xml");
}

/**
 * Upload de DANFE em PDF
 */
export async function uploadInvoicePdf(
  tenantId: string,
  chaveAcesso: string,
  pdfBuffer: Buffer
): Promise<string> {
  const key = `invoices/${tenantId}/${chaveAcesso}.pdf`;
  return uploadFileToStorage(key, pdfBuffer, "application/pdf");
}

/**
 * Upload do arquivo ZIP do Fechamento Mensal do Contador
 */
export async function uploadMonthlyZip(
  tenantId: string,
  mesAno: string,
  zipBuffer: Buffer
): Promise<string> {
  const key = `fechamentos/${tenantId}/fechamento-${mesAno}.zip`;
  return uploadFileToStorage(key, zipBuffer, "application/zip");
}

/**
 * Baixa um arquivo do storage para buffer
 */
export async function getFileFromStorage(key: string): Promise<Buffer | null> {
  if (isR2Configured && r2Client) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const response = await r2Client.send(command);
      if (response.Body) {
        const stream = response.Body as any;
        const chunks: any[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      }
    } catch (err) {
      console.warn(`[getFileFromStorage] Arquivo não encontrado no R2 (${key}):`, err);
    }
  }

  // Fallback local
  const localFilePath = path.join(LOCAL_STORAGE_DIR, key);
  if (fs.existsSync(localFilePath)) {
    return fs.readFileSync(localFilePath);
  }

  return null;
}

/**
 * Deleta um arquivo do storage
 */
export async function deleteFileFromStorage(key: string): Promise<boolean> {
  if (isR2Configured && r2Client) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      await r2Client.send(command);
      return true;
    } catch (err) {
      console.error(`[deleteFileFromStorage] Erro ao deletar no R2:`, err);
    }
  }

  const localFilePath = path.join(LOCAL_STORAGE_DIR, key);
  if (fs.existsSync(localFilePath)) {
    fs.unlinkSync(localFilePath);
    return true;
  }

  return false;
}
