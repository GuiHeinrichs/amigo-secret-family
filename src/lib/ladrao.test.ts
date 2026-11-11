import { describe, expect, it } from "vitest";
import {
  canSteal,
  currentPlayer,
  isLocked,
  isOver,
  open,
  steal,
  type LadraoState,
} from "./ladrao";

const start = (): LadraoState => ({
  order: ["ana", "bia", "caio"],
  turn: 0,
  pendingId: null,
  lastStolenGiftId: null,
  maxSteals: 2,
  gifts: [
    { id: "g1", holderId: null, steals: 0 },
    { id: "g2", holderId: null, steals: 0 },
    { id: "g3", holderId: null, steals: 0 },
  ],
});

describe("amigo ladrão", () => {
  it("abrir um presente passa a vez", () => {
    const s = open(start(), "g1");
    expect(s.gifts[0].holderId).toBe("ana");
    expect(currentPlayer(s)).toBe("bia");
  });

  it("quem é roubado joga em seguida, e a fila só anda quando alguém abre", () => {
    let s = open(start(), "g1"); // ana abre g1
    s = steal(s, "g1"); // bia rouba g1 da ana
    expect(s.gifts[0]).toMatchObject({ holderId: "bia", steals: 1 });
    expect(currentPlayer(s)).toBe("ana");
    expect(s.turn).toBe(1);
    s = open(s, "g2"); // ana abre g2
    expect(currentPlayer(s)).toBe("caio");
    expect(s.turn).toBe(2);
  });

  it("não deixa roubar de volta na hora o presente que acabou de perder", () => {
    let s = open(start(), "g1");
    s = steal(s, "g1");
    expect(canSteal(s, "g1")).toBe(false);
    expect(() => steal(s, "g1")).toThrow();
  });

  it("tranca o presente depois do limite de roubos", () => {
    let s = open(start(), "g1"); // ana: g1
    s = steal(s, "g1"); // bia rouba (1)
    s = open(s, "g2"); // ana: g2
    s = steal(s, "g1"); // caio rouba g1 (2) → trancado
    const g1 = s.gifts[0];
    expect(isLocked(s, g1)).toBe(true);
    expect(currentPlayer(s)).toBe("bia");
    expect(canSteal(s, "g1")).toBe(false);
    expect(canSteal(s, "g2")).toBe(true);
  });

  it("não deixa roubar o próprio presente nem um ainda fechado", () => {
    const s = open(start(), "g1");
    expect(canSteal(s, "g2")).toBe(false);
    const again = { ...s, turn: 0 };
    expect(canSteal(again, "g1")).toBe(false);
  });

  it("termina quando todos da fila têm presente", () => {
    let s = start();
    s = open(s, "g1");
    s = open(s, "g2");
    expect(isOver(s)).toBe(false);
    s = open(s, "g3");
    expect(isOver(s)).toBe(true);
    expect(currentPlayer(s)).toBeNull();
    expect(() => open(s, "g3")).toThrow();
  });
});
