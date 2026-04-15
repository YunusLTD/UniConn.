import { Language, TranslationKey } from '../context/LanguageContext';

type Translator = (key: TranslationKey) => string;

const localeByLanguage: Record<Language, string> = {
    en: 'en-US',
    tr: 'tr-TR',
    ka: 'ka-GE',
};

const relationshipLabels: Record<Language, Record<string, string>> = {
    en: {
        private: 'Private',
        single: 'Single',
        'in a relationship': 'In a relationship',
        married: 'Married',
        complicated: 'Complicated',
        'not sure': 'Not sure',
    },
    tr: {
        private: 'Gizli',
        single: 'Bekar',
        'in a relationship': 'Bir ilişkisi var',
        married: 'Evli',
        complicated: 'Karışık',
        'not sure': 'Emin değil',
    },
    ka: {
        private: 'პირადი',
        single: 'მარტოხელა',
        'in a relationship': 'ურთიერთობაში',
        married: 'დაქორწინებული',
        complicated: 'რთულია',
        'not sure': 'დარწმუნებული არ არის',
    },
};

const notificationTemplates = {
    en: {
        post_upvote: '{{name}} upvoted your post',
        anonymous_upvote: '{{name}} upvoted your post',
        comment_reply: '{{name}} replied to your comment',
        comment: '{{name}} commented on your post',
        anonymous_comment: '{{name}} replied to your post',
    },
    tr: {
        post_upvote: '{{name}} gönderine oy verdi',
        anonymous_upvote: '{{name}} gönderine oy verdi',
        comment_reply: '{{name}} yorumuna yanıt verdi',
        comment: '{{name}} gönderine yorum yaptı',
        anonymous_comment: '{{name}} gönderine yanıt verdi',
    },
    ka: {
        post_upvote: '{{name}} შენს პოსტს ხმა მისცა',
        anonymous_upvote: '{{name}} შენს პოსტს ხმა მისცა',
        comment_reply: '{{name}} შენს კომენტარს უპასუხა',
        comment: '{{name}} შენს პოსტზე დააკომენტარა',
        anonymous_comment: '{{name}} შენს პოსტს უპასუხა',
    },
};

export function formatMonthDay(dateLike: string | Date, language: Language) {
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(localeByLanguage[language], {
        month: 'short',
        day: 'numeric',
    }).format(date);
}

export function formatListingDate(dateLike: string | Date, language: Language, t: Translator) {
    const formatted = formatMonthDay(dateLike, language);
    if (!formatted) return '';
    switch (language) {
        case 'tr':
            return `${formatted} tarihinde listelendi`;
        case 'ka':
            return `დაიდო ${formatted}`;
        default:
            return `${t('listed')} ${formatted}`;
    }
}

export function getRelationshipStatusLabel(value: string | null | undefined, language: Language) {
    if (!value) return '';
    const normalized = value.trim().toLowerCase();
    return relationshipLabels[language][normalized] || value;
}

function getYearLabel(level: number, language: Language) {
    switch (language) {
        case 'tr':
            return `${level}. Yil`;
        case 'ka':
            return `${level} კურსი`;
        default:
            return `Year ${level}`;
    }
}

export function getYearOfStudyLabel(value: string | null | undefined, language: Language, t: Translator) {
    if (!value) return '';

    const normalized = value.trim().toLowerCase();
    if (normalized === 'graduated') return t('profile_graduated');
    if (normalized === '0') return t('profile_not_graduated');
    if (normalized === 'vats') return t('profile_vats');

    const numeric = Number(normalized);
    if (Number.isFinite(numeric)) {
        if (numeric > 2000) {
            const inferredLevel = Math.max(1, Math.min(8, numeric - 2023));
            return getYearLabel(inferredLevel, language);
        }
        if (numeric > 0 && numeric < 20) {
            return getYearLabel(numeric, language);
        }
    }

    return value;
}

export function buildYearOptions(language: Language, t: Translator) {
    return [
        { label: getYearLabel(1, language), value: '1' },
        { label: getYearLabel(2, language), value: '2' },
        { label: getYearLabel(3, language), value: '3' },
        { label: getYearLabel(4, language), value: '4' },
        { label: getYearLabel(5, language), value: '5' },
        { label: t('profile_vats'), value: 'vats' },
        { label: t('profile_graduated'), value: 'graduated' },
        { label: t('profile_not_graduated'), value: '0' },
    ];
}

export function buildLocalizedNotificationMessage(notification: any, language: Language) {
    const template = notificationTemplates[language][notification?.type as keyof typeof notificationTemplates.en];
    if (!template || !notification?.message) return notification?.message || '';

    const actorMatch = String(notification.message).match(/^(.*?) (upvoted your|replied to your|commented on your)/i);
    const actorName = actorMatch?.[1]?.trim();
    if (!actorName) return notification.message;

    return template.replace('{{name}}', actorName);
}

