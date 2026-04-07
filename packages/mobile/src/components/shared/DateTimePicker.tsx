import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { colors, spacing } from '../../constants/theme';

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  label?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DateTimePicker({ value, onChange, placeholder = 'Selecione a data', label }: DateTimePickerProps) {
  const [visible, setVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const [selectedDate, setSelectedDate] = useState(value);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the starting empty cells for alignment
  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array.from({ length: startDayOfWeek }).map((_, i) => null);
  const allDays = [...emptyDays, ...daysInMonth];

  const handleDateSelect = (day: Date) => {
    setSelectedDate(day);
    onChange(day);
    setVisible(false);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const formattedDate = selectedDate ? format(selectedDate, 'MMMM dd, yyyy', { locale: ptBR }) : placeholder;
  const monthYearDisplay = format(currentMonth, 'MMMM yyyy', { locale: ptBR });

  const renderDayCell = (day: Date | null, index: number) => {
    if (!day) {
      return <View key={`empty-${index}`} style={styles.emptyDayCell} />;
    }

    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const isCurrentMonth = isSameMonth(day, currentMonth);

    return (
      <Pressable
        key={day.toISOString()}
        style={[
          styles.dayCell,
          isSelected && styles.selectedDayCell,
          !isCurrentMonth && styles.otherMonthDayCell,
        ]}
        onPress={() => handleDateSelect(day)}
      >
        <Text
          style={[
            styles.dayCellText,
            isSelected && styles.selectedDayCellText,
            !isCurrentMonth && styles.otherMonthDayCellText,
          ]}
        >
          {day.getDate()}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <Pressable
          style={styles.input}
          onPress={() => setVisible(true)}
        >
          <Text style={[styles.inputText, !selectedDate && styles.placeholderText]}>
            {formattedDate}
          </Text>
          <Ionicons name="calendar" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <Modal
        visible={visible}
        animationType="fade"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setVisible(false)}
        >
          <Pressable
            style={styles.popover}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.popoverHeader}>
              <Pressable onPress={handlePreviousMonth}>
                <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
              </Pressable>
              <Text style={styles.monthYearText}>{monthYearDisplay}</Text>
              <Pressable onPress={handleNextMonth}>
                <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((day) => (
                <Text key={day} style={styles.weekdayText}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {allDays.map((day, index) => renderDayCell(day, index))}
            </View>

            <Pressable
              style={styles.closeButton}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    minHeight: 48,
    backgroundColor: colors.surface,
  },
  inputText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popover: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
  },
  popoverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  emptyDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    marginBottom: spacing.sm,
  },
  selectedDayCell: {
    backgroundColor: colors.textPrimary,
  },
  otherMonthDayCell: {
    opacity: 0.5,
  },
  dayCellText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  selectedDayCellText: {
    color: colors.surface,
    fontWeight: '700',
  },
  otherMonthDayCellText: {
    color: colors.textSecondary,
  },
  closeButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
