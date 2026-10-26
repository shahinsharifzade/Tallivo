// All user-facing text lives here (Azerbaijani). Keep keys in English.

export const az = {
  app: {
    name: 'Tallivo',
    tagline: 'Hesab bərabər.',
    comingSoon: 'Tezliklə burada ekranlar olacaq.',
  },
  debug: {
    title: 'Yoxlama səhifəsi',
    subtitle: 'İstinad ssenarisi yaddaşda yüklənir; heç nə saxlanılmır.',
    check: 'Yoxlama',
    computed: 'Hesablanan',
    expected: 'Gözlənilən',
    status: 'Nəticə',
    ok: 'OK',
    mismatch: 'MISMATCH',
    summaryAllOk: 'Bütün yoxlamalar uğurludur',
    summaryFailed: (n: number) => `${n} yoxlama uğursuzdur`,
    sections: {
      money: 'Pul formatı və daxiletmə',
      split: 'Bərabər bölgü',
      validation: 'Xərclərin yoxlanması',
      overall: 'Ümumi balans',
      coffee: 'Yalnız «Coffee» görüşü',
      settlement: '«Əşrəf Şahinə 10.00 ₼ ödəyir» sonrası',
    },
    rows: {
      balance: (name: string) => `${name} balansı`,
      sumZero: 'Balansların cəmi 0',
      transfersCount: 'Köçürmə sayı ≤ 3',
      transfersSettle: 'Köçürmələrdən sonra hamı 0',
      transfersList: 'Sadələşdirilmiş borclar',
      expenseValid: (title: string) => `«${title}» etibarlıdır`,
    },
  },
} as const;
