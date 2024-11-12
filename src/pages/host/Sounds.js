import lobbyOst from '../../assets/lobby-ost.mp3';

const GLOBAL_VOLUME = 0.25;

export function playBackgroundMusic() {
  const backgroundMusic = new Audio(lobbyOst);
  backgroundMusic.loop = true; // Loop background music
  backgroundMusic.volume = GLOBAL_VOLUME / 6;
  backgroundMusic.play();
}

export function playPunchSound() {
  playSound("sound-punch");
}

export function playPunchHitSound() {
  playSound("sound-punch-hit");
}

export function playShakeSound() {
  playSound("sound-shake");
}

export function playWooYeahSound() {
  playSound("sound-woo-yeah");
}

function playSound(elementId) {
  const sound = document.getElementById(elementId);
  sound.volume = GLOBAL_VOLUME;
  sound.play();
}

export function speakText(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  // utterance.lang = "en-GB";
  utterance.rate = 1.2;
  // utterance.pitch = 2;
  utterance.volume = 0.25;
  window.speechSynthesis.speak(utterance);
}
