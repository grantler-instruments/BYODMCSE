import { el, ElemNode } from "@elemaudio/core";
import { v4 as uuidv4 } from "uuid";

abstract class Base {
  id: string;

  constructor(id: string) {
    this.id = id;
  }

  protected findVoiceForNote(voices: any[], note: number) {
    return voices.find((v) => v.note === note || v.pendingNote === note);
  }

  protected releaseVoice(voice: any) {
    voice.gate = 0;
    voice.pendingTrigger = false;
    delete voice.pendingNote;
    delete voice.pendingVelocity;
  }

  abstract noteOn(note: number, velocity: number): void;
  abstract noteOff(note: number, velocity: number): void;
  abstract render(): ElemNode;
}
export default Base;
