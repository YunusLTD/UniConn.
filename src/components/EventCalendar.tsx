import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import EventCard from './EventCard';

export default function EventCalendar({ events, onDateSelect }: { events: any[], onDateSelect?: (date: Date) => void }) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const daysInMonth = getDaysInMonth(currentMonth.getMonth(), currentMonth.getFullYear());

    const days = [];
    // Padding for first day
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const isSameDay = (d1: Date, d2: Date) => (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );

    const eventsOnSelectedDay = events.filter(e => isSameDay(new Date(e.start_time), selectedDate));

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.monthText}>
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Text>
                <View style={styles.nav}>
                    <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                        <Ionicons name="chevron-back" size={20} color={colors.black} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                        <Ionicons name="chevron-forward" size={20} color={colors.black} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.weekDays}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <Text key={i} style={styles.weekDayText}>{day}</Text>
                ))}
            </View>

            <View style={styles.daysGrid}>
                {days.map((date, i) => {
                    if (!date) return <View key={i} style={styles.dayCell} />;

                    const isSelected = isSameDay(date, selectedDate);
                    const hasEvents = events.some(e => isSameDay(new Date(e.start_time), date));
                    const isToday = isSameDay(date, new Date());

                    return (
                        <TouchableOpacity
                            key={i}
                            style={[styles.dayCell, isSelected && styles.selectedDay]}
                            onPress={() => setSelectedDate(date)}
                        >
                            <Text style={[styles.dayText, isSelected && styles.selectedDayText, isToday && !isSelected && styles.todayText]}>
                                {date.getDate()}
                            </Text>
                            {hasEvents && <View style={[styles.dot, isSelected && styles.selectedDot]} />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.eventsSection}>
                <Text style={styles.eventsTitle}>
                    Events on {selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
                {eventsOnSelectedDay.length > 0 ? (
                    eventsOnSelectedDay.map(e => <EventCard key={e.id} event={e} />)
                ) : (
                    <View style={styles.noEvents}>
                        <Text style={styles.noEventsText}>No events scheduled for this day.</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: spacing.md, backgroundColor: colors.white, borderRadius: radii.lg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingHorizontal: 4 },
    monthText: { fontFamily: fonts.bold, fontSize: 18, color: colors.black },
    nav: { flexDirection: 'row', gap: 12 },
    navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center' },
    weekDays: { flexDirection: 'row', marginBottom: spacing.sm },
    weekDayText: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 12, color: colors.gray400 },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    dayText: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
    todayText: { color: colors.primary, fontFamily: fonts.bold },
    selectedDay: { backgroundColor: colors.black, borderRadius: radii.md },
    selectedDayText: { color: colors.white, fontFamily: fonts.bold },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.black, marginTop: 2 },
    selectedDot: { backgroundColor: colors.white },
    eventsSection: { marginTop: spacing.xl },
    eventsTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.gray500, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
    noEvents: { paddingVertical: 40, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.gray200, borderRadius: radii.md },
    noEventsText: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray400 },
});
