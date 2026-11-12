import type { ReactNode } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  Avatar,
  Bow,
  Btn,
  C,
  Calm,
  Card,
  Chip,
  Confetti,
  Garland,
  H,
  hand,
  Panel,
  Phone,
  Pop,
  sans,
  Scene,
  ScreenTitle,
  Snow,
  Tag,
  Tap,
  tween,
  typed,
  W,
  wrap,
} from "./ui";

const PEOPLE = [
  { name: "Ana", emoji: "🦊", color: "#f9c6d0" },
  { name: "Bia", emoji: "🐻", color: "#fbd9a5" },
  { name: "Caio", emoji: "🐼", color: "#fbe9a0" },
  { name: "Duda", emoji: "🐸", color: "#a9e0d1" },
  { name: "Pedrinho", emoji: "🐧", color: "#b9d4f7" },
];

/* ——— Abertura ——— */

export const OPENING = 150;

export function Opening() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 120, mass: 0.9 } });
  const out = tween(frame, OPENING - 12, OPENING, 1, 0);
  return (
    <AbsoluteFill style={{ ...wrap, fontFamily: sans, color: "#fff" }}>
      <Calm />
      <Snow />
      <Garland y={70} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
        <div style={{ transform: `translateY(${(1 - drop) * -420}px) rotate(${(1 - drop) * -14}deg)` }}>
          <Tag size={150} />
        </div>
        <p
          style={{
            margin: "90px 90px 0",
            textAlign: "center",
            fontSize: 62,
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            textWrap: "balance",
            opacity: tween(frame, 38, 56),
            transform: `translateY(${tween(frame, 38, 60, 30, 0)}px)`,
          }}
        >
          O amigo secreto da família, do convite à festa.
        </p>
        <p
          style={{
            margin: "34px 0 0",
            fontSize: 38,
            fontWeight: 600,
            opacity: tween(frame, 70, 88) * 0.92,
          }}
        >
          Veja como funciona em um minuto
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ——— 1. Criar o grupo ——— */

export const CREATE = 180;

function Field({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{label}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 84,
          padding: "0 26px",
          borderRadius: 24,
          background: "#fff",
          border: `4px solid ${active ? C.ink : C.line}`,
          boxShadow: active ? `0 0 0 6px ${C.gold}99` : "none",
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        {value}
        {active && <span style={{ width: 4, height: 40, marginLeft: 4, background: C.ink }} />}
      </div>
    </div>
  );
}

export function Create() {
  const frame = useCurrentFrame();
  const within = (a: number, b: number) => frame >= a && frame < b;
  return (
    <Scene
      duration={CREATE}
      title="Monte o grupo em um minuto"
      sub="Escolha a ocasião, o dia da troca e o valor do presente."
    >
      <Phone>
        <ScreenTitle>Novo grupo</ScreenTitle>
        <Field label="Nome do grupo" value={typed("Natal da família", frame, 22, 58)} active={within(18, 62)} />
        <Field label="Dia da troca" value={typed("24/12/2026", frame, 68, 90)} active={within(62, 94)} />
        <Field label="Valor do presente" value={typed("R$ 50 a R$ 80", frame, 100, 124)} active={within(94, 128)} />
        <div style={{ marginTop: 40 }}>
          <Btn pressed={within(140, 150)}>Criar grupo</Btn>
        </div>
        <Tap at={140} x={170} y={648} />
        <Pop at={152} style={{ position: "absolute", left: 34, right: 34, top: 700 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "20px 26px",
              borderRadius: 28,
              background: C.leaf,
              color: "#fff",
              fontWeight: 700,
            }}
          >
            <Check />
            Grupo criado. Agora chame a turma.
          </div>
        </Pop>
      </Phone>
    </Scene>
  );
}

function Check() {
  return (
    <div
      style={{
        flex: "none",
        display: "grid",
        placeItems: "center",
        width: 46,
        height: 46,
        borderRadius: "50%",
        background: "#fff",
      }}
    >
      <svg width={30} height={30} viewBox="0 0 24 24" fill="none">
        <path d="M5 12.5 10 17.5 19.5 7" stroke={C.leaf} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ——— 2. Convidar ——— */

export const INVITE = 180;

export function Invite() {
  const frame = useCurrentFrame();
  const joined = PEOPLE.filter((_, i) => frame >= 44 + i * 20).length;
  return (
    <Scene
      duration={INVITE}
      title="Chame todo mundo pelo WhatsApp"
      sub="Cada pessoa entra com a própria conta. Criança entra pela conta de um responsável."
    >
      <Phone top={600}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <ScreenTitle>Pessoas</ScreenTitle>
          <Chip on>{joined === 1 ? "1 pessoa" : `${joined} pessoas`}</Chip>
        </div>
        <div style={{ marginTop: 24 }}>
          <Btn kind="leaf" pressed={frame >= 20 && frame < 30} style={{ width: "100%" }}>
            Convidar pelo WhatsApp
          </Btn>
        </div>
        <Tap at={20} x={296} y={196} />
        <div style={{ marginTop: 22 }}>
          {PEOPLE.map((person, i) => (
            <Pop key={person.name} at={44 + i * 20}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "13px 0",
                  borderBottom: `4px dashed ${C.line}`,
                }}
              >
                <Avatar {...person} size={70} />
                <div style={{ flex: 1, fontWeight: 700, fontSize: 32 }}>{person.name}</div>
                {person.name === "Pedrinho" ? <Chip>na conta da Duda</Chip> : <Chip on>Entrou</Chip>}
              </div>
            </Pop>
          ))}
        </div>
      </Phone>
    </Scene>
  );
}

/* ——— 3. Lista de desejos ——— */

export const WISHES = 180;

function Wish({ title, note, price }: { title: string; note?: string; price?: string }) {
  return (
    <Card style={{ display: "flex", gap: 20, alignItems: "flex-start", marginTop: 20 }}>
      <div
        style={{
          flex: "none",
          display: "grid",
          placeItems: "center",
          width: 68,
          height: 68,
          borderRadius: 20,
          background: C.gold,
        }}
      >
        <Bow size={40} color={C.ink} />
      </div>
      <div>
        <div style={{ fontSize: 33, fontWeight: 800, lineHeight: 1.15 }}>{title}</div>
        {note && <div style={{ color: C.inkSoft, marginTop: 4 }}>{note}</div>}
        {price && <Chip style={{ marginTop: 10 }}>{price}</Chip>}
      </div>
    </Card>
  );
}

export function Wishes() {
  return (
    <Scene
      duration={WISHES}
      title="Cada um conta o que quer ganhar"
      sub="Lista de desejos, tamanhos e gostos. Só quem tirou a pessoa vê."
    >
      <Phone>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Avatar {...PEOPLE[3]} size={70} />
          <ScreenTitle>Lista da Duda</ScreenTitle>
        </div>
        <Pop at={22}>
          <Wish title="Caneca grande" note="Azul, de cerâmica" price="cerca de R$ 45" />
        </Pop>
        <Pop at={50}>
          <Wish title="Livro de receitas" />
        </Pop>
        <Pop at={78}>
          <Wish title="Fone de ouvido sem fio" price="cerca de R$ 180" />
        </Pop>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30 }}>
          {["Camiseta M", "Calçado 37", "Gosta de café"].map((text, i) => (
            <Pop key={text} at={108 + i * 10}>
              <Chip on>{text}</Chip>
            </Pop>
          ))}
        </div>
      </Phone>
    </Scene>
  );
}

/* ——— 4. Sorteio ——— */

export const DRAW = 210;

export function Draw() {
  const frame = useCurrentFrame();
  const shuffle = frame >= 78;
  // Depois do toque, os papelzinhos giram juntos e cada um vai para uma pessoa.
  const spin = tween(frame, 78, 150, 0, Math.PI * 2.5);
  const deal = tween(frame, 132, 166);
  const cx = 296;
  const cy = 330;
  return (
    <Scene
      duration={DRAW}
      title="Sorteie de uma vez, ou cada um tira o seu"
      sub="Com regras como “casal não se tira”. Nem quem organiza vê os pares."
    >
      <Phone top={640}>
        <ScreenTitle>{frame >= 166 ? "Sorteio feito" : "Sortear"}</ScreenTitle>
        {!shuffle && (
          <div style={{ opacity: tween(frame, 70, 78, 1, 0) }}>
            <div style={{ marginTop: 22 }}>
              <Btn pressed={frame >= 62} style={{ width: "100%" }}>
                Sortear tudo agora
              </Btn>
            </div>
            <div style={{ marginTop: 24 }}>
              <Btn kind="quiet" style={{ width: "100%" }}>
                Liberar para cada um sortear
              </Btn>
            </div>
            <Pop at={24} style={{ marginTop: 34 }}>
              <Chip>💑 Ana não tira Bia</Chip>
            </Pop>
            <Tap at={62} x={296} y={196} />
          </div>
        )}
        {shuffle && (
          <>
            {PEOPLE.map((person, i) => {
              const angle = spin + (i * Math.PI * 2) / PEOPLE.length;
              const radius = 150 * (1 - deal);
              const homeX = 62 + i * 117;
              const x = (cx + Math.cos(angle) * radius) * (1 - deal) + homeX * deal;
              const y = (cy + Math.sin(angle) * radius * 0.7) * (1 - deal) + 404 * deal;
              return (
                <div key={person.name}>
                  <div
                    style={{
                      position: "absolute",
                      left: homeX - 44,
                      top: 460,
                      opacity: tween(frame, 84, 100),
                    }}
                  >
                    <Avatar {...person} size={88} />
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      left: x - 50,
                      top: y - 32,
                      width: 100,
                      height: 64,
                      borderRadius: 8,
                      background: "#fff",
                      backgroundImage: `linear-gradient(transparent 30px, ${C.line} 30px, ${C.line} 34px, transparent 34px)`,
                      boxShadow: "0 8px 14px rgb(42 20 32 / 0.2)",
                      transform: `rotate(${(1 - deal) * (angle * 40) + deal * (i % 2 ? 5 : -5)}deg)`,
                      opacity: tween(frame, 78, 86),
                    }}
                  />
                </div>
              );
            })}
            <Pop at={170} style={{ position: "absolute", left: 34, right: 34, top: 590 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, fontWeight: 700 }}>
                <span style={{ fontSize: 40 }}>🔒</span>
                Cada pessoa recebeu um papelzinho lacrado.
              </div>
            </Pop>
          </>
        )}
      </Phone>
    </Scene>
  );
}

/* ——— 5. Papelzinho ——— */

export const SLIP = 210;

export function Slip() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hold = tween(frame, 34, 76);
  const open = spring({ frame: frame - 78, fps, config: { damping: 15, stiffness: 70, mass: 1 } });
  const half = 236;
  const width = 470;
  const face = {
    position: "absolute" as const,
    inset: 0,
    display: "grid",
    placeItems: "center",
    background: "#fff",
    backfaceVisibility: "hidden" as const,
  };
  return (
    <Scene
      duration={SLIP}
      title="Segure o selo e abra o seu papelzinho"
      sub="Ele chega lacrado. Só você vê quem tirou."
    >
      <Phone>
        <div style={{ textAlign: "center" }}>
          <ScreenTitle>Seu papelzinho</ScreenTitle>
        </div>
        <div
          style={{
            position: "relative",
            width,
            height: half * 2,
            margin: "34px auto 0",
            perspective: 1600,
            filter: "drop-shadow(0 18px 22px rgb(42 20 32 / 0.2))",
          }}
        >
          {/* Metade de baixo: o nome. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: half,
              height: half,
              background: "#fff",
              borderRadius: "0 0 14px 14px",
              display: "grid",
              placeItems: "center",
              textAlign: "center",
            }}
          >
            <div style={{ opacity: tween(frame, 92, 108) }}>
              <div style={{ fontFamily: hand, fontSize: 104, lineHeight: 1, color: C.ink }}>Tia Neide</div>
              <div style={{ marginTop: 14, fontSize: 25, fontWeight: 600 }}>Tema do presente: algo azul</div>
            </div>
          </div>
          {/* Metade de cima: dobrada sobre a de baixo, com o selo; abre para cima. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: half,
              transformOrigin: "50% 100%",
              transformStyle: "preserve-3d",
              transform: `rotateX(${-180 * (1 - open)}deg)`,
            }}
          >
            <div style={{ ...face, borderRadius: "14px 14px 0 0" }}>
              <div style={{ display: "grid", justifyItems: "center", gap: 12 }}>
                <Avatar emoji="🦉" color="#e3d0f5" size={96} />
                <div style={{ fontWeight: 700 }}>Seu amigo secreto é</div>
              </div>
            </div>
            <div style={{ ...face, borderRadius: "0 0 14px 14px", transform: "rotateX(180deg)" }}>
              <div style={{ position: "relative", width: 170, height: 170, display: "grid", placeItems: "center" }}>
                <svg width={170} height={170} viewBox="0 0 36 36" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
                  <circle cx={18} cy={18} r={16.4} fill="none" stroke={C.line} strokeWidth={1.6} />
                  <circle
                    cx={18}
                    cy={18}
                    r={16.4}
                    fill="none"
                    stroke={C.brandDark}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray={`${hold * 100} 100`}
                  />
                </svg>
                <div
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 132,
                    height: 132,
                    borderRadius: "50%",
                    background: C.gold,
                    boxShadow: "0 6px 0 #a87416",
                    transform: `scale(${1 - 0.07 * Math.min(1, hold * 6)})`,
                  }}
                >
                  <Bow size={78} color={C.ink} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <Tap at={34} x={296} y={560} />
        <Pop at={118} style={{ margin: "34px 28px 0" }}>
          <div
            style={{
              padding: "18px 24px",
              borderRadius: 24,
              background: C.leafSoft,
              color: C.leaf,
              fontWeight: 700,
              fontSize: 27,
              textAlign: "center",
            }}
          >
            Lacre rompido agora. Só você viu este papelzinho.
          </div>
        </Pop>
        <Confetti at={84} x={296} y={380} />
      </Phone>
    </Scene>
  );
}

/* ——— 6. Conversa anônima ——— */

export const CHAT = 180;

function Bubble({ mine, children }: { mine: boolean; children: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginTop: 20 }}>
      <div
        style={{
          maxWidth: 410,
          padding: "18px 26px",
          borderRadius: 34,
          borderBottomRightRadius: mine ? 8 : 34,
          borderBottomLeftRadius: mine ? 34 : 8,
          background: mine ? C.brand : "#fff",
          color: mine ? "#fff" : C.ink,
          boxShadow: mine ? "none" : `inset 0 0 0 4px ${C.line}`,
          fontWeight: 600,
          fontSize: 31,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function Chat() {
  const frame = useCurrentFrame();
  const typing = frame >= 54 && frame < 78;
  return (
    <Scene
      duration={CHAT}
      title="Pergunte sem se revelar"
      sub="Conversa anônima com quem você tirou, e com quem tirou você."
    >
      <Phone>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Avatar emoji="🦉" color="#e3d0f5" size={70} />
          <div>
            <ScreenTitle>Com Tia Neide</ScreenTitle>
            <div style={{ color: C.inkSoft, fontSize: 25 }}>Ela não sabe que é você</div>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <Pop at={20}>
            <Bubble mine>Qual é o seu número de calçado?</Bubble>
          </Pop>
          {typing && (
            <Bubble mine={false}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    margin: "0 5px",
                    borderRadius: "50%",
                    background: C.inkSoft,
                    opacity: 0.35 + 0.65 * Math.abs(Math.sin(frame / 5 + i)),
                  }}
                />
              ))}
            </Bubble>
          )}
          {frame >= 78 && (
            <Pop at={78}>
              <Bubble mine={false}>Calço 38! Mas quem é você? 👀</Bubble>
            </Pop>
          )}
          <Pop at={122}>
            <Bubble mine>Segredo até o dia da festa 🤫</Bubble>
          </Pop>
        </div>
      </Phone>
    </Scene>
  );
}

/* ——— 7. Festa ——— */

export const PARTY = 210;

export function Party() {
  const frame = useCurrentFrame();
  const scoreboard = frame >= 126;
  const chain = [PEOPLE[0], PEOPLE[2], PEOPLE[1], PEOPLE[3], PEOPLE[4]];
  const scores = [
    { ...PEOPLE[3], hits: 3 },
    { ...PEOPLE[0], hits: 2 },
    { ...PEOPLE[2], hits: 1 },
  ];
  return (
    <Scene
      duration={PARTY}
      title="No dia, a festa vai para o telão"
      sub="Palpites de quem tirou quem, revelação em cadeia e placar."
    >
      {/* Um telão no lugar do celular. */}
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 600 + tween(frame, 0, 20, 60, 0),
          height: 590,
          borderRadius: 40,
          background: C.ink,
          padding: 16,
          boxShadow: "0 30px 60px rgb(42 20 32 / 0.25)",
        }}
      >
        <div
          style={{
            position: "relative",
            height: "100%",
            borderRadius: 26,
            background: C.paper,
            overflow: "hidden",
            padding: "34px 44px",
            fontSize: 32,
          }}
        >
          {!scoreboard && (
            <div style={{ opacity: tween(frame, 116, 126, 1, 0) }}>
              <div style={{ fontSize: 46, fontWeight: 800 }}>Revelação em cadeia</div>
              <div style={{ color: C.inkSoft, marginTop: 6 }}>Quem recebe o presente é o próximo a entregar.</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 60 }}>
                {chain.map((person, i) => (
                  <div key={person.name} style={{ display: "flex", alignItems: "center" }}>
                    <Pop at={18 + i * 20}>
                      <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
                        <Avatar {...person} size={104} />
                        <div style={{ fontWeight: 700, fontSize: 27 }}>{person.name}</div>
                      </div>
                    </Pop>
                    {i < chain.length - 1 && (
                      <svg
                        width={52}
                        height={40}
                        viewBox="0 0 52 40"
                        style={{ margin: "0 4px 40px", opacity: tween(frame, 30 + i * 20, 38 + i * 20) }}
                      >
                        <path
                          d="M4 20h40M30 6l14 14-14 14"
                          fill="none"
                          stroke={C.brand}
                          strokeWidth={7}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
              <Pop at={98} style={{ marginTop: 44 }}>
                <div style={{ fontFamily: hand, fontSize: 58, textAlign: "center", color: C.brand }}>
                  Ana tirou… Caio!
                </div>
              </Pop>
            </div>
          )}
          {scoreboard && (
            <div style={{ opacity: tween(frame, 126, 138) }}>
              <div style={{ fontSize: 46, fontWeight: 800 }}>Placar dos palpites</div>
              <div style={{ marginTop: 26 }}>
                {scores.map((person, i) => (
                  <Pop key={person.name} at={136 + i * 12}>
                    <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 20 }}>
                      <Avatar {...person} size={92} />
                      <div style={{ width: 130, fontWeight: 700 }}>{person.name}</div>
                      <div style={{ flex: 1, height: 44, borderRadius: 999, background: C.panel, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${tween(frame, 142 + i * 12, 176 + i * 12) * (person.hits / 3) * 100}%`,
                            height: "100%",
                            borderRadius: 999,
                            background: i === 0 ? C.gold : C.brand,
                          }}
                        />
                      </div>
                      <div style={{ width: 150, fontWeight: 700, textAlign: "right" }}>
                        {person.hits === 1 ? "1 acerto" : `${person.hits} acertos`}
                      </div>
                    </div>
                  </Pop>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Confetti at={100} x={W / 2} y={1040} count={50} />
    </Scene>
  );
}

/* ——— 8. Jeitos de jogar ——— */

export const MODES = 180;

const WAYS = [
  { emoji: "🎁", name: "Clássico", body: "Cada um tira um amigo e capricha no presente." },
  { emoji: "🐆", name: "Amigo da Onça", body: "Vale presente zoeira: a lista é do que a pessoa não quer." },
  { emoji: "🦝", name: "Amigo Ladrão", body: "Na sua vez, abra um presente ou roube o de alguém." },
];

export function Modes() {
  return (
    <Scene
      duration={MODES}
      title="Três jeitos de jogar"
      sub="E a próxima edição já vem pronta, sem repetir os pares."
    >
      <div style={{ position: "absolute", left: 72, right: 72, top: 580 }}>
        {WAYS.map((way, i) => (
          <Pop key={way.name} at={16 + i * 22}>
            <Card style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 26, padding: "26px 32px" }}>
              <div
                style={{
                  flex: "none",
                  display: "grid",
                  placeItems: "center",
                  width: 110,
                  height: 110,
                  borderRadius: 30,
                  background: C.panel,
                  fontSize: 64,
                }}
              >
                {way.emoji}
              </div>
              <div>
                <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.1 }}>{way.name}</div>
                <div style={{ fontSize: 31, color: C.inkSoft, marginTop: 6, lineHeight: 1.25 }}>{way.body}</div>
              </div>
            </Card>
          </Pop>
        ))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14 }}>
          {["Temas de presente sorteados", "Visual de Natal ou de Festa"].map((text, i) => (
            <Pop key={text} at={96 + i * 12}>
              <Chip on style={{ fontSize: 30, padding: "12px 28px" }}>
                {text}
              </Chip>
            </Pop>
          ))}
        </div>
      </div>
    </Scene>
  );
}

/* ——— Encerramento ——— */

export const CLOSING = 150;

export function Closing() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ ...wrap, fontFamily: sans, color: "#fff", opacity: tween(frame, 0, 14) }}>
      <Calm />
      <Snow />
      <Garland y={70} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Pop at={8}>
          <Tag size={104} />
        </Pop>
        <p
          style={{
            margin: "70px 80px 0",
            textAlign: "center",
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            opacity: tween(frame, 24, 42),
            transform: `translateY(${tween(frame, 24, 46, 30, 0)}px)`,
          }}
        >
          Crie o seu grupo
        </p>
        <Pop at={50} style={{ marginTop: 54 }}>
          <div
            style={{
              padding: "24px 50px",
              borderRadius: 999,
              background: "#fff",
              color: C.ink,
              fontSize: 44,
              fontWeight: 800,
              boxShadow: `0 8px 0 ${C.brandDark}`,
            }}
          >
            amigo-secret.vercel.app
          </div>
        </Pop>
        <p style={{ margin: "44px 0 0", fontSize: 36, fontWeight: 600, opacity: tween(frame, 70, 88) * 0.92 }}>
          Leva um minuto para começar.
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const TOTAL = OPENING + CREATE + INVITE + WISHES + DRAW + SLIP + CHAT + PARTY + MODES + CLOSING;
export const SIZE = { width: W, height: H };
