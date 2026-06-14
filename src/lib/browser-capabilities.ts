export type BrowserPlatform =
  | "mac"
  | "windows"
  | "ios"
  | "android"
  | "linux"
  | "unknown";

export type BrowserCapabilities = {
  isClient: boolean;
  platform: BrowserPlatform;
  speechRecognition: boolean;
  speechSynthesis: boolean;
  webAudio: boolean;
};

export type SpeechRecognitionResultEventLike = {
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
};

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
export type AudioContextConstructor = new (
  contextOptions?: AudioContextOptions,
) => AudioContext;

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

type BrowserWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitAudioContext?: AudioContextConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

export function detectPlatformFamily({
  platform,
  userAgent,
  userAgentDataPlatform,
}: {
  platform?: string;
  userAgent?: string;
  userAgentDataPlatform?: string;
}): BrowserPlatform {
  const signal = `${userAgentDataPlatform ?? ""} ${platform ?? ""} ${
    userAgent ?? ""
  }`.toLowerCase();

  if (/iphone|ipad|ipod/.test(signal)) {
    return "ios";
  }

  if (/mac|darwin/.test(signal)) {
    return "mac";
  }

  if (/win/.test(signal)) {
    return "windows";
  }

  if (/android/.test(signal)) {
    return "android";
  }

  if (/linux|x11/.test(signal)) {
    return "linux";
  }

  return "unknown";
}

export function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const browserWindow = window as BrowserWindow;
  return browserWindow.AudioContext ?? browserWindow.webkitAudioContext ?? null;
}

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const browserWindow = window as BrowserWindow;
  return (
    browserWindow.SpeechRecognition ??
    browserWindow.webkitSpeechRecognition ??
    null
  );
}

export function getBrowserCapabilities(): BrowserCapabilities {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      isClient: false,
      platform: "unknown",
      speechRecognition: false,
      speechSynthesis: false,
      webAudio: false,
    };
  }

  const navigatorWithUserAgentData = navigator as NavigatorWithUserAgentData;

  return {
    isClient: true,
    platform: detectPlatformFamily({
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      userAgentDataPlatform: navigatorWithUserAgentData.userAgentData?.platform,
    }),
    speechRecognition: Boolean(getSpeechRecognitionConstructor()),
    speechSynthesis: "speechSynthesis" in window,
    webAudio: Boolean(getAudioContextConstructor()),
  };
}
