import { onBeforeUnmount, ref } from 'vue';

export interface UseTtsOptions {
  /** Idioma BCP-47 por defecto */
  lang?: string;
  onEnd?: () => void;
}

/** Text-to-Speech con Web Speech API. */
export function useTts(options: UseTtsOptions = {}) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const speaking = ref(false);
  const paused = ref(false);
  const rate = ref(1);

  function speak(text: string): void {
    if (!supported || !text.trim()) return;
    stop();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate.value;
    utterance.lang = options.lang ?? 'es-ES';
    utterance.onend = () => {
      speaking.value = false;
      paused.value = false;
      options.onEnd?.();
    };
    utterance.onerror = () => {
      speaking.value = false;
      paused.value = false;
    };
    window.speechSynthesis.speak(utterance);
    speaking.value = true;
    paused.value = false;
  }

  function pause(): void {
    if (!supported || !speaking.value) return;
    window.speechSynthesis.pause();
    paused.value = true;
  }

  function resume(): void {
    if (!supported || !paused.value) return;
    window.speechSynthesis.resume();
    paused.value = false;
  }

  function stop(): void {
    if (!supported) return;
    window.speechSynthesis.cancel();
    speaking.value = false;
    paused.value = false;
  }

  onBeforeUnmount(stop);

  return { supported, speaking, paused, rate, speak, pause, resume, stop };
}
