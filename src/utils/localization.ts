import { Language, TranslationKey } from '../context/LanguageContext';

type Translator = (key: TranslationKey) => string;

export const localeByLanguage: Record<Language, string> = {
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
        friend_request: '{{name}} sent you a friend request',
        friend_accepted: '{{name}} accepted your friend request',
        poll_vote: '{{name}} voted in your poll: {{target}}',
        event_interest: '{{name}} is interested in your event: {{target}}',
        event_rsvp_going: '{{name}} is going to your event: {{target}}',
        event_rsvp_interested: '{{name}} is interested in your event: {{target}}',
        study_answer: 'Someone answered your question: "{{target}}"',
        community_request: '{{name}} requested to join {{target}}.',
        community_approval: 'You have been accepted into {{target}}. You can now see posts and enter the chat.',
        community_decline: 'Your request to join {{target}} was declined by the community admin.',
        post: '{{name}} added a new post: "{{target}}"',
        post_mention: '{{name}} mentioned you in a post: "{{target}}"',
        comment_mention: '{{name}} mentioned you in a comment: "{{target}}"',
        message_mention: '{{name}} mentioned you in a message.',
        community_poll: '{{name}} posted a new poll: "{{target}}"',
        community_event: '{{name}} posted a new event: "{{target}}"',
        community_marketplace_item: '{{name}} posted a new marketplace item: "{{target}}"',
        community_job: '{{name}} posted a new job: "{{target}}"',
        like: '{{name}} liked your post',
        post_like: '{{name}} liked your post',
        comment_like: '{{name}} liked your comment',
        friend_accept: '{{name}} accepted your friend request',
        system: '{{raw}}',
    },
    tr: {
        post_upvote: '{{name}} gönderine oy verdi',
        anonymous_upvote: '{{name}} gönderine oy verdi',
        comment_reply: '{{name}} yorumuna yanıt verdi',
        comment: '{{name}} gönderine yorum yaptı',
        anonymous_comment: '{{name}} gönderine yanıt verdi',
        friend_request: '{{name}} sana arkadaşlık isteği gönderdi',
        friend_accepted: '{{name}} arkadaşlık isteğini kabul etti',
        poll_vote: '{{name}} anketinde oy kullandı: {{target}}',
        event_interest: '{{name}} etkinliğinle ilgileniyor: {{target}}',
        event_rsvp_going: '{{name}} etkinliğine katılıyor: {{target}}',
        event_rsvp_interested: '{{name}} etkinliğinle ilgileniyor: {{target}}',
        study_answer: 'Birisi sorunu yanıtladı: "{{target}}"',
        community_request: '{{name}} {{target}} topluluğuna katılmak istedi.',
        community_approval: '{{target}} topluluğuna kabul edildin. Artık gönderileri görebilir ve sohbete girebilirsin.',
        community_decline: '{{target}} topluluğuna katılma isteğin yönetici tarafından reddedildi.',
        post: '{{name}} yeni bir gönderi paylaştı: "{{target}}"',
        post_mention: '{{name}} bir gönderide senden bahsetti: "{{target}}"',
        comment_mention: '{{name}} bir yorumda senden bahsetti: "{{target}}"',
        message_mention: '{{name}} bir mesajda senden bahsetti.',
        community_poll: '{{name}} yeni bir anket paylaştı: "{{target}}"',
        community_event: '{{name}} yeni bir etkinlik paylaştı: "{{target}}"',
        community_marketplace_item: '{{name}} yeni bir pazar ilanı paylaştı: "{{target}}"',
        community_job: '{{name}} yeni bir iş ilanı paylaştı: "{{target}}"',
        like: '{{name}} gönderini beğendi',
        post_like: '{{name}} gönderini beğendi',
        comment_like: '{{name}} yorumunu beğendi',
        friend_accept: '{{name}} arkadaşlık isteğini kabul etti',
        system: '{{raw}}',
    },
    ka: {
        post_upvote: '{{name}} შენს პოსტს ხმა მისცა',
        anonymous_upvote: '{{name}} შენს პოსტს ხმა მისცა',
        comment_reply: '{{name}} შენს კომენტარს უპასუხა',
        comment: '{{name}} შენს პოსტზე დააკომენტარა',
        anonymous_comment: '{{name}} შენს პოსტს უპასუხა',
        friend_request: '{{name}}-მა მეგობრობის მოთხოვნა გამოგიგზავნა',
        friend_accepted: '{{name}}-მა მეგობრობის მოთხოვნა დაგიდასტურა',
        poll_vote: '{{name}}-მა შენს გამოკითხვაში მისცა ხმა: {{target}}',
        event_interest: '{{name}} დაინტერესებულია შენი ღონისძიებით: {{target}}',
        event_rsvp_going: '{{name}} მოდის შენს ღონისძიებაზე: {{target}}',
        event_rsvp_interested: '{{name}} დაინტერესებულია შენი ღონისძიებით: {{target}}',
        study_answer: 'ვიღაცამ უპასუხა შენს კითხვას: "{{target}}"',
        community_request: '{{name}}-მა მოითხოვა {{target}}-ში გაწევრიანება.',
        community_approval: '{{target}}-ში მიგიღეს. ახლა უკვე შეგიძლია პოსტების ნახვა და ჩატში შესვლა.',
        community_decline: '{{target}}-ში გაწევრიანების მოთხოვნა ადმინისტრატორმა უარყო.',
        post: '{{name}}-მა ახალი პოსტი გააზიარა: "{{target}}"',
        post_mention: '{{name}}-მა პოსტში მოგნიშნა: "{{target}}"',
        comment_mention: '{{name}}-მა კომენტარში მოგნიშნა: "{{target}}"',
        message_mention: '{{name}}-მა შეტყობინებაში მოგნიშნა.',
        community_poll: '{{name}}-მა ახალი გამოკითხვა გააზიარა: "{{target}}"',
        community_event: '{{name}}-მა ახალი ღონისძიება გააზიარა: "{{target}}"',
        community_marketplace_item: '{{name}}-მა ახალი მარკეტის განცხადება გააზიარა: "{{target}}"',
        community_job: '{{name}}-მა ახალი ვაკანსია გააზიარა: "{{target}}"',
        like: '{{name}}-ს მოეწონა შენი პოსტი',
        post_like: '{{name}}-ს მოეწონა შენი პოსტი',
        comment_like: '{{name}}-ს მოეწონა შენი კომენტარი',
        friend_accept: '{{name}}-მა მეგობრობის მოთხოვნა დაგიდასტურა',
        system: '{{raw}}',
    },
};

const notificationTitleTemplates = {
    en: {
        message_from: 'Message from {{name}}',
        new_in: 'New in {{name}}',
        new_upvote: 'New Upvote',
        new_comment: 'New Comment',
        new_reply: 'New Reply',
        new_friend_request: 'New Friend Request',
        friend_request_accepted: 'Friend Request Accepted',
        you_were_mentioned: 'You were mentioned',
        new_poll_vote: 'New Poll Vote',
        new_join_request: 'New Join Request',
        new_homework_answer: 'New Homework Help Answer!',
        new_post_from_friend: 'New Post from Friend',
        new_post: 'New Post',
        new_event: 'New Event',
        new_poll: 'New Poll',
        new_listing: 'New Listing',
        new_job: 'New Job',
        new_question: 'New Question',
        system_notification: 'System Notification',
    },
    tr: {
        message_from: '{{name}} tarafından mesaj',
        new_in: '{{name}} içinde yeni',
        new_upvote: 'Yeni Oy',
        new_comment: 'Yeni Yorum',
        new_reply: 'Yeni Yanıt',
        new_friend_request: 'Yeni Arkadaşlık İsteği',
        friend_request_accepted: 'Arkadaşlık İsteği Kabul Edildi',
        you_were_mentioned: 'Senden bahsedildi',
        new_poll_vote: 'Yeni Anket Oyu',
        new_join_request: 'Yeni Katılma İsteği',
        new_homework_answer: 'Yeni Ödev Yardımı Cevabı!',
        new_post_from_friend: 'Arkadaştan Yeni Gönderi',
        new_post: 'Yeni Gönderi',
        new_event: 'Yeni Etkinlik',
        new_poll: 'Yeni Anket',
        new_listing: 'Yeni İlan',
        new_job: 'Yeni İş İlanı',
        new_question: 'Yeni Soru',
        system_notification: 'Sistem Bildirimi',
    },
    ka: {
        message_from: 'შეტყობინება {{name}}-ისგან',
        new_in: 'ახალი {{name}}-ში',
        new_upvote: 'ახალი ხმა',
        new_comment: 'ახალი კომენტარი',
        new_reply: 'ახალი პასუხი',
        new_friend_request: 'ახალი მეგობრობის მოთხოვნა',
        friend_request_accepted: 'მეგობრობის მოთხოვნა დადასტურდა',
        you_were_mentioned: 'თქვენ მოგნიშნეს',
        new_poll_vote: 'ახალი ხმა გამოკითხვაში',
        new_join_request: 'ახალი მოთხოვნა გაწევრიანებაზე',
        new_homework_answer: 'ახალი პასუხი დავალებაში',
        new_post_from_friend: 'ახალი პოსტი მეგობრისგან',
        new_post: 'ახალი პოსტი',
        new_event: 'ახალი ღონისძიება',
        new_poll: 'ახალი გამოკითხვა',
        new_listing: 'ახალი განცხადება',
        new_job: 'ახალი ვაკანსია',
        new_question: 'ახალი კითხვა',
        system_notification: 'სისტემური შეტყობინება',
    },
};

function trimWrappedTarget(value: string) {
    return value.replace(/^["']|["'.]$/g, '').trim();
}

function replaceTokens(template: string, values: Record<string, string>) {
    return Object.entries(values).reduce((acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value), template);
}

function parseNotificationParts(notification: any) {
    const message = String(notification?.message || '').trim();
    const type = notification?.type;

    if (!message) return { raw: '' };

    const mentionMatch = message.match(/^(.*?) mentioned you in a (post|comment|message)(?::\s*"?(.*?)"?)?\.?$/i);
    if (mentionMatch) {
        return {
            raw: message,
            actor: mentionMatch[1]?.trim(),
            target: trimWrappedTarget(mentionMatch[3] || ''),
            mentionType: mentionMatch[2]?.toLowerCase(),
        };
    }

    const eventRsvpMatch = message.match(/^(.*?) is (going|interested) to your event: (.*)$/i);
    if (eventRsvpMatch) {
        return {
            raw: message,
            actor: eventRsvpMatch[1]?.trim(),
            status: eventRsvpMatch[2]?.toLowerCase(),
            target: trimWrappedTarget(eventRsvpMatch[3] || ''),
        };
    }

    const actorTargetMatch = message.match(/^(.*?) (upvoted your|liked your|liked your comment|replied to your comment|commented on your|replied to your post|sent you a friend request|accepted your friend request|voted in your poll:|is interested in your event:|requested to join|posted a new [^:]+:|added a new post:)\s*(.*)$/i);
    if (actorTargetMatch) {
        return {
            raw: message,
            actor: actorTargetMatch[1]?.trim(),
            target: trimWrappedTarget(actorTargetMatch[3] || ''),
        };
    }

    const studyMatch = message.match(/^Someone answered your question:\s*"?(.*?)"?$/i);
    if (studyMatch) {
        return { raw: message, target: trimWrappedTarget(studyMatch[1] || '') };
    }

    const approvalMatch = message.match(/^You have been accepted into (.*)\. You can now see posts and enter the chat\.$/i);
    if (approvalMatch) {
        return { raw: message, target: trimWrappedTarget(approvalMatch[1] || '') };
    }

    const declineMatch = message.match(/^Your request to join (.*) was declined by the community admin\.$/i);
    if (declineMatch) {
        return { raw: message, target: trimWrappedTarget(declineMatch[1] || '') };
    }

    if (type === 'message' && message === '📷 Sent a photo') {
        return { raw: message, photoOnly: true };
    }

    return { raw: message };
}

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
            return `${level}. Yıl`;
        case 'ka':
            return `${level} კურსი`;
        default:
            return `Year ${level}`;
    }
}

function normalizeDepartmentValue(value: string) {
    return value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const departmentTranslationMap: Record<string, TranslationKey> = {
    math: 'subject_math',
    mathematics: 'subject_math',
    science: 'subject_science',
    english: 'subject_english',
    history: 'subject_history',
    physics: 'subject_physics',
    law: 'subject_law',
    hukuk: 'subject_law',
    სამართალი: 'subject_law',
    cs: 'subject_cs',
    'computer science': 'subject_cs',
    'bilgisayar bilimi': 'subject_cs',
    'კომპიუტერული მეცნიერება': 'subject_cs',
    business: 'subject_business',
    isletme: 'subject_business',
    işletme: 'subject_business',
    ბიზნესი: 'subject_business',
    arts: 'subject_arts',
    art: 'subject_arts',
    sanat: 'subject_arts',
    ხელოვნება: 'subject_arts',
    engineering: 'subject_engineering',
    muhendislik: 'subject_engineering',
    mühendislik: 'subject_engineering',
    ინჟინერია: 'subject_engineering',
    medicine: 'subject_medicine_health',
    'medicine and health': 'subject_medicine_health',
    'medicine health': 'subject_medicine_health',
    'tip ve saglik': 'subject_medicine_health',
    'tıp ve sağlık': 'subject_medicine_health',
    მედიცინა: 'subject_medicine_health',
    'მედიცინა და ჯანმრთელობა': 'subject_medicine_health',
    'social sciences': 'subject_social_sciences',
    'sosyal bilimler': 'subject_social_sciences',
    'სოციალური მეცნიერებები': 'subject_social_sciences',
    'natural sciences': 'subject_natural_sciences',
    'dogal bilimler': 'subject_natural_sciences',
    'doğal bilimler': 'subject_natural_sciences',
    'ბუნების მეცნიერებები': 'subject_natural_sciences',
    economics: 'subject_economics',
    ekonomi: 'subject_economics',
    ეკონომიკა: 'subject_economics',
    architecture: 'subject_architecture',
    mimarlik: 'subject_architecture',
    mimarlık: 'subject_architecture',
    არქიტექტურა: 'subject_architecture',
    other: 'subject_other',
};

export function getDepartmentLabel(value: string | null | undefined, t: Translator) {
    if (!value) return '';

    const normalized = normalizeDepartmentValue(value);
    const key = departmentTranslationMap[normalized];
    return key ? t(key) : value;
}

export function getYearOfStudyLabel(value: string | null | undefined, language: Language, t: Translator) {
    if (!value) return '';

    const normalized = value.trim().toLowerCase();
    if (normalized === 'graduated') return t('profile_graduated');
    if (normalized === '0') return t('profile_not_graduated');

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
        { label: t('profile_graduated'), value: 'graduated' },
        { label: t('profile_not_graduated'), value: '0' },
    ];
}

export function buildLocalizedNotificationMessage(notification: any, language: Language) {
    const type = notification?.type as keyof typeof notificationTemplates.en;
    const template = notificationTemplates[language][type];
    const parts = parseNotificationParts(notification);
    if (!template) {
        if (parts.photoOnly) {
            return language === 'tr' ? '📷 Bir foto gönderdi' : language === 'ka' ? '📷 ფოტო გამოგზავნა' : '📷 Sent a photo';
        }
        return parts.raw || '';
    }

    if (type === 'event_rsvp') {
        const statusKey = parts.status === 'going' ? 'event_rsvp_going' : 'event_rsvp_interested';
        const statusTemplate = notificationTemplates[language][statusKey as keyof typeof notificationTemplates.en];
        if (statusTemplate && parts.actor && parts.target) {
            return replaceTokens(statusTemplate, { name: parts.actor, target: parts.target });
        }
    }

    if (type === 'message_mention' && parts.actor) {
        return replaceTokens(template, { name: parts.actor, target: parts.target || '' });
    }

    if ((type === 'community_approval' || type === 'community_decline' || type === 'study_answer') && parts.target) {
        return replaceTokens(template, { target: parts.target, name: parts.actor || '' });
    }

    if (parts.actor) {
        return replaceTokens(template, { name: parts.actor, target: parts.target || '' });
    }

    if (parts.target) {
        return replaceTokens(template, { target: parts.target, name: '' });
    }

    return parts.raw || '';
}

export function buildLocalizedNotificationTitle(notification: any, language: Language) {
    const title = String(notification?.title || '').trim();
    if (!title) return '';

    if (title.startsWith('Message from ')) {
        const name = title.replace('Message from ', '').trim();
        return replaceTokens(notificationTitleTemplates[language].message_from, { name });
    }

    if (title.startsWith('New in ')) {
        const name = title.replace('New in ', '').trim();
        return replaceTokens(notificationTitleTemplates[language].new_in, { name });
    }

    if (title === 'New Upvote') return notificationTitleTemplates[language].new_upvote;
    if (title === 'New Comment') return notificationTitleTemplates[language].new_comment;
    if (title === 'New Reply') return notificationTitleTemplates[language].new_reply;
    if (title === 'New Friend Request') return notificationTitleTemplates[language].new_friend_request;
    if (title === 'Friend Request Accepted') return notificationTitleTemplates[language].friend_request_accepted;
    if (title === 'You were mentioned') return notificationTitleTemplates[language].you_were_mentioned;
    if (title === 'New Poll Vote') return notificationTitleTemplates[language].new_poll_vote;
    if (title === 'New Join Request') return notificationTitleTemplates[language].new_join_request;
    if (title === 'New Homework Help Answer!') return notificationTitleTemplates[language].new_homework_answer;
    if (title === 'New Post from Friend') return notificationTitleTemplates[language].new_post_from_friend;
    if (title === 'New Post') return notificationTitleTemplates[language].new_post;
    if (title === 'New Event') return notificationTitleTemplates[language].new_event;
    if (title === 'New Poll') return notificationTitleTemplates[language].new_poll;
    if (title === 'New Listing') return notificationTitleTemplates[language].new_listing;
    if (title === 'New Job') return notificationTitleTemplates[language].new_job;
    if (title === 'New Question') return notificationTitleTemplates[language].new_question;
    if (title === 'System Notification' || title === 'System Message' || title === 'System') return notificationTitleTemplates[language].system_notification;

    return title;
}

export function formatTimeAgo(dateLike: string | Date, t: Translator, language: Language, short: boolean = false) {
    const date = new Date(dateLike);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return t('just_now' as any);

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffSecs < 30) return t('just_now' as any);

    if (short) {
        if (diffMins < 60) return `${diffMins}${t('time_m' as any)}`;
        if (diffHrs < 24) return `${diffHrs}${t('time_h' as any)}`;
        if (diffDays < 7) return `${diffDays}${t('time_d' as any)}`;
    } else {
        if (diffMins < 60) return t('minute_ago' as any).replace('{{count}}', String(diffMins));
        if (diffHrs < 24) return t('hour_ago' as any).replace('{{count}}', String(diffHrs));
        if (diffDays === 1) return t('yesterday' as any);
        if (diffDays < 7) return t('day_ago' as any).replace('{{count}}', String(diffDays));
    }

    return formatMonthDay(date, language);
}
export function formatChatDate(dateLike: string | Date, language: Language, t: Translator) {
    const date = new Date(dateLike);
    const now = new Date();
    
    const isToday = date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
        
    if (isToday) return t('today' as any);
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();
        
    if (isYesterday) return t('yesterday' as any);
    
    return formatMonthDay(date, language);
}
