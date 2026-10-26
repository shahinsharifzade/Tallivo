// All user-facing text lives here (Azerbaijani). Keep keys in English.

export const az = {
  app: {
    name: 'Tallivo',
    tagline: 'Hesab bərabər.',
    comingSoon: 'Tezliklə burada ekranlar olacaq.',
    loading: 'Yüklənir…',
    loadError: 'Məlumatları yükləmək alınmadı. Səhifəni yeniləyin.',
    dataCounts: (members: number, meetups: number, expenses: number, settlements: number) =>
      `${members} üzv · ${meetups} görüş · ${expenses} xərc · ${settlements} ödəniş`,
  },
  common: {
    cancel: 'Ləğv et',
    confirm: 'Təsdiqlə',
  },
  backup: {
    title: 'Ehtiyat nüsxə',
    description: 'Məlumatlar yalnız bu brauzerdə saxlanılır. Vaxtaşırı JSON faylı kimi ixrac edin.',
    export: 'JSON ixrac et',
    import: 'JSON idxal et',
    importConfirmTitle: 'Məlumatlar əvəz olunsun?',
    importConfirmBody: (fileName: string) =>
      `«${fileName}» faylı idxal ediləcək və hazırkı BÜTÜN məlumatlar onunla əvəz olunacaq.`,
    importConfirm: 'İdxal et',
    importSuccess: (meetups: number, expenses: number, settlements: number) =>
      `İdxal edildi: ${meetups} görüş, ${expenses} xərc, ${settlements} ödəniş.`,
    exportSuccess: 'Fayl yükləndi.',
    fileNamePrefix: 'tallivo-ehtiyat',
  },
  errors: {
    notFound: 'Qeyd tapılmadı. Səhifəni yeniləyin.',
    storageWrite: 'Yadda saxlamaq alınmadı. Brauzerin yaddaşı dolu və ya bağlı ola bilər.',
    memberInUse: 'Bu üzv xərc və ya ödənişlərdə iştirak edir, ona görə silinə bilməz.',
    invalidMemberName: 'Ad boş, çox uzun və ya təkrar ola bilməz.',
    invalidMeetup: 'Görüşün adı və tarixi düzgün olmalıdır.',
    invalidExpense: 'Xərc düzgün deyil. Məbləği və iştirakçıları yoxlayın.',
    invalidSettlement: 'Ödəniş düzgün deyil. Kimdən, kimə və məbləği yoxlayın.',
    meetupDeleted: 'Bu görüş silinib. Əvvəlcə onu bərpa edin.',
    importInvalid: 'Fayl oxunmadı: düzgün Tallivo ehtiyat nüsxəsi deyil.',
    unknown: 'Gözlənilməz xəta baş verdi.',
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
