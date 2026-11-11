/**
 * Arte da marca para ícones e imagem de compartilhamento, desenhada com
 * `ImageResponse` (só aceita flexbox e um subconjunto de CSS).
 */
const RED = "#c2183c";
const GOLD = "#e8a93b";
const INK = "#2a1420";

/** Ícone do app: um papelzinho dobrado com o selo dourado. */
export function BrandIcon({ size }: { size: number }) {
  const slip = size * 0.62;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: RED,
      }}
    >
      <div
        style={{
          width: slip,
          height: slip * 0.62,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: size * 0.04,
          transform: "rotate(-8deg)",
          boxShadow: `0 ${size * 0.03}px 0 rgba(0,0,0,0.22)`,
        }}
      >
        <div
          style={{
            width: slip * 0.34,
            height: slip * 0.34,
            borderRadius: "50%",
            background: GOLD,
            border: `${Math.max(1, size * 0.012)}px solid ${INK}`,
          }}
        />
      </div>
    </div>
  );
}

/** Imagem 1200×630 que aparece no preview do link (WhatsApp, iMessage). */
export function ShareCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 80px",
        background: RED,
        color: "#ffffff",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: GOLD }}>Laço</div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginTop: 16 }}>
          Amigo secreto no papelzinho
        </div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 28, opacity: 0.92 }}>
          Sorteio pelo link, sem criar conta. Cada um abre o seu no celular.
        </div>
      </div>
      <div
        style={{
          width: 320,
          height: 380,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: INK,
          borderRadius: 14,
          transform: "rotate(5deg)",
          boxShadow: "0 18px 0 rgba(0,0,0,0.22)",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>Você tirou</div>
        <div
          style={{
            width: 120,
            height: 120,
            marginTop: 32,
            borderRadius: "50%",
            background: GOLD,
            border: `5px solid ${INK}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 72,
            fontWeight: 800,
          }}
        >
          ?
        </div>
      </div>
    </div>
  );
}
