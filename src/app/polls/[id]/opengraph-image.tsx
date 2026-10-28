import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getPollDetail } from "@/lib/data/operations";
import { createAnonymousClient } from "@/lib/supabase/anonymous";

export const alt = "Opinión — encuestas para descubrir lo que pensamos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function PollImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPollDetail(createAnonymousClient(), id, { signedIn: false });
  const poll = detail.ok ? detail.data.poll : null;
  const font = await readFile(
    join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf"),
  );

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "36px 48px",
        background: "#f4f4f5",
        color: "#0a0a0b",
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28 }}>
        <span>Opinión</span>
        {poll?.author && (
          <span style={{ color: "#5e5e66", fontSize: 24 }}>@{poll.author.username}</span>
        )}
      </div>
      {poll ? (
        <>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              marginBottom: 24,
              fontSize: poll.question.length > 140 ? 30 : 42,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              wordBreak: "break-all",
            }}
          >
            {poll.question}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {poll.options.map((option) => (
              <div
                key={option.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "49%",
                  padding: "14px 18px",
                  border: "1px solid #e4e4e7",
                  borderRadius: 12,
                  background: "#ffffff",
                  fontSize: 22,
                  lineHeight: 1.2,
                  wordBreak: "break-all",
                }}
              >
                {option.text}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "auto",
              paddingTop: 20,
              fontSize: 22,
              color: "#5e5e66",
            }}
          >
            Elige tu respuesta. Descubre lo que pensamos.
          </div>
        </>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}
        >
          <div style={{ display: "flex", fontSize: 64, letterSpacing: "-0.03em" }}>
            Una pregunta. Muchas opiniones.
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 28, color: "#5e5e66" }}>
            Elige tu respuesta. Descubre lo que pensamos.
          </div>
        </div>
      )}
    </div>,
    {
      ...size,
      fonts: [{ name: "Geist", data: font, weight: 400, style: "normal" }],
      headers: { "Cache-Control": "no-store" },
    },
  );
}
