import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import DateTimePicker, {
  AndroidNativeProps
} from '@react-native-community/datetimepicker';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

// Guarded web datepicker import (optional dependency)
let ReactDatePicker: any = null;
if (Platform.OS === 'web') {
  try {
    // @ts-ignore ensure styles present when dependency installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ReactDatePicker = require('react-datepicker').default;
    // @ts-ignore ensure styles present when dependency installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react-datepicker/dist/react-datepicker.css');
  } catch {}
}

// Web-only: custom input for ReactDatePicker that renders TextCustom inside
// to guarantee proper contrast in dark theme.
const DateTimeInputButton = forwardRef<
  HTMLButtonElement,
  {
    value?: string;
    onClick?: () => void;
    placeholder?: string;
    disabled?: boolean;
  }
>(function DateTimeInputButton({ value, onClick, placeholder, disabled }, ref) {
  return (
    // Use a real <button> so the datepicker can focus/anchor it correctly
    <button
      type="button"
      onClick={onClick}
      ref={ref as any}
      disabled={disabled}
      className="w-full rounded-md border border-border bg-bg-secondary p-3 text-left"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <TextCustom className={value ? '' : 'opacity-60'}>
        {value || placeholder || 'Select date and time'}
      </TextCustom>
    </button>
  );
});

interface DateTimePickerFieldProps {
  label: string;
  value: Date;
  onChange: (nextDate: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  timezoneLabel?: string;
  helperText?: string;
  disabled?: boolean;
  onOpen?: () => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  //timeStyle: 'short',
  dateStyle: 'full'
});

const DateTimePickerField: React.FC<DateTimePickerFieldProps> = ({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  timezoneLabel,
  helperText,
  disabled = false,
  onOpen
}) => {
  const { theme } = useTheme();
  const [showNativePicker, setShowNativePicker] = useState<
    'date' | 'time' | null
  >(null);
  const [pendingNativeValue, setPendingNativeValue] = useState<Date>(value);

  useEffect(() => {
    setPendingNativeValue(value);
  }, [value]);

  const formatted = useMemo(() => {
    return DATE_FORMATTER.format(value);
  }, [value]);

  const timezoneText = useMemo(() => {
    if (!timezoneLabel) {
      return '';
    }
    return `Timezone: ${timezoneLabel}`;
  }, [timezoneLabel]);

  const openNativePicker = (mode: 'date' | 'time') => {
    if (disabled) return;
    onOpen?.();
    setPendingNativeValue(value);
    setShowNativePicker(mode);
  };

  const handleNativeChange: AndroidNativeProps['onChange'] = (
    event,
    selectedDate
  ) => {
    if (event.type === 'dismissed') {
      if (showNativePicker === 'date') {
        setShowNativePicker(null);
      } else {
        setShowNativePicker(null);
      }
      return;
    }

    if (!selectedDate) {
      return;
    }

    if (showNativePicker === 'date') {
      const merged = new Date(selectedDate);
      merged.setHours(value.getHours(), value.getMinutes(), 0, 0);
      setPendingNativeValue(merged);
      setShowNativePicker('time');
      return;
    }

    const mergedDate = new Date(pendingNativeValue);
    mergedDate.setHours(
      selectedDate.getHours(),
      selectedDate.getMinutes(),
      0,
      0
    );
    setShowNativePicker(null);

    if (minimumDate && mergedDate < minimumDate) {
      onChange(minimumDate);
      return;
    }

    if (maximumDate && mergedDate > maximumDate) {
      onChange(maximumDate);
      return;
    }

    onChange(mergedDate);
  };

  return (
    <View style={{ gap: 6 }}>
      <TextCustom type="bold" color={themeColors[theme]['text-secondary']}>
        {label}
      </TextCustom>

      {Platform.OS === 'web' && ReactDatePicker ? (
        // @ts-ignore dynamic import style handled in file head
        <ReactDatePicker
          selected={value}
          onChange={(date: Date | null) => {
            if (!date) return;
            if (minimumDate && date < minimumDate) {
              onChange(minimumDate);
              return;
            }
            if (maximumDate && date > maximumDate) {
              onChange(maximumDate);
              return;
            }
            onChange(date);
          }}
          showTimeSelect
          timeIntervals={15}
          dateFormat="Pp"
          minDate={minimumDate}
          maxDate={maximumDate}
          disabled={disabled}
          onCalendarOpen={() => onOpen?.()}
          withPortal
          portalId="react-datepicker-portal"
          popperPlacement="bottom"
          popperClassName="z-50"
          calendarClassName="border border-border"
          customInput={
            <DateTimeInputButton
              placeholder="Select date and time"
              disabled={disabled}
            />
          }
        />
      ) : (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => openNativePicker('date')}
            style={{
              flex: 1,
              borderRadius: 6,
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor: themeColors[theme]['bg-secondary'],
              borderWidth: 1,
              borderColor: themeColors[theme]['border'],
              opacity: disabled ? 0.5 : 1
            }}
            pointerEvents={disabled ? 'none' : 'auto'}
          >
            <TextCustom size="m" color={themeColors[theme]['text-main']}>
              {formatted}
            </TextCustom>
          </Pressable>
          <Pressable
            onPress={() => openNativePicker('time')}
            style={{
              width: 80,
              borderRadius: 6,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: themeColors[theme]['bg-secondary'],
              borderWidth: 1,
              borderColor: themeColors[theme]['border'],
              paddingHorizontal: 8,
              opacity: disabled ? 0.5 : 1
            }}
            pointerEvents={disabled ? 'none' : 'auto'}
          >
            <TextCustom size="s" color={themeColors[theme]['text-main']}>
              {value.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </TextCustom>
          </Pressable>
        </View>
      )}

      {timezoneText ? (
        <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
          {timezoneText}
        </TextCustom>
      ) : null}

      {helperText ? (
        <TextCustom size="xs" color={themeColors[theme]['intent-warning']}>
          {helperText}
        </TextCustom>
      ) : null}

      {Platform.OS !== 'web' && showNativePicker ? (
        <DateTimePicker
          value={pendingNativeValue}
          mode={showNativePicker}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleNativeChange}
        />
      ) : null}
    </View>
  );
};

export default DateTimePickerField;
