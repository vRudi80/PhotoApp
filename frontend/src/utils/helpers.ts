// Okosított zászló generáló
export function getFlagEmoji(countryCode: string) {
  if (!countryCode || countryCode.length !== 2) return null;
  const codePoints = countryCode.toUpperCase().split('').map(char =>  127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}


// --- JAVÍTÁS: Központi kép URL generáló Google Drive-hoz ---
function getImageUrl(driveFileId?: string | null, fileUrl?: string) {
  if (driveFileId) {
    return `https://lh3.googleusercontent.com/d/${driveFileId}`;
  }
  return fileUrl || '';
}

// YouTube URL átalakító
export function getYouTubeEmbed(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}
