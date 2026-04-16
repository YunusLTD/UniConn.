import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii, spacing } from '../constants/theme';
import { useTheme } from './ThemeContext';
import { useLanguage, Language } from './LanguageContext';

type DialogButton = {
    text?: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
};

type DialogState = {
    visible: boolean;
    title?: string;
    message?: string;
    buttons: DialogButton[];
    inputPlaceholder?: string;
    inputValue?: string;
    requireInput?: boolean;
    onInputChange?: (value: string) => void;
};

type PromptOptions = {
    title: string;
    message?: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    requireInput?: boolean;
};

type DialogContextType = {
    prompt: (options: PromptOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

const legacyTranslations: Record<string, Record<Language, string>> = {
    Cancel: { en: 'Cancel', tr: 'Iptal', ka: 'გაუქმება' },
    Delete: { en: 'Delete', tr: 'Sil', ka: 'წაშლა' },
    Done: { en: 'Done', tr: 'Tamam', ka: 'მზადაა' },
    OK: { en: 'OK', tr: 'Tamam', ka: 'OK' },
    Reported: { en: 'Reported', tr: 'Bildirildi', ka: 'გასაჩივრებულია' },
    'Hide Post': { en: 'Hide Post', tr: 'Gonderiyi Gizle', ka: 'პოსტის დამალვა' },
    'Hide Item': { en: 'Hide Item', tr: 'Ilani Gizle', ka: 'განცხადების დამალვა' },
    'Hide Question': { en: 'Hide Question', tr: 'Soruyu Gizle', ka: 'კითხვის დამალვა' },
    'Permission Needed': { en: 'Permission Needed', tr: 'Izin Gerekli', ka: 'საჭიროა ნებართვა' },
    'Camera access is required to capture moments.': {
        en: 'Camera access is required to capture moments.',
        tr: 'Anlari paylasmak icin kamera izni gerekli.',
        ka: 'მომენტის გასაზიარებლად კამერის ნებართვა საჭიროა.',
    },
    'Upload Failed': { en: 'Upload Failed', tr: 'Yukleme Basarisiz', ka: 'ატვირთვა ვერ მოხერხდა' },
    'Something went wrong. Try again.': {
        en: 'Something went wrong. Try again.',
        tr: 'Bir seyler ters gitti. Tekrar dene.',
        ka: 'რაღაც შეცდა. თავიდან სცადე.',
    },
    'Delete Account': { en: 'Delete Account', tr: 'Hesabı Sil', ka: 'ანგარიშის წაშლა' },
    'Are you absolutely sure? This cannot be undone.': {
        en: 'Are you absolutely sure? This cannot be undone.',
        tr: 'Emin misin? Bu islem geri alinamaz.',
        ka: 'დარწმუნებული ხარ? ეს მოქმედება ვერ დაბრუნდება.',
    },
    'Delete Post': { en: 'Delete Post', tr: 'Gonderiyi Sil', ka: 'პოსტის წაშლა' },
    'Remove this post permanently?': {
        en: 'Remove this post permanently?',
        tr: 'Bu gönderi kalıcı olarak silinsin mi?',
        ka: 'ეს პოსტი სამუდამოდ წაიშალოს?',
    },
    'Delete Item': { en: 'Delete Item', tr: 'Ilani Sil', ka: 'განცხადების წაშლა' },
    'Remove this listing permanently?': {
        en: 'Remove this listing permanently?',
        tr: 'Bu ilan kalici olarak silinsin mi?',
        ka: 'ეს განცხადება სამუდამოდ წაიშალოს?',
    },
    'Delete Question': { en: 'Delete Question', tr: 'Soruyu Sil', ka: 'კითხვის წაშლა' },
    'Remove this question permanently?': {
        en: 'Remove this question permanently?',
        tr: 'Bu soru kalici olarak silinsin mi?',
        ka: 'ეს კითხვა სამუდამოდ წაიშალოს?',
    },
    'Delete Poll': { en: 'Delete Poll', tr: 'Anketi Sil', ka: 'გამოკითხვის წაშლა' },
    'Remove this poll permanently?': {
        en: 'Remove this poll permanently?',
        tr: 'Bu anket kalici olarak silinsin mi?',
        ka: 'ეს გამოკითხვა სამუდამოდ წაიშალოს?',
    },
    'Delete Event': { en: 'Delete Event', tr: 'Etkinligi Sil', ka: 'ღონისძიების წაშლა' },
    'Cancel this event permanently?': {
        en: 'Cancel this event permanently?',
        tr: 'Bu etkinlik kalici olarak iptal edilsin mi?',
        ka: 'ეს ღონისძიება სამუდამოდ გაუქმდეს?',
    },
    'Delete Opportunity': { en: 'Delete Opportunity', tr: 'Ilani Sil', ka: 'შეთავაზების წაშლა' },
    'Remove this listing permanently?.': {
        en: 'Remove this listing permanently?.',
        tr: 'Bu ilan kalici olarak silinsin mi?',
        ka: 'ეს განცხადება სამუდამოდ წაიშალოს?',
    },
    'Failed to delete post.': { en: 'Failed to delete post.', tr: 'Gonderi silinemedi.', ka: 'პოსტის წაშლა ვერ მოხერხდა.' },
    'Failed to delete listing.': { en: 'Failed to delete listing.', tr: 'Ilan silinemedi.', ka: 'განცხადების წაშლა ვერ მოხერხდა.' },
    'Failed to delete question.': { en: 'Failed to delete question.', tr: 'Soru silinemedi.', ka: 'კითხვის წაშლა ვერ მოხერხდა.' },
    'Failed to delete poll.': { en: 'Failed to delete poll.', tr: 'Anket silinemedi.', ka: 'გამოკითხვის წაშლა ვერ მოხერხდა.' },
    'Failed to delete event.': { en: 'Failed to delete event.', tr: 'Etkinlik silinemedi.', ka: 'ღონისძიების წაშლა ვერ მოხერხდა.' },
    Error: { en: 'Error', tr: 'Hata', ka: 'შეცდომა' },
    Success: { en: 'Success', tr: 'Basarili', ka: 'წარმატება' },
    'Link Copied': { en: 'Link Copied', tr: 'Bağlantı Kopyalandı', ka: 'ბმული დაკოპირდა' },
    'The question link has been copied to your clipboard.': {
        en: 'The question link has been copied to your clipboard.',
        tr: 'Soru baglantisi panoya kopyalandi.',
        ka: 'კითხვის ბმული დაკოპირდა.',
    },
    'Camera permission is required': {
        en: 'Camera permission is required',
        tr: 'Kamera izni gerekli',
        ka: 'კამერის ნებართვა საჭიროა',
    },
    'Please select a community.': {
        en: 'Please select a community.',
        tr: 'Lutfen bir topluluk sec.',
        ka: 'გთხოვ აირჩიო თემი.',
    },
    'Please select a community': {
        en: 'Please select a community',
        tr: 'Lutfen bir topluluk sec',
        ka: 'გთხოვ აირჩიო თემი',
    },
    'Please select a community first': {
        en: 'Please select a community first',
        tr: 'Once bir topluluk sec',
        ka: 'ჯერ აირჩიე თემი',
    },
    'Please enter an event title': {
        en: 'Please enter an event title',
        tr: 'Lutfen etkinlik basligi gir',
        ka: 'შეიყვანე ღონისძიების სათაური',
    },
    'Failed to create': {
        en: 'Failed to create',
        tr: 'Olusturulamadi',
        ka: 'შექმნა ვერ მოხერხდა',
    },
    'Failed to submit report. Please try again.': {
        en: 'Failed to submit report. Please try again.',
        tr: 'Bildirim gönderilemedi. Tekrar dene.',
        ka: 'გასაჩივრება ვერ გაიგზავნა. თავიდან სცადე.',
    },
    'Failed to load community details': {
        en: 'Failed to load community details',
        tr: 'Topluluk ayrintilari yuklenemedi',
        ka: 'თემის დეტალები ვერ ჩაიტვირთა',
    },
    'Community name is required': {
        en: 'Community name is required',
        tr: 'Topluluk adi gerekli',
        ka: 'თემის სახელი საჭიროა',
    },
    'Community updated successfully': {
        en: 'Community updated successfully',
        tr: 'Topluluk guncellendi',
        ka: 'თემი განახლდა',
    },
    'Title is required': {
        en: 'Title is required',
        tr: 'Baslik gerekli',
        ka: 'სათაური საჭიროა',
    },
    'Item name is required': {
        en: 'Item name is required',
        tr: 'Urun adi gerekli',
        ka: 'ნივთის სახელი საჭიროა',
    },
    'Poll question is required': {
        en: 'Poll question is required',
        tr: 'Anket sorusu gerekli',
        ka: 'გამოკითხვის კითხვა საჭიროა',
    },
    'At least 2 options required': {
        en: 'At least 2 options required',
        tr: 'En az 2 secenek gerekli',
        ka: 'საჭიროა მინიმუმ 2 ვარიანტი',
    },
    'Price is required for selling': {
        en: 'Price is required for selling',
        tr: 'Satis icin fiyat gerekli',
        ka: 'გასაყიდად ფასი საჭიროა',
    },
    'Price must be a number': {
        en: 'Price must be a number',
        tr: 'Fiyat sayi olmali',
        ka: 'ფასი რიცხვი უნდა იყოს',
    },
    'Item listed successfully!': {
        en: 'Item listed successfully!',
        tr: 'İlan başarıyla paylaşıldı!',
        ka: 'განცხადება წარმატებით დაემატა!',
    },
    'Failed to list item': {
        en: 'Failed to list item',
        tr: 'Ilan yayinlanamadi',
        ka: 'განცხადების დამატება ვერ მოხერხდა',
    },
    'Could not upload image': {
        en: 'Could not upload image',
        tr: 'Gorsel yuklenemedi',
        ka: 'სურათი ვერ აიტვირთა',
    },
    'Event scheduled!': {
        en: 'Event scheduled!',
        tr: 'Etkinlik planlandi!',
        ka: 'ღონისძიება დაიგეგმა!',
    },
    'Failed to schedule event': {
        en: 'Failed to schedule event',
        tr: 'Etkinlik planlanamadi',
        ka: 'ღონისძიების დაგეგმვა ვერ მოხერხდა',
    },
    'Missing fields': {
        en: 'Missing fields',
        tr: 'Eksik alanlar',
        ka: 'აკლია ველები',
    },
    'Please fill in all fields.': {
        en: 'Please fill in all fields.',
        tr: 'Lutfen tum alanlari doldur.',
        ka: 'გთხოვ შეავსო ყველა ველი.',
    },
    'Registration Failed': {
        en: 'Registration Failed',
        tr: 'Kayit Basarisiz',
        ka: 'რეგისტრაცია ვერ შესრულდა',
    },
    'Login Failed': {
        en: 'Login Failed',
        tr: 'Giris Basarisiz',
        ka: 'შესვლა ვერ შესრულდა',
    },
    'Friend request sent successfully!': {
        en: 'Friend request sent successfully!',
        tr: 'Arkadaşlık isteği gönderildi!',
        ka: 'მეგობრობის მოთხოვნა გაიგზავნა!',
    },
    'Failed to send friend request': {
        en: 'Failed to send friend request',
        tr: 'Arkadaşlık isteği gönderilemedi',
        ka: 'მეგობრობის მოთხოვნა ვერ გაიგზავნა',
    },
    'Interested?': {
        en: 'Interested?',
        tr: 'Ilgileniyor musun?',
        ka: 'დაინტერესდი?',
    },
    'We will notify the poster that you are interested in this opportunity.': {
        en: 'We will notify the poster that you are interested in this opportunity.',
        tr: 'Ilgilendigini ilan sahibine bildirecegiz.',
        ka: 'ავტორს ვაცნობებთ, რომ ეს შესაძლებლობა გაინტერესებს.',
    },
    'Express Interest': {
        en: 'Express Interest',
        tr: 'Ilgileniyorum',
        ka: 'დაინტერესების გაგზავნა',
    },
    'Sent!': {
        en: 'Sent!',
        tr: 'Gonderildi!',
        ka: 'გაიგზავნა!',
    },
    'Your profile has been shared.': {
        en: 'Your profile has been shared.',
        tr: 'Profilin paylaşıldı.',
        ka: 'შენი პროფილი გაზიარდა.',
    },
    'Thank you. We will review this post.': {
        en: 'Thank you. We will review this post.',
        tr: 'Teşekkürler. Bu gönderiyi inceleyeceğiz.',
        ka: 'გმადლობ. ამ პოსტს გადავამოწმებთ.',
    },
    'Thank you. We will review this item.': {
        en: 'Thank you. We will review this item.',
        tr: 'Tesekkurler. Bu ilani inceleyecegiz.',
        ka: 'გმადლობ. ამ განცხადებას გადავამოწმებთ.',
    },
    'Thank you. We will review this question.': {
        en: 'Thank you. We will review this question.',
        tr: 'Tesekkurler. Bu soruyu inceleyecegiz.',
        ka: 'გმადლობ. ამ კითხვას გადავამოწმებთ.',
    },
};

function translateLegacyText(language: Language, value?: string) {
    if (!value) return value;
    return legacyTranslations[value]?.[language] || value;
}

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { colors } = useTheme();
    const { language, t } = useLanguage();
    const insets = useSafeAreaInsets();
    const [dialog, setDialog] = useState<DialogState>({ visible: false, buttons: [] });
    const [promptResolver, setPromptResolver] = useState<((value: string | null) => void) | null>(null);
    const scale = useRef(new Animated.Value(0.96)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const originalAlertRef = useRef(Alert.alert);
    const promptValueRef = useRef('');

    useEffect(() => {
        if (dialog.visible) {
            Animated.parallel([
                Animated.spring(scale, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 70,
                    friction: 10,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scale.setValue(0.96);
            opacity.setValue(0);
        }
    }, [dialog.visible, opacity, scale]);

    useEffect(() => {
        const originalAlert = originalAlertRef.current;
        Alert.alert = (title?: string, message?: string, buttons?: DialogButton[]) => {
            const normalizedButtons = (buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }]).map((button) => ({
                ...button,
                text: translateLegacyText(language, button.text || 'OK'),
            }));

            setDialog({
                visible: true,
                title: translateLegacyText(language, title),
                message: translateLegacyText(language, message),
                buttons: normalizedButtons,
            });
        };

        return () => {
            Alert.alert = originalAlert;
        };
    }, [language]);

    const closeDialog = () => {
        setDialog((prev) => ({ ...prev, visible: false }));
    };

    const dismissDialog = () => {
        closeDialog();
        if (promptResolver) {
            promptResolver(null);
            setPromptResolver(null);
        }
    };

    const prompt = useMemo(
        () => (options: PromptOptions) =>
            new Promise<string | null>((resolve) => {
                promptValueRef.current = '';
                setPromptResolver(() => resolve);
                setDialog({
                    visible: true,
                    title: options.title,
                    message: options.message,
                    inputPlaceholder: options.placeholder,
                    inputValue: '',
                    requireInput: options.requireInput ?? false,
                    onInputChange: (value) => {
                        promptValueRef.current = value;
                        setDialog((prev) => ({ ...prev, inputValue: value }));
                    },
                    buttons: [
                        {
                            text: options.cancelText || t('cancel_label'),
                            style: 'cancel',
                            onPress: () => {
                                closeDialog();
                                setPromptResolver(null);
                                resolve(null);
                            },
                        },
                        {
                            text: options.confirmText || t('delete_label'),
                            style: 'destructive',
                            onPress: () => {
                                const finalValue = promptValueRef.current.trim();
                                if (options.requireInput && !finalValue) return;
                                closeDialog();
                                setPromptResolver(null);
                                resolve(finalValue);
                            },
                        },
                    ],
                });
            }),
        [t]
    );

    const handleButtonPress = (button: DialogButton) => {
        if (dialog.inputPlaceholder && promptResolver) {
            button.onPress?.();
            return;
        }

        closeDialog();
        button.onPress?.();
    };

    return (
        <DialogContext.Provider value={{ prompt }}>
            {children}
            <Modal transparent visible={dialog.visible} animationType="none" onRequestClose={dismissDialog}>
                <View style={styles.overlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={dismissDialog} />
                    <Animated.View
                        style={[
                            styles.backdrop,
                            { opacity },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                paddingBottom: Math.max(insets.bottom, spacing.lg),
                                transform: [{ scale }, { translateY: 28 }],
                            },
                        ]}
                    >
                        {!!dialog.title && <Text style={[styles.title, { color: colors.black }]}>{dialog.title}</Text>}
                        {!!dialog.message && <Text style={[styles.message, { color: colors.gray600 }]}>{dialog.message}</Text>}
                        {dialog.inputPlaceholder !== undefined && (
                            <TextInput
                                value={dialog.inputValue}
                                onChangeText={(value) => dialog.onInputChange?.(value)}
                                placeholder={dialog.inputPlaceholder}
                                placeholderTextColor={colors.gray400}
                                autoFocus
                                multiline
                                style={[
                                    styles.input,
                                    {
                                        color: colors.black,
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                    },
                                ]}
                            />
                        )}
                        <View style={styles.buttonRow}>
                            {dialog.buttons.map((button, index) => {
                                const isDestructive = button.style === 'destructive';
                                const isCancel = button.style === 'cancel';
                                const isDisabled = !!dialog.requireInput && !!dialog.inputPlaceholder && !dialog.inputValue?.trim() && isDestructive;

                                return (
                                    <TouchableOpacity
                                        key={`${button.text || 'button'}-${index}`}
                                        onPress={() => handleButtonPress(button)}
                                        disabled={isDisabled}
                                        activeOpacity={0.8}
                                        style={[
                                            styles.button,
                                            {
                                                backgroundColor: isDestructive
                                                    ? 'rgba(239, 68, 68, 0.12)'
                                                    : colors.gray100,
                                                opacity: isDisabled ? 0.45 : 1,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.buttonText,
                                                {
                                                    color: isDestructive
                                                        ? colors.danger
                                                        : isCancel
                                                            ? colors.gray600
                                                            : colors.black,
                                                },
                                            ]}
                                        >
                                            {button.text || t('done_label')}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </DialogContext.Provider>
    );
};

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.28)',
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        gap: spacing.md,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 20,
        textAlign: 'center',
    },
    message: {
        fontFamily: fonts.medium,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    input: {
        minHeight: 96,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontFamily: fonts.regular,
        fontSize: 15,
        textAlignVertical: 'top',
    },
    buttonRow: {
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    button: {
        minHeight: 50,
        borderRadius: radii.full,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
    },
    buttonText: {
        fontFamily: fonts.bold,
        fontSize: 15,
    },
});
