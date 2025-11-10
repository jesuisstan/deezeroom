import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import DateTimePicker, {
  AndroidNativeProps
} from '@react-native-community/datetimepicker';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

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
  const [webDatePicker, setWebDatePicker] =
    useState<React.ComponentType<any> | null>(null);
  const [showNativePicker, setShowNativePicker] = useState<
    'date' | 'time' | null
  >(null);
  const [pendingNativeValue, setPendingNativeValue] = useState<Date>(value);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    let mounted = true;
    (async () => {
      const [{ default: DatePicker }] = await Promise.all([
        import('react-datepicker'),
        import('react-datepicker/dist/react-datepicker.css')
      ]);
      if (mounted) {
        setWebDatePicker(() => DatePicker as React.ComponentType<any>);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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

  const WebDatePicker = webDatePicker;

  return (
    <View style={{ gap: 6 }}>
      <TextCustom type="bold" color={themeColors[theme]['text-secondary']}>
        {label}
      </TextCustom>

      {Platform.OS === 'web' && WebDatePicker ? (
        <WebDatePicker
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
          className="w-full rounded-xl border border-border bg-bg-secondary p-3"
          disabled={disabled}
          onCalendarOpen={() => onOpen?.()}
        />
      ) : (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => openNativePicker('date')}
            style={{
              flex: 1,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: themeColors[theme]['bg-secondary'],
              borderWidth: 1,
              borderColor: themeColors[theme]['border'],
              opacity: disabled ? 0.6 : 1
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
              width: 72,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: themeColors[theme]['bg-secondary'],
              borderWidth: 1,
              borderColor: themeColors[theme]['border'],
              paddingHorizontal: 8,
              opacity: disabled ? 0.6 : 1
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
