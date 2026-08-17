import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const dict = {
  uz: {
    appName: "IshKun",
    tagline: "Kunlik ish — bir tugmada",
    // common
    worker: "Ishchi",
    employer: "Ish beruvchi",
    admin: "Admin",
    save: "Saqlash",
    cancel: "Bekor qilish",
    delete: "O'chirish",
    edit: "Tahrirlash",
    back: "Orqaga",
    loading: "Yuklanmoqda…",
    search: "Qidirish",
    city: "Shahar",
    allCities: "Barcha shaharlar",
    date: "Sana",
    status: "Holati",
    logout: "Chiqish",
    profile: "Profil",
    notifications: "Bildirishnomalar",
    language: "Til",
    markAllRead: "Hammasini o'qilgan deb belgilash",
    noData: "Hozircha hech narsa yo'q",
    confirm: "Tasdiqlash",
    required: "Majburiy maydon",
    today: "Bugun",
    // nav
    nav: { browse: "Ishlar", applications: "Arizalarim", shifts: "Shiftlarim", newShift: "Yangi shift", dashboard: "Boshqaruv", admin: "Admin panel", company: "Kompaniya" },
    // onboarding
    onb: { title: "Rolingizni tanlang", subtitle: "IshKun'ga xush kelibsiz — davom etish uchun rolni tanlang", employerDesc: "Kompaniya yarating va ishchilar uchun shift e'lon qiling", workerDesc: "Mavjud shiftlarga ariza bering va kunlik ish toping", asEmployer: "Ish beruvchi sifatida", asWorker: "Ishchi sifatida", chooseCity: "Shahringizni tanlang", cityHint: "Bu sizga mos shiftlarni filtrlash uchun ishlatiladi" },
    // employer dashboard
    emp: { welcome: "Xush kelibsiz", activeShifts: "Faol shiftlar", totalApps: "Jami arizalar", approved: "Tasdiqlangan", createFirst: "Birinchi shiftingizni e'lon qiling", createFirstHint: "Ishchilarni topish uchun yangi ish e'loni yarating", companyNeeded: "Avval kompaniya profilini yarating", companyNeededHint: "Shift e'lon qilish uchun kompaniya profili kerak", createCompany: "Kompaniya yaratish", recentShifts: "So'nggi shiftlar", noShifts: "Sizda hali shiftlar yo'q" },
    // company
    co: { title: "Kompaniya profili", editTitle: "Kompaniyani tahrirlash", createTitle: "Kompaniya yarating", name: "Kompaniya nomi", industry: "Soha", address: "Manzil", description: "Tavsif", logo: "Logotip URL", saved: "Kompaniya saqlandi" },
    // industries
    ind: { savdo: "Savdo", restoran: "Restoran", logistika: "Logistika", event: "Event" },
    // shifts
    shift: { create: "Yangi shift e'loni", edit: "Shiftni tahrirlash", titleLabel: "Sarlavha", description: "Tavsif", date: "Sana", startTime: "Boshlanish vaqti", endTime: "Tugash vaqti", location: "Joylashuv", payment: "To'lov miqdori (so'm)", workers: "Kerakli ishchilar soni", submit: "E'lon qilish", update: "Yangilash", created: "Shift e'lon qilindi", updated: "Shift yangilandi", open: "Ochiq", filled: "To'lgan", completed: "Yakunlangan", pending_mod: "Moderatsiyada", blocked: "Bloklangan", applicants: "ariza", viewDetails: "Tafsilotlar", markCompleted: "Yakunlandi deb belgilash" },
    // applications
    app: { title: "Arizalar", pending: "Kutilmoqda", approved: "Tasdiqlangan", rejected: "Rad etilgan", completed: "Bajarilgan", approve: "Tasdiqlash", reject: "Rad etish", noApps: "Arizalar yo'q", applicant: "Arizachi", appliedOn: "Ariza sanasi", statusPending: "Kutilmoqda", statusApproved: "Tasdiqlangan", statusRejected: "Rad etilgan", statusCompleted: "Bajarilgan", statusNoShow: "Kelmadi", noShow: "Kelmadi", markDone: "Ish tugadi", markNoShow: "Ishchi kelmadi", approvedMsg: "Ariza tasdiqlandi", rejectedMsg: "Ariza rad etildi" },
    // worker
    wrk: { browseTitle: "Mavjud ishlar", searchPlaceholder: "Ish qidirish…", filterCity: "Shahar bo'yicha", filterDate: "Sana bo'yicha", apply: "Ariza berish", applied: "Ariza yuborildi", already: "Siz allaqachon ariza bergansiz", payment: "To'lov", noShifts: "Bu filtrlarga mos shiftlar topilmadi", details: "Shift tafsilotlari", company: "Kompaniya", backToShifts: "Ishlarga qaytish", requirements: "Talab", perWorker: "ishchi kerak", applyNow: "Hoziroq ariza berish", myAppsTitle: "Arizalarim", trackTitle: "Ariza holatini kuzatish", noMyApps: "Siz hech qanday ariza bermagansiz", viewShift: "Shiftni ko'rish", cancelApp: "Arizani bekor qilish", confirmCancel: "Haqiqatan ham bekor qilmoqchimisiz?", confirmCancelDesc: "Arizangiz bekor qilinadi.", completedJobs: "Tugallangan ishlar", noCompleted: "Tugallangan ishlar yo'q", sectionPending: "Kutilmoqda tasdiqlanishni", sectionApproved: "Qabul qilingansiz", sectionCompleted: "Ishlangan", sectionEmpty: "Bo'sh", tabPending: "Kutilmoqda", tabApproved: "Tasdiqlandi", tabCompleted: "Bajarildi", tabNoShow: "Kelmadi" },
    // profile
    prf: { title: "Profil", fullName: "Ism familiya", phone: "Telefon raqami", role: "Rol", city: "Shahar", image: "Profil rasmi URL", saved: "Profil saqlandi", memberSince: "A'zo bo'lgan sana", changeRole: "Rolni o'zgartirish", changeRoleHint: "Bu saf uchun rol o'zgartirilsa, e'lonlaringiz va arizalaringiz saqlanadi" },
    // notifications
    notif: { title: "Bildirishnomalar", empty: "Bildirishnomalar yo'q", approved: "Arizangiz tasdiqlandi", rejected: "Arizangiz rad etildi", newApp: "Yangi ariza", shiftDone: "Shift yakunlandi", noShow: "Ishchi kelmadi", justNow: "hozir" },
    // admin
    adm: { title: "Admin panel", overview: "Umumiy ko'rinish", allShifts: "Barcha shiftlar", allUsers: "Foydalanuvchilar", totalUsers: "Foydalanuvchilar", totalShifts: "Shiftlar", totalCompanies: "Kompaniyalar", totalApps: "Arizalar", moderate: "Moderatsiya", block: "Blok", unblock: "Blokdan chiqarish", approve_mod: "Tasdiqla", blocked: "Bloklangan", approved: "Tasdiqlangan", pending: "Moderatsiyada", viewShift: "Ko'rish", noShifts: "Shiftlar yo'q", users: "Foydalanuvchilar", shifts: "Shiftlar", role: "Rol", created: "Yaratilgan", open: "Ochiq", filled: "To'lgan", completed: "Yakunlangan", notifications: "Bildirishnomalar", noShowNotif: "Ishchi kelmadi xabarlari", noNotifs: "Bildirishnomalar yo'q" }
  },
  ru: {
    appName: "IshKun",
    tagline: "Подённая работа — одной кнопкой",
    worker: "Работник",
    employer: "Работодатель",
    admin: "Админ",
    save: "Сохранить",
    cancel: "Отмена",
    delete: "Удалить",
    edit: "Редактировать",
    back: "Назад",
    loading: "Загрузка…",
    search: "Поиск",
    city: "Город",
    allCities: "Все города",
    date: "Дата",
    status: "Статус",
    logout: "Выйти",
    profile: "Профиль",
    notifications: "Уведомления",
    language: "Язык",
    markAllRead: "Отметить все прочитанными",
    noData: "Пока ничего нет",
    confirm: "Подтвердить",
    required: "Обязательное поле",
    today: "Сегодня",
    nav: { browse: "Работы", applications: "Мои заявки", shifts: "Мои смены", newShift: "Новая смена", dashboard: "Управление", admin: "Админ-панель", company: "Компания" },
    onb: { title: "Выберите роль", subtitle: "Добро пожаловать в IshKun — выберите роль, чтобы продолжить", employerDesc: "Создайте компанию и публикуйте смены для работников", workerDesc: "Подавайте заявки на смены и находите подённую работу", asEmployer: "Как работодатель", asWorker: "Как работник", chooseCity: "Выберите город", cityHint: "Используется для фильтрации подходящих смен" },
    emp: { welcome: "Добро пожаловать", activeShifts: "Активные смены", totalApps: "Всего заявок", approved: "Подтверждено", createFirst: "Опубликуйте первую смену", createFirstHint: "Создайте объявление о работе, чтобы найти работников", companyNeeded: "Сначала создайте профиль компании", companyNeededHint: "Для публикации смен нужен профиль компании", createCompany: "Создать компанию", recentShifts: "Недавние смены", noShifts: "У вас пока нет смен" },
    co: { title: "Профиль компании", editTitle: "Редактировать компанию", createTitle: "Создать компанию", name: "Название компании", industry: "Сфера", address: "Адрес", description: "Описание", logo: "URL логотипа", saved: "Компания сохранена" },
    ind: { savdo: "Торговля", restoran: "Ресторан", logistika: "Логистика", event: "Ивент" },
    shift: { create: "Новая смена", edit: "Редактировать смену", titleLabel: "Заголовок", description: "Описание", date: "Дата", startTime: "Время начала", endTime: "Время окончания", location: "Место", payment: "Оплата (сум)", workers: "Нужно работников", submit: "Опубликовать", update: "Обновить", created: "Смена опубликована", updated: "Смена обновлена", open: "Открыта", filled: "Заполнена", completed: "Завершена", pending_mod: "На модерации", blocked: "Заблокирована", applicants: "заявок", viewDetails: "Подробности", markCompleted: "Отметить завершённой" },
    app: { title: "Заявки", pending: "Ожидает", approved: "Подтверждена", rejected: "Отклонена", completed: "Выполнена", approve: "Подтвердить", reject: "Отклонить", noApps: "Заявок нет", applicant: "Заявитель", appliedOn: "Дата заявки", statusPending: "Ожидает", statusApproved: "Подтверждена", statusRejected: "Отклонена", statusCompleted: "Выполнена", statusNoShow: "Не пришёл", noShow: "Не пришёл", markDone: "Работа завершена", markNoShow: "Работник не пришёл", approvedMsg: "Заявка подтверждена", rejectedMsg: "Заявка отклонена" },
    wrk: { browseTitle: "Доступные работы", searchPlaceholder: "Поиск работы…", filterCity: "По городу", filterDate: "По дате", apply: "Подать заявку", applied: "Заявка отправлена", already: "Вы уже подали заявку", payment: "Оплата", noShifts: "Смены по фильтрам не найдены", details: "Подробности смены", company: "Компания", backToShifts: "К списку работ", requirements: "Требования", perWorker: "нужно работников", applyNow: "Подать заявку сейчас", myAppsTitle: "Мои заявки", trackTitle: "Отслеживание статуса", noMyApps: "Вы ещё не подавали заявок", viewShift: "Открыть смену", cancelApp: "Отменить заявку", confirmCancel: "Вы действительно хотите отменить?", confirmCancelDesc: "Ваша заявка будет отменена.", completedJobs: "Завершённые работы", noCompleted: "Нет завершённых работ", sectionPending: "Ожидает подтверждения", sectionApproved: "Вы приняты", sectionCompleted: "Выполнено", sectionEmpty: "Пусто", tabPending: "Ожидает", tabApproved: "Подтверждено", tabCompleted: "Выполнено", tabNoShow: "Не пришёл" },
    prf: { title: "Профиль", fullName: "Имя и фамилия", phone: "Телефон", role: "Роль", city: "Город", image: "URL фото профиля", saved: "Профиль сохранён", memberSince: "Дата регистрации", changeRole: "Сменить роль", changeRoleHint: "При смене роли ваши объявления и заявки сохранятся" },
    notif: { title: "Уведомления", empty: "Уведомлений нет", approved: "Ваша заявка подтверждена", rejected: "Ваша заявка отклонена", newApp: "Новая заявка", shiftDone: "Смена завершена", noShow: "Работник не пришёл", justNow: "сейчас" },
    adm: { title: "Админ-панель", overview: "Обзор", allShifts: "Все смены", allUsers: "Пользователи", totalUsers: "Пользователи", totalShifts: "Смены", totalCompanies: "Компании", totalApps: "Заявки", moderate: "Модерация", block: "Блок", unblock: "Разблокировать", approve_mod: "Одобрить", blocked: "Заблокирована", approved: "Одобрена", pending: "На модерации", viewShift: "Открыть", noShifts: "Смен нет", users: "Пользователи", shifts: "Смены", role: "Роль", created: "Создан", open: "Открыта", filled: "Заполнена", completed: "Завершена", notifications: "Уведомления", noShowNotif: "Сообщения о неявке", noNotifs: "Уведомлений нет" }
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('ishkun_lang') || 'uz');

  useEffect(() => {
    localStorage.setItem('ishkun_lang', lang);
  }, [lang]);

  const t = useCallback((path) => {
    const parts = path.split('.');
    let val = dict[lang];
    for (const p of parts) {
      if (val == null) return path;
      val = val[p];
    }
    return val == null ? path : val;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}