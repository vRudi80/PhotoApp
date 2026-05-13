// Okosított zászló generáló
export function getFlagEmoji(countryCode: string) {
  if (!countryCode || countryCode.length !== 2) return null;
  const codePoints = countryCode.toUpperCase().split('').map(char =>  127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Központi kép URL generáló Google Drive-hoz
export function getImageUrl(driveFileId?: string | null, fileUrl?: string) {
  if (driveFileId) {
    // Kijavítva: dollárjel hozzáadva a változó beillesztéséhez!
    // Használhatjuk a hivatalos Google Drive thumbnail URL-t is, ami sokkal megbízhatóbb:
    return `https://drive.google.com/uc?export=view&id=${driveFileId}`;
  }
  return fileUrl || '';
}

// YouTube URL átalakító
export function getYouTubeEmbed(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}
