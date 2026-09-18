/**
 * Módulo de Calendário de Dias Úteis e Feriados Nacionais Brasileiros
 * Padrão ANBIMA / B3 / Banco Central (Convenção 252 dias úteis por ano)
 */

/**
 * Calcula a data do Domingo de Páscoa para qualquer ano usando o algoritmo anônimo de Meeus/Jones/Butcher.
 * Retorna [mês (1-12), dia (1-31)]
 */
export function getEasterDate(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Adiciona ou subtrai dias de uma data (ano, mês 1-12, dia 1-31)
 */
function addDaysToDate(year: number, month: number, day: number, daysToAdd: number): string {
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + daysToAdd);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dt = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

/**
 * Retorna um mapa de todos os feriados nacionais brasileiros para o ano especificado.
 * Formato da chave: "YYYY-MM-DD", valor: Nome do Feriado.
 */
export function getNationalHolidays(year: number): Record<string, string> {
  const holidays: Record<string, string> = {};

  // Feriados Nacionais Fixos (Leis 662/1949, 6.802/1980, 10.607/2002, 14.759/2023)
  const yStr = String(year);
  holidays[`${yStr}-01-01`] = "Confraternização Universal (Ano Novo)";
  holidays[`${yStr}-04-21`] = "Tiradentes";
  holidays[`${yStr}-05-01`] = "Dia do Trabalho";
  holidays[`${yStr}-09-07`] = "Independência do Brasil";
  holidays[`${yStr}-10-12`] = "Nossa Senhora Aparecida";
  holidays[`${yStr}-11-02`] = "Finados";
  holidays[`${yStr}-11-15`] = "Proclamação da República";
  holidays[`${yStr}-11-20`] = "Dia Nacional de Zumbi e da Consciência Negra";
  holidays[`${yStr}-12-25`] = "Natal";

  // Feriados Nacionais Móveis baseados na Páscoa
  const easter = getEasterDate(year);

  // Carnaval: Segunda-feira (-48 dias) e Terça-feira (-47 dias)
  holidays[addDaysToDate(year, easter.month, easter.day, -48)] = "Carnaval (Segunda-feira)";
  holidays[addDaysToDate(year, easter.month, easter.day, -47)] = "Carnaval (Terça-feira)";

  // Sexta-feira Santa / Paixão de Cristo (-2 dias)
  holidays[addDaysToDate(year, easter.month, easter.day, -2)] = "Sexta-feira Santa (Paixão de Cristo)";

  // Corpus Christi (+60 dias)
  holidays[addDaysToDate(year, easter.month, easter.day, 60)] = "Corpus Christi";

  // Último dia útil do ano (Sem expediente bancário ao público - Resolução CMN/Bacen)
  const dec31 = new Date(Date.UTC(year, 11, 31));
  const dec31Day = dec31.getUTCDay(); // 0=Dom, 6=Sab
  if (dec31Day === 0) {
    const dec29 = new Date(Date.UTC(year, 11, 29));
    if (dec29.getUTCDay() === 5) {
      holidays[`${yStr}-12-29`] = "Sem Expediente Bancário (Fim de Ano)";
    }
  } else if (dec31Day === 6) {
    holidays[`${yStr}-12-30`] = "Sem Expediente Bancário (Fim de Ano)";
  } else {
    holidays[`${yStr}-12-31`] = "Sem Expediente Bancário (Fim de Ano)";
  }

  return holidays;
}

/** Cache de feriados por ano para performance */
const holidaysCache: Record<number, Record<string, string>> = {};

function getCachedHolidays(year: number): Record<string, string> {
  if (!holidaysCache[year]) {
    holidaysCache[year] = getNationalHolidays(year);
  }
  return holidaysCache[year];
}

/**
 * Verifica se a data informada cai em final de semana (Sábado ou Domingo).
 * Aceita string "YYYY-MM-DD" ou Date.
 */
export function isWeekend(dateStr: string | Date): boolean {
  let y: number, m: number, d: number;
  if (typeof dateStr === "string") {
    const s = dateStr.slice(0, 10);
    const parts = s.split("-").map(Number);
    y = parts[0] ?? 2000;
    m = parts[1] ?? 1;
    d = parts[2] ?? 1;
  } else {
    y = dateStr.getUTCFullYear();
    m = dateStr.getUTCMonth() + 1;
    d = dateStr.getUTCDate();
  }
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dateObj.getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Domingo, 6 = Sábado
}

/**
 * Retorna informações sobre o feriado de uma data (se houver).
 */
export function getHolidayInfo(dateStr: string): { isHoliday: boolean; name?: string | undefined } {
  const s = dateStr.slice(0, 10);
  const year = Number(s.slice(0, 4));
  if (Number.isNaN(year)) return { isHoliday: false, name: undefined };
  const holidays = getCachedHolidays(year);
  const name = holidays[s];
  return {
    isHoliday: !!name,
    name: name ?? undefined,
  };
}

/**
 * Retorna true se a data for um DIA ÚTIL (Segunda a Sexta e NÃO for feriado nacional).
 */
export function isBusinessDay(dateStr: string): boolean {
  if (!dateStr) return false;
  const s = dateStr.slice(0, 10);
  if (isWeekend(s)) return false;
  const holiday = getHolidayInfo(s);
  return !holiday.isHoliday;
}

/**
 * Conta a quantidade exata de dias úteis entre duas datas (inclusive início e fim).
 * startDate e endDate no formato "YYYY-MM-DD".
 */
export function countBusinessDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const sStr = startDate.slice(0, 10);
  const eStr = endDate.slice(0, 10);
  if (sStr > eStr) return 0;

  const [sy, sm, sd] = sStr.split("-").map(Number);
  const [ey, em, ed] = eStr.split("-").map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return 0;

  const cur = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  let count = 0;
  while (cur <= end) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cur.getUTCDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    if (isBusinessDay(dateStr)) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return count;
}

export interface DayDetail {
  date: string; // "YYYY-MM-DD"
  dayOfMonth: number; // 1 a 31
  dayOfWeek: number; // 0=Dom, 1=Seg, ... 6=Sab
  dayOfWeekName: string; // "Segunda", "Terça", etc.
  dayOfWeekShort: string; // "Seg", "Ter", etc.
  isBusinessDay: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string | undefined;
  isPastOrToday: boolean;
}

const DAY_NAMES = [
  { short: "Dom", full: "Domingo" },
  { short: "Seg", full: "Segunda-feira" },
  { short: "Ter", full: "Terça-feira" },
  { short: "Qua", full: "Quarta-feira" },
  { short: "Qui", full: "Quinta-feira" },
  { short: "Sex", full: "Sexta-feira" },
  { short: "Sáb", full: "Sábado" },
];

/**
 * Retorna todos os dias de um determinado mês com detalhamento de dias úteis, fins de semana e feriados.
 * @param yearMonth formato "YYYY-MM"
 * @param referenceDateISO formato "YYYY-MM-DD" para definir o que já transcorreu (padrão: hoje)
 */
export function getMonthDaysDetail(
  yearMonth: string,
  referenceDateISO: string = new Date().toISOString().slice(0, 10),
): {
  yearMonth: string;
  totalDays: number;
  totalBusinessDays: number;
  elapsedBusinessDays: number;
  remainingBusinessDays: number;
  days: DayDetail[];
} {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) {
    return {
      yearMonth,
      totalDays: 0,
      totalBusinessDays: 0,
      elapsedBusinessDays: 0,
      remainingBusinessDays: 0,
      days: [],
    };
  }

  // Quantidade de dias no mês
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days: DayDetail[] = [];

  let totalBusinessDays = 0;
  let elapsedBusinessDays = 0;

  for (let d = 1; d <= lastDay; d++) {
    const dStr = String(d).padStart(2, "0");
    const mStr = String(month).padStart(2, "0");
    const dateISO = `${year}-${mStr}-${dStr}`;

    const dateObj = new Date(Date.UTC(year, month - 1, d));
    const dow = dateObj.getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const holiday = getHolidayInfo(dateISO);
    const busDay = !weekend && !holiday.isHoliday;
    const isPastOrToday = dateISO <= referenceDateISO;

    if (busDay) {
      totalBusinessDays++;
      if (isPastOrToday) {
        elapsedBusinessDays++;
      }
    }

    days.push({
      date: dateISO,
      dayOfMonth: d,
      dayOfWeek: dow,
      dayOfWeekName: DAY_NAMES[dow]?.full ?? "",
      dayOfWeekShort: DAY_NAMES[dow]?.short ?? "",
      isBusinessDay: busDay,
      isWeekend: weekend,
      isHoliday: holiday.isHoliday,
      holidayName: holiday.name,
      isPastOrToday,
    });
  }

  return {
    yearMonth,
    totalDays: lastDay,
    totalBusinessDays,
    elapsedBusinessDays,
    remainingBusinessDays: Math.max(0, totalBusinessDays - elapsedBusinessDays),
    days,
  };
}
