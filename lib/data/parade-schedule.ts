// Parade schedule data for Carnaval 2026 - Anhembi
// Source: Liga das Escolas de Samba (official schedule)
// Event dates: February 13-15, 2026

export interface SambaSchool {
  id: string;
  name: string;
  shortName: string;
  colors: string[]; // Primary and secondary colors
  colorClasses: {
    bg: string;
    text: string;
    border: string;
  };
  neighborhood: string;
  founded: number;
  championships: number;
}

export interface ParadeEntry {
  id: string;
  school: SambaSchool;
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:mm format (24h)
  estimatedDuration: number; // minutes
  order: number; // parade order (1-7)
  group: "especial" | "acesso";
}

export const sambaSchools: SambaSchool[] = [
  {
    id: "vai-vai",
    name: "Vai-Vai",
    shortName: "Vai-Vai",
    colors: ["#000000", "#FFFFFF"],
    colorClasses: {
      bg: "bg-neutral-900",
      text: "text-white",
      border: "border-neutral-700",
    },
    neighborhood: "Bela Vista",
    founded: 1930,
    championships: 15,
  },
  {
    id: "mancha-verde",
    name: "Mancha Verde",
    shortName: "Mancha",
    colors: ["#008000", "#FFFFFF"],
    colorClasses: {
      bg: "bg-green-700",
      text: "text-white",
      border: "border-green-600",
    },
    neighborhood: "Barra Funda",
    founded: 1995,
    championships: 1,
  },
  {
    id: "gavioes",
    name: "Gavioes da Fiel",
    shortName: "Gavioes",
    colors: ["#000000", "#FFFFFF"],
    colorClasses: {
      bg: "bg-neutral-800",
      text: "text-white",
      border: "border-neutral-600",
    },
    neighborhood: "Bom Retiro",
    founded: 1969,
    championships: 6,
  },
  {
    id: "mocidade",
    name: "Mocidade Alegre",
    shortName: "Mocidade",
    colors: ["#FF0000", "#FFFFFF", "#008000"],
    colorClasses: {
      bg: "bg-red-600",
      text: "text-white",
      border: "border-red-500",
    },
    neighborhood: "Limao",
    founded: 1950,
    championships: 11,
  },
  {
    id: "aguia-ouro",
    name: "Aguia de Ouro",
    shortName: "Aguia",
    colors: ["#FFD700", "#1E3A5F"],
    colorClasses: {
      bg: "bg-yellow-500",
      text: "text-blue-900",
      border: "border-yellow-400",
    },
    neighborhood: "Pompeia",
    founded: 1976,
    championships: 1,
  },
  {
    id: "rosas-de-ouro",
    name: "Rosas de Ouro",
    shortName: "Rosas",
    colors: ["#FFD700", "#FFFFFF"],
    colorClasses: {
      bg: "bg-yellow-400",
      text: "text-neutral-900",
      border: "border-yellow-300",
    },
    neighborhood: "Freguesia do O",
    founded: 1965,
    championships: 7,
  },
  {
    id: "dragoes-da-real",
    name: "Dragoes da Real",
    shortName: "Dragoes",
    colors: ["#FF0000", "#FFD700"],
    colorClasses: {
      bg: "bg-red-500",
      text: "text-yellow-400",
      border: "border-red-400",
    },
    neighborhood: "Santa Cecilia",
    founded: 1999,
    championships: 0,
  },
  {
    id: "x9-paulistana",
    name: "X-9 Paulistana",
    shortName: "X-9",
    colors: ["#000080", "#FFFFFF"],
    colorClasses: {
      bg: "bg-blue-900",
      text: "text-white",
      border: "border-blue-700",
    },
    neighborhood: "Vila Mariana",
    founded: 1975,
    championships: 1,
  },
  {
    id: "perola-negra",
    name: "Perola Negra",
    shortName: "Perola",
    colors: ["#000000", "#C0C0C0"],
    colorClasses: {
      bg: "bg-neutral-900",
      text: "text-neutral-300",
      border: "border-neutral-700",
    },
    neighborhood: "Brasilandia",
    founded: 1973,
    championships: 0,
  },
  {
    id: "imperio-de-casa-verde",
    name: "Imperio de Casa Verde",
    shortName: "Imperio",
    colors: ["#008000", "#FFFFFF"],
    colorClasses: {
      bg: "bg-emerald-700",
      text: "text-white",
      border: "border-emerald-600",
    },
    neighborhood: "Casa Verde",
    founded: 1979,
    championships: 2,
  },
  {
    id: "camisa-verde-branco",
    name: "Camisa Verde e Branco",
    shortName: "Camisa Verde",
    colors: ["#008000", "#FFFFFF"],
    colorClasses: {
      bg: "bg-green-600",
      text: "text-white",
      border: "border-green-500",
    },
    neighborhood: "Barra Funda",
    founded: 1953,
    championships: 5,
  },
  {
    id: "tom-maior",
    name: "Tom Maior",
    shortName: "Tom Maior",
    colors: ["#FF0000", "#0000FF", "#FFD700"],
    colorClasses: {
      bg: "bg-red-600",
      text: "text-yellow-300",
      border: "border-red-500",
    },
    neighborhood: "Sao Miguel Paulista",
    founded: 1984,
    championships: 0,
  },
  {
    id: "colorado-do-bras",
    name: "Colorado do Bras",
    shortName: "Colorado",
    colors: ["#FF0000", "#FFFFFF"],
    colorClasses: {
      bg: "bg-red-700",
      text: "text-white",
      border: "border-red-600",
    },
    neighborhood: "Bras",
    founded: 1943,
    championships: 1,
  },
  {
    id: "nene-de-vila-matilde",
    name: "Nene de Vila Matilde",
    shortName: "Nene",
    colors: ["#FF0000", "#FFFFFF"],
    colorClasses: {
      bg: "bg-rose-600",
      text: "text-white",
      border: "border-rose-500",
    },
    neighborhood: "Vila Matilde",
    founded: 1949,
    championships: 5,
  },
];

// Helper to find a school by ID
const findSchool = (id: string): SambaSchool => {
  const school = sambaSchools.find((s) => s.id === id);
  if (!school) throw new Error(`School not found: ${id}`);
  return school;
};

// Parade schedule for February 13-15, 2026
// Times are approximate and follow typical Anhembi schedule
export const paradeSchedule: ParadeEntry[] = [
  // Day 1 - February 13, 2026 (Friday)
  {
    id: "d1-1",
    school: findSchool("colorado-do-bras"),
    date: "2026-02-13",
    startTime: "21:30",
    estimatedDuration: 65,
    order: 1,
    group: "especial",
  },
  {
    id: "d1-2",
    school: findSchool("dragoes-da-real"),
    date: "2026-02-13",
    startTime: "22:45",
    estimatedDuration: 65,
    order: 2,
    group: "especial",
  },
  {
    id: "d1-3",
    school: findSchool("tom-maior"),
    date: "2026-02-13",
    startTime: "00:00",
    estimatedDuration: 65,
    order: 3,
    group: "especial",
  },
  {
    id: "d1-4",
    school: findSchool("perola-negra"),
    date: "2026-02-13",
    startTime: "01:15",
    estimatedDuration: 65,
    order: 4,
    group: "especial",
  },
  {
    id: "d1-5",
    school: findSchool("rosas-de-ouro"),
    date: "2026-02-13",
    startTime: "02:30",
    estimatedDuration: 65,
    order: 5,
    group: "especial",
  },
  {
    id: "d1-6",
    school: findSchool("x9-paulistana"),
    date: "2026-02-13",
    startTime: "03:45",
    estimatedDuration: 65,
    order: 6,
    group: "especial",
  },
  {
    id: "d1-7",
    school: findSchool("imperio-de-casa-verde"),
    date: "2026-02-13",
    startTime: "05:00",
    estimatedDuration: 65,
    order: 7,
    group: "especial",
  },

  // Day 2 - February 14, 2026 (Saturday)
  {
    id: "d2-1",
    school: findSchool("camisa-verde-branco"),
    date: "2026-02-14",
    startTime: "21:30",
    estimatedDuration: 65,
    order: 1,
    group: "especial",
  },
  {
    id: "d2-2",
    school: findSchool("nene-de-vila-matilde"),
    date: "2026-02-14",
    startTime: "22:45",
    estimatedDuration: 65,
    order: 2,
    group: "especial",
  },
  {
    id: "d2-3",
    school: findSchool("mancha-verde"),
    date: "2026-02-14",
    startTime: "00:00",
    estimatedDuration: 65,
    order: 3,
    group: "especial",
  },
  {
    id: "d2-4",
    school: findSchool("aguia-ouro"),
    date: "2026-02-14",
    startTime: "01:15",
    estimatedDuration: 65,
    order: 4,
    group: "especial",
  },
  {
    id: "d2-5",
    school: findSchool("gavioes"),
    date: "2026-02-14",
    startTime: "02:30",
    estimatedDuration: 65,
    order: 5,
    group: "especial",
  },
  {
    id: "d2-6",
    school: findSchool("mocidade"),
    date: "2026-02-14",
    startTime: "03:45",
    estimatedDuration: 65,
    order: 6,
    group: "especial",
  },
  {
    id: "d2-7",
    school: findSchool("vai-vai"),
    date: "2026-02-14",
    startTime: "05:00",
    estimatedDuration: 65,
    order: 7,
    group: "especial",
  },
];

// Helper functions
export function getParadesByDate(date: string): ParadeEntry[] {
  return paradeSchedule.filter((p) => p.date === date).sort((a, b) => a.order - b.order);
}

export function getNextParade(now: Date = new Date()): ParadeEntry | null {
  const sortedParades = [...paradeSchedule].sort((a, b) => {
    const dateA = getParadeDateTime(a);
    const dateB = getParadeDateTime(b);
    return dateA.getTime() - dateB.getTime();
  });

  return sortedParades.find((p) => {
    const paradeTime = getParadeDateTime(p);
    const paradeEnd = new Date(paradeTime.getTime() + p.estimatedDuration * 60 * 1000);
    return paradeEnd > now;
  }) || null;
}

export function getCurrentParade(now: Date = new Date()): ParadeEntry | null {
  return paradeSchedule.find((p) => {
    const paradeStart = getParadeDateTime(p);
    const paradeEnd = new Date(paradeStart.getTime() + p.estimatedDuration * 60 * 1000);
    return now >= paradeStart && now < paradeEnd;
  }) || null;
}

export function getParadeDateTime(parade: ParadeEntry): Date {
  const [hours, minutes] = parade.startTime.split(":").map(Number);
  const date = new Date(parade.date);

  // Handle times after midnight (00:00 - 05:59) which belong to the next calendar day
  if (hours < 12) {
    date.setDate(date.getDate() + 1);
  }

  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  return `${hour.toString().padStart(2, "0")}:${minutes}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export const EVENT_DATES = {
  day1: "2026-02-13",
  day2: "2026-02-14",
  day3: "2026-02-15",
};
