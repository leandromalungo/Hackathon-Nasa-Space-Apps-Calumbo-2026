export interface AngolaProvince {
  name: string;
  capital: string;
  lat: number;
  lng: number;
  municipalities: string[];
  agroZone: string;
}

export const ANGOLA_PROVINCES: AngolaProvince[] = [
  {
    name: 'Huambo',
    capital: 'Huambo',
    lat: -12.7761,
    lng: 15.7392,
    municipalities: ['Caála', 'Huambo', 'Bailundo', 'Ecunha', 'Londuimbali', 'Longonjo', 'Mungo', 'Chicala-Choloanga', 'Chinjenje', 'Ucuma', 'Catchiungo'],
    agroZone: 'Planalto Central (Altitude)',
  },
  {
    name: 'Uíge',
    capital: 'Uíge',
    lat: -7.6087,
    lng: 15.0613,
    municipalities: ['Uíge', 'Negage', 'Maquela do Zombo', 'Sanza Pombo', 'Damba', 'Quitexe', 'Mucaba', 'Puri', 'Bungo', 'Bembe'],
    agroZone: 'Norte Sub-húmido (Kikongo)',
  },
  {
    name: 'Zaire',
    capital: 'Mbanza Kongo',
    lat: -6.267,
    lng: 14.2401,
    municipalities: ['Mbanza Kongo', 'Soyo', 'Nzeto', 'Tomboco', 'Cuimba', 'Nóqui'],
    agroZone: 'Norte Litoral & Interior (Kikongo)',
  },
  {
    name: 'Cabinda',
    capital: 'Cabinda',
    lat: -5.55,
    lng: 12.2,
    municipalities: ['Cabinda', 'Cacongo', 'Buco-Zau', 'Belize'],
    agroZone: 'Floresta Tropical Húmida',
  },
  {
    name: 'Cuanza Sul',
    capital: 'Sumbe',
    lat: -11.2061,
    lng: 13.8437,
    municipalities: ['Waku Kungo', 'Sumbe', 'Porto Amboim', 'Gabela', 'Quibala', 'Calulo', 'Cassongue', 'Seles', 'Ebo'],
    agroZone: 'Transição Litoral–Planalto',
  },
  {
    name: 'Cuanza Norte',
    capital: 'Ndalatando',
    lat: -9.2978,
    lng: 14.9116,
    municipalities: ['Cazengo', 'Cambambe', 'Golungo Alto', 'Lucala', 'Ambaca', 'Samba Cajú', 'Quiculungo'],
    agroZone: 'Vale do Cuanza & Café',
  },
  {
    name: 'Luanda',
    capital: 'Luanda',
    lat: -8.8383,
    lng: 13.2344,
    municipalities: ['Viana', 'Cacuaco', 'Icolo e Bengo', 'Quiçama', 'Belas', 'Cazenga', 'Kilamba Kiaxi'],
    agroZone: 'Cintura Periurbana & Baixo Bengo',
  },
  {
    name: 'Bengo',
    capital: 'Caxito',
    lat: -8.5785,
    lng: 13.6643,
    municipalities: ['Dande', 'Ambriz', 'Bula Atumba', 'Dembos', 'Nambuangongo', 'Pango Aluquém'],
    agroZone: 'Vale do Dande & Bengo',
  },
  {
    name: 'Benguela',
    capital: 'Benguela',
    lat: -12.5763,
    lng: 13.4055,
    municipalities: ['Benguela', 'Lobito', 'Catumbela', 'Baía Farta', 'Cubal', 'Ganda', 'Bocoio', 'Balombo', 'Caimbambo'],
    agroZone: 'Litoral Semiárido & Encosta',
  },
  {
    name: 'Huíla',
    capital: 'Lubango',
    lat: -14.9172,
    lng: 13.4925,
    municipalities: ['Lubango', 'Humpata', 'Chibia', 'Matala', 'Caluquembe', 'Caconda', 'Quipungo', 'Chicomba'],
    agroZone: 'Planalto Sul & Perímetro Irrigado da Matala',
  },
  {
    name: 'Bié',
    capital: 'Cuito',
    lat: -12.3833,
    lng: 16.9333,
    municipalities: ['Cuito', 'Andulo', 'Camacupa', 'Catabola', 'Chinguar', 'Chitembo', 'Cuemba', 'Cunhinga', 'Nharea'],
    agroZone: 'Planalto Central Oriental',
  },
  {
    name: 'Malanje',
    capital: 'Malanje',
    lat: -9.5402,
    lng: 16.341,
    municipalities: ['Malanje', 'Cacuso', 'Calandula', 'Cangandala', 'Caombo', 'Kiwaba Nzoji', 'Marimba', 'Quela'],
    agroZone: 'Savana Húmeda & Baixa de Cassanje',
  },
  {
    name: 'Moxico',
    capital: 'Luena',
    lat: -11.7833,
    lng: 19.9167,
    municipalities: ['Moxico (Luena)', 'Alto Zambeze', 'Bundas', 'Camanongue', 'Léua', 'Luacano', 'Luchazes'],
    agroZone: 'Leste Areias do Kalahari',
  },
  {
    name: 'Lunda Norte',
    capital: 'Dundo',
    lat: -7.3833,
    lng: 20.8333,
    municipalities: ['Chitato', 'Cambulo', 'Cuango', 'Capenda-Camulemba', 'Lubalo', 'Lucapa'],
    agroZone: 'Nordeste Fluvial',
  },
  {
    name: 'Lunda Sul',
    capital: 'Saurimo',
    lat: -9.6608,
    lng: 20.3916,
    municipalities: ['Saurimo', 'Cacolo', 'Dala', 'Muconda'],
    agroZone: 'Planalto Leste',
  },
  {
    name: 'Cunene',
    capital: 'Ondjiva',
    lat: -17.0667,
    lng: 15.7333,
    municipalities: ['Cuanhama', 'Cahama', 'Curoca', 'Cuvelai', 'Namacunde', 'Ombadja'],
    agroZone: 'Semiárido Sul (Risco de Seca)',
  },
  {
    name: 'Namibe',
    capital: 'Moçâmedes',
    lat: -15.1961,
    lng: 12.1522,
    municipalities: ['Moçâmedes', 'Bibala', 'Camucuio', 'Tômbwa', 'Virei'],
    agroZone: 'Árido Litoral & Oásis',
  },
  {
    name: 'Cuando Cubango',
    capital: 'Menongue',
    lat: -14.6585,
    lng: 17.691,
    municipalities: ['Menongue', 'Cuito Cuanavale', 'Calai', 'Cuangar', 'Dirico', 'Mavinga', 'Nancova', 'Rivungo'],
    agroZone: 'Sudeste Fluvial & Transição',
  },
];

export interface CropCatalogItem {
  id: string;
  namePt: string;
  nameEn: string;
  nameKg: string;
  cycleDays: number;
  optimalTempMin: number;
  optimalTempMax: number;
  waterNeedNotePt: string;
}

export const ANGOLA_CROPS: CropCatalogItem[] = [
  {
    id: 'tomate',
    namePt: 'Tomate',
    nameEn: 'Tomato',
    nameKg: 'Tomate',
    cycleDays: 85,
    optimalTempMin: 18,
    optimalTempMax: 28,
    waterNeedNotePt: 'Rega regular na base sem molhar folhas; sensível a encharcamento e calor forte na floração.',
  },
];

export function findProvince(name: string): AngolaProvince {
  return ANGOLA_PROVINCES.find((p) => p.name === name) || ANGOLA_PROVINCES[0];
}
