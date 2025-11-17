import { NextResponse } from "next/server";

const SHEET_ID = "1ckbwqR3vGqNNVvUZWnq2AS74xcExkphlt9GSGypGT8s";
const API_KEY = "AIzaSyBcV6rkvLMbLt2J4uO_76BtGzsqJzD7ofc";

const TAB_NAME = "pacientes"; // nome da aba, sem intervalo

// ----------------------
// GET - Ler dados
// ----------------------
export async function GET() {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB_NAME}?key=${API_KEY}`;

    const res = await fetch(url);

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        { error: "Erro ao buscar dados na planilha", details: txt },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ values: data.values || [] });

  } catch (err) {
    return NextResponse.json(
      { error: "Erro interno", details: String(err) },
      { status: 500 }
    );
  }
}

// ----------------------
// POST - Adicionar linha
// ----------------------
export async function POST(request: Request) {
  try {
    const body: { values: string[][] } = await request.json();

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB_NAME}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: body.values,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Erro ao salvar", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, result: data });

  } catch (err) {
    return NextResponse.json(
      { error: "Erro interno ao salvar informações", details: String(err) },
      { status: 500 }
    );
  }
}