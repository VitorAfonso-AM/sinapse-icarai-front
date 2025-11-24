import { NextResponse } from "next/server";
import { google } from "googleapis";

const REQUIRED_ENV_VARS = [
  "GOOGLE_SHEETS_ID",
  "GOOGLE_SHEETS_TAB",
  "GOOGLE_SERVICE_ACCOUNT_TYPE",
  "GOOGLE_SERVICE_ACCOUNT_PROJECT_ID",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  "GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_CLIENT_ID",
  "GOOGLE_SERVICE_ACCOUNT_AUTH_URI",
  "GOOGLE_SERVICE_ACCOUNT_TOKEN_URI",
  "GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_CERT_URL",
  "GOOGLE_SERVICE_ACCOUNT_CLIENT_CERT_URL",
  "GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN",
] as const;

type EnvKey = (typeof REQUIRED_ENV_VARS)[number];

function getEnvVar(key: EnvKey) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`[Sheets API] Variável de ambiente '${key}' não configurada.`);
  }

  return value;
}

function getServiceAccountCredentials() {
  return {
    type: getEnvVar("GOOGLE_SERVICE_ACCOUNT_TYPE"),
    project_id: getEnvVar("GOOGLE_SERVICE_ACCOUNT_PROJECT_ID"),
    private_key_id: getEnvVar("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID"),
    private_key: getEnvVar("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n"),
    client_email: getEnvVar("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL"),
    client_id: getEnvVar("GOOGLE_SERVICE_ACCOUNT_CLIENT_ID"),
    auth_uri: getEnvVar("GOOGLE_SERVICE_ACCOUNT_AUTH_URI"),
    token_uri: getEnvVar("GOOGLE_SERVICE_ACCOUNT_TOKEN_URI"),
    auth_provider_x509_cert_url: getEnvVar("GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_CERT_URL"),
    client_x509_cert_url: getEnvVar("GOOGLE_SERVICE_ACCOUNT_CLIENT_CERT_URL"),
    universe_domain: getEnvVar("GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN"),
  };
}

function getSheetMetadata() {
  return {
    sheetId: getEnvVar("GOOGLE_SHEETS_ID"),
    tabName: getEnvVar("GOOGLE_SHEETS_TAB"),
  };
}

function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: getServiceAccountCredentials(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth;
}

export async function GET() {
  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const { sheetId, tabName } = getSheetMetadata();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: tabName,
    });

    return NextResponse.json({ values: response.data.values || [] });

  } catch (err: any) {
    console.error("Erro ao buscar dados:", err);
    return NextResponse.json(
      { error: "Erro ao buscar dados", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: { values: string[][] } = await request.json();
    
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const { sheetId, tabName } = getSheetMetadata();

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: tabName,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: body.values,
      },
    });

    return NextResponse.json({ success: true, result: response.data });

  } catch (err: any) {
    console.error("Erro ao adicionar linha:", err);
    return NextResponse.json(
      { error: "Erro ao adicionar linha", details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body: { rowIndex: number; values: string[] } = await request.json();

    if (!body?.rowIndex || !Array.isArray(body.values)) {
      return NextResponse.json(
        { error: "Requisição inválida. Informe rowIndex e values." },
        { status: 400 }
      );
    }

    const { sheetId, tabName } = getSheetMetadata();
    const range = `${tabName}!A${body.rowIndex}`;
    
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [body.values],
      },
    });

    return NextResponse.json({ success: true, result: response.data });

  } catch (err: any) {
    console.error("Erro ao atualizar linha:", err);
    return NextResponse.json(
      { error: "Erro ao atualizar linha", details: err.message },
      { status: 500 }
    );
  }
}