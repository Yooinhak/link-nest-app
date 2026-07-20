import React from 'react';

import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { BottomSheetTextInput, useBottomSheetInternal } from '@gorhom/bottom-sheet';

import { colors } from '../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({ label, error, style, ...props }: InputProps) {
  // 바텀시트 안에서는 BottomSheetTextInput 을 써야 keyboardBehavior="interactive"가
  // 동작해 키보드가 올라올 때 시트가 함께 올라간다. 시트 밖에서는 일반 TextInput.
  const isInSheet = useBottomSheetInternal(true) != null;
  const InputComponent = isInSheet ? BottomSheetTextInput : TextInput;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <InputComponent
        style={[styles.input, error ? styles.inputError : undefined, style]}
        placeholderTextColor={colors.textDisabled}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.textSub,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.divider,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'LINESeedKR',
    color: colors.ink,
  },
  inputError: {
    backgroundColor: colors.destructiveLight,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
    marginLeft: 4,
  },
});
