// Zászló generáló
export function getFlagEmoji(countryCode: string) {
  if (!countryCode || countryCode.length !== 2) return null;
  const codePoints = countryCode.toUpperCase().split('').map(char =>  127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Drive vagy URL kép beolvasó
export function getImageUrl(driveFileId?: string | null, fileUrl?: string) {
  if (driveFileId) {
    return `https://lh3.googleusercontent.com/d/$${driveFileId}`;
  }
  return fileUrl || '';
}

// YouTube link átalakító beágyazáshoz
export const getYouTubeEmbed = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
};
