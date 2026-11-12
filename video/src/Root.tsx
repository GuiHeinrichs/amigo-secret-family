import { Composition, Html5Audio, interpolate, Series, staticFile } from "remotion";
import {
  Chat,
  CHAT,
  Closing,
  CLOSING,
  Create,
  CREATE,
  Draw,
  DRAW,
  Invite,
  INVITE,
  Modes,
  MODES,
  Opening,
  OPENING,
  Party,
  PARTY,
  SIZE,
  Slip,
  SLIP,
  TOTAL,
  Wishes,
  WISHES,
} from "./scenes";

const FPS = 30;

/** Apresentação do Laço: uma cena por funcionalidade, com a trilha por baixo. */
function Apresentacao() {
  return (
    <>
      <Html5Audio
        src={staticFile("trilha.wav")}
        volume={(frame) =>
          interpolate(frame, [0, 20, TOTAL - 75, TOTAL - 5], [0, 0.85, 0.85, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      <Series>
        <Series.Sequence durationInFrames={OPENING}>
          <Opening />
        </Series.Sequence>
        <Series.Sequence durationInFrames={CREATE}>
          <Create />
        </Series.Sequence>
        <Series.Sequence durationInFrames={INVITE}>
          <Invite />
        </Series.Sequence>
        <Series.Sequence durationInFrames={WISHES}>
          <Wishes />
        </Series.Sequence>
        <Series.Sequence durationInFrames={DRAW}>
          <Draw />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SLIP}>
          <Slip />
        </Series.Sequence>
        <Series.Sequence durationInFrames={CHAT}>
          <Chat />
        </Series.Sequence>
        <Series.Sequence durationInFrames={PARTY}>
          <Party />
        </Series.Sequence>
        <Series.Sequence durationInFrames={MODES}>
          <Modes />
        </Series.Sequence>
        <Series.Sequence durationInFrames={CLOSING}>
          <Closing />
        </Series.Sequence>
      </Series>
    </>
  );
}

export function Root() {
  return (
    <Composition
      id="Apresentacao"
      component={Apresentacao}
      durationInFrames={TOTAL}
      fps={FPS}
      width={SIZE.width}
      height={SIZE.height}
    />
  );
}
