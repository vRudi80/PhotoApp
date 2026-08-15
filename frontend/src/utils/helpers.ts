// Szótár a 3 betűs ISO kódok 2 betűsre alakításához
const iso3ToIso2: Record<string, string> = {
  "AFG":"AF","ALB":"AL","DZA":"DZ","ASM":"AS","AND":"AD","AGO":"AO","AIA":"AI","ATA":"AQ","ATG":"AG","ARG":"AR",
  "ARM":"AM","ABW":"AW","AUS":"AU","AUT":"AT","AZE":"AZ","BHS":"BS","BHR":"BH","BGD":"BD","BRB":"BB","BLR":"BY",
  "BEL":"BE","BLZ":"BZ","BEN":"BJ","BMU":"BM","BTN":"BT","BOL":"BO","BIH":"BA","BWA":"BW","BVT":"BV","BRA":"BR",
  "IOT":"IO","BRN":"BN","BGR":"BG","BFA":"BF","BDI":"BI","CPV":"CV","KHM":"KH","CMR":"CM","CAN":"CA","CYM":"KY",
  "CAF":"CF","TCD":"TD","CHL":"CL","CHN":"CN","CXR":"CX","CCK":"CC","COL":"CO","COM":"KM","COD":"CD","COG":"CG",
  "COK":"CK","CRI":"CR","HRV":"HR","CUB":"CU","CUW":"CW","CYP":"CY","CZE":"CZ","CIV":"CI","DNK":"DK","DJI":"DJ",
  "DMA":"DM","DOM":"DO","ECU":"EC","EGY":"EG","SLV":"SV","GNQ":"GQ","ERI":"ER","EST":"EE","SWZ":"SZ","ETH":"ET",
  "FLK":"FK","FRO":"FO","FJI":"FJ","FIN":"FI","FRA":"FR","GUF":"GF","PYF":"PF","ATF":"TF","GAB":"GA","GMB":"GM",
  "GEO":"GE","DEU":"DE","GHA":"GH","GIB":"GI","GRC":"GR","GRL":"GL","GRD":"GD","GLP":"GP","GUM":"GU","GTM":"GT",
  "GGY":"GG","GIN":"GN","GNB":"GW","GUY":"GY","HTI":"HT","HMD":"HM","VAT":"VA","HND":"HN","HKG":"HK","HUN":"HU",
  "ISL":"IS","IND":"IN","IDN":"ID","IRN":"IR","IRQ":"IQ","IRL":"IE","IMN":"IM","ISR":"IL","ITA":"IT","JAM":"JM",
  "JPN":"JP","JEY":"JE","JOR":"JO","KAZ":"KZ","KEN":"KE","KIR":"KI","PRK":"KP","KOR":"KR","KWT":"KW","KGZ":"KG",
  "LAO":"LA","LVA":"LV","LBN":"LB","LSO":"LS","LBR":"LR","LBY":"LY","LIE":"LI","LTU":"LT","LUX":"LU","MAC":"MO",
  "MDG":"MG","MWI":"MW","MYS":"MY","MDV":"MV","MLI":"ML","MLT":"MT","MHL":"MH","MRT":"MR","MUS":"MU",
  "MYT":"YT","MEX":"MX","FSM":"FM","MDA":"MD","MCO":"MC","MNG":"MN","MNE":"ME","MSR":"MS","MAR":"MA","MOZ":"MZ",
  "MMR":"MM","NAM":"NA","NRU":"NR","NPL":"NP","NLD":"NL","NCL":"NC","NZL":"NZ","NIC":"NI","NER":"NE","NGA":"NG",
  "NIU":"NU","NFK":"NF","MNP":"MP","NOR":"NO","OMN":"OM","PAK":"PK","PLW":"PW","PSE":"PS","PAN":"PA","PNG":"PG",
  "PRY":"PY","PER":"PE","PHL":"PH","PCN":"PN","POL":"PL","PRT":"PT","PRI":"PR","QAT":"QA","MKD":"MK","ROU":"RO",
  "RUS":"RU","RWA":"RW","REU":"RE","BLM":"BL","SHN":"SH","KNA":"KN","LCA":"LC","MAF":"MF","SPM":"PM","VCT":"VC",
  "WSM":"WS","SMR":"SM","STP":"ST","SAU":"SA","SEN":"SN","SRB":"RS","SYC":"SC","SLE":"SL","SGP":"SG","SXM":"SX",
  "SVK":"SK","SVN":"SI","SLB":"SB","SOM":"SO","ZAF":"ZA","SGS":"GS","SSD":"SS","ESP":"ES","LKA":"LK","SDN":"SD",
  "SUR":"SR","SJM":"SJ","SWE":"SE","CHE":"CH","SYR":"SY","TWN":"TW","TJK":"TJ","TZA":"TZ","THA":"TH","TLS":"TL",
  "TGO":"TG","TKL":"TK","TON":"TO","TTO":"TT","TUN":"TN","TUR":"TR","TKM":"TM","TCA":"TC","TUV":"TV","UGA":"UG",
  "UKR":"UA","ARE":"AE","GBR":"GB","USA":"US","UMI":"UM","URY":"UY","UZB":"UZ","VUT":"VU","VEN":"VE","VNM":"VN",
  "VGB":"VG","VIR":"VI","WLF":"WF","ESH":"EH","YEM":"YE","ZMB":"ZM","ZWE":"ZW"
};

export function getFlagEmoji(countryCode: string) {
  if (!countryCode) return '🏳️';
  let cleanCode = countryCode.trim().toUpperCase();
  if (cleanCode.length === 3) {
    cleanCode = iso3ToIso2[cleanCode] || cleanCode;
  }
  if (cleanCode.length !== 2) return '🏳️';
  try {
    const codePoints = cleanCode.split('').map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return '🏳️';
  }
}

export function getFlagImageUrl(countryCode: string): string {
  if (!countryCode) return '';
  let cleanCode = countryCode.trim().toUpperCase();
  if (cleanCode.length === 3) {
    cleanCode = iso3ToIso2[cleanCode] || cleanCode;
  }
  if (cleanCode.length !== 2) return '';
  return `https://flagcdn.com/w40/${cleanCode.toLowerCase()}.png`;
}

// 🎯 Okos kép URL generáló: Kinyeri a Drive ID-t a file_url mezőből is, ha a drive_file_id NULL
export function getImageUrl(driveFileIdOrPhoto?: any, fileUrl?: string): string {
  let driveId: string | null = null;
  let directUrl: string | null = null;

  // 1. Paraméterek feldolgozása (objektum vagy külön paraméterek)
  if (typeof driveFileIdOrPhoto === 'object' && driveFileIdOrPhoto !== null) {
    driveId = driveFileIdOrPhoto.drive_file_id || null;
    directUrl = driveFileIdOrPhoto.file_url || driveFileIdOrPhoto.url || null;
  } else {
    driveId = driveFileIdOrPhoto || null;
    directUrl = fileUrl || null;
  }

  // 2. Ha nincs drive_file_id, de a file_url Google Drive hivatkozást tartalmaz (/file/d/ID, ?id=ID, uc?id=ID)
  if ((!driveId || driveId === 'migrated' || driveId === 'null') && directUrl) {
    if (directUrl.includes('drive.google.com')) {
      const matchFileD = directUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const matchQueryId = directUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);

      if (matchFileD && matchFileD[1]) {
        driveId = matchFileD[1];
      } else if (matchQueryId && matchQueryId[1]) {
        driveId = matchQueryId[1];
      }
    }
  }

  // 3. Érvényes Google Drive azonosító esetén közvetlen lh3 képlink képzése
  if (
    driveId &&
    typeof driveId === 'string' &&
    driveId !== 'null' &&
    driveId !== 'undefined' &&
    driveId !== 'migrated' &&
    driveId.trim().length > 10 &&
    !driveId.startsWith('http')
  ) {
    return `https://lh3.googleusercontent.com/d/${driveId.trim()}`;
  }

  // 4. Cloudinary képek optimalizálása
  if (directUrl && directUrl.includes('cloudinary.com')) {
    return directUrl.replace('/upload/', '/upload/f_auto,q_auto,w_1000,c_limit/');
  }

  // 5. Egyéb közvetlen képlinkek (pl. lh3.googleusercontent.com, OneDrive) vagy hiányzó kép esetén tartalék
  return directUrl || 'https://placehold.co/400x300/1e293b/64748b?text=K%C3%A9p+nem+tal%C3%A1lhat%C3%B3';
}

export function getYouTubeEmbed(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}
